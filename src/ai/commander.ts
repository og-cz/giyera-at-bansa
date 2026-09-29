import { ABILITIES } from '../data/abilities';
import { LOGISTICS } from '../data/balance';
import type { TeamId, UnitRole } from '../data/types';
import { UNITS } from '../data/units';
import { UPGRADES } from '../data/upgrades';
import { WEAPONS } from '../data/weapons';
import { dist, lerpVec, type Vec2 } from '../core/vec';
import {
  issueAbility,
  issueAttackMove,
  issueReinforce,
  issueRepair,
  issueRetreat,
  issueSetup,
  issueUpgrade,
  queueProduction,
} from '../sim/commands';
import { aliveCount, healthFraction, isSoft, type CapturePoint, type Squad } from '../sim/entities';
import { coverAt } from '../sim/systems/cover';
import { canAfford } from '../sim/systems/economy';
import { canReinforceHere, reinforceCost } from '../sim/systems/logistics';
import type { World } from '../sim/world';

/**
 * Skirmish opponent. It only knows what its own units can see and it issues
 * orders through the same command API as the player.
 */
export class AICommander {
  private timer = 0;
  private readonly objective = new Map<number, number>();
  private readonly seenVehicles = new Set<number>();

  constructor(readonly team: TeamId) {}

  update(world: World, dt: number): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.8;
    const own = world.squads.filter((s) => s.team === this.team && !s.dead && s.def.kind !== 'structure');
    this.scout(world);
    this.produce(world, own);
    for (const sq of own) this.control(world, sq, own);
    for (const id of this.objective.keys()) if (!world.get(id)) this.objective.delete(id);
  }

  private enemies(world: World): Squad[] {
    return world.squads.filter((s) => !s.dead && s.team !== this.team && world.canSee(this.team, s));
  }

  private scout(world: World): void {
    for (const e of this.enemies(world)) if (e.def.kind === 'vehicle') this.seenVehicles.add(e.id);
    for (const id of this.seenVehicles) if (!world.get(id)) this.seenVehicles.delete(id);
  }

  private produce(world: World, own: Squad[]): void {
    const hq = world.hqOf(this.team);
    if (!hq || hq.production.length > 0) return;
    const t = world.teams[this.team];
    const counts: Record<UnitRole, number> = { hq: 0, line: 0, mg: 0, mortar: 0, at: 0, tank: 0, engineer: 0 };
    for (const sq of own) counts[sq.def.role]++;
    const unitFor = (role: UnitRole) => t.faction.roster.find((id) => UNITS[id].role === role);
    const threats = this.seenVehicles.size;

    const plan: [boolean, UnitRole, boolean][] = [
      // [condition, role, skip if unaffordable]
      [counts.line < 2, 'line', false],
      [threats > 0 && counts.at < Math.min(3, threats + 1), 'at', false],
      [counts.mg < 1, 'mg', false],
      [counts.tank < 1, 'tank', true],
      [counts.line < 4, 'line', false],
      [counts.mortar < 1, 'mortar', false],
      [counts.engineer < 1 && counts.tank > 0, 'engineer', false],
      [counts.tank < 2, 'tank', true],
      [counts.at < 1, 'at', false],
      [counts.line < 6, 'line', false],
    ];
    for (const [want, role, optional] of plan) {
      if (!want) continue;
      const id = unitFor(role);
      if (!id) continue;
      if (!canAfford(t.resources, UNITS[id].cost)) {
        if (optional) continue;
        return;
      }
      queueProduction(world, this.team, id);
      return;
    }
  }

  private control(world: World, sq: Squad, own: Squad[]): void {
    if (sq.retreating) return;
    const hq = world.hqOf(this.team);
    const atBase = !!hq && dist(sq.pos, hq.pos) < LOGISTICS.healRadius;

    if (!atBase && this.shouldRetreat(sq)) {
      issueRetreat(world, sq);
      this.objective.delete(sq.id);
      return;
    }
    if (sq.reinforcing) return;
    const t = world.teams[this.team];
    if (
      isSoft(sq) &&
      aliveCount(sq) < sq.def.models &&
      canReinforceHere(world, sq) &&
      t.resources.manpower > reinforceCost(sq.def) + 60 &&
      world.time - sq.lastHurt > 3
    ) {
      if (issueReinforce(world, sq).ok) return;
    }
    this.upgrade(world, sq);
    if (atBase && healthFraction(sq) < 0.8 && sq.order.kind === 'idle' && world.time - sq.lastHurt > 5) return;

    if (sq.def.canRepair && this.repair(world, sq, own)) return;
    this.useAbilities(world, sq);
    if (sq.order.kind === 'ability') return;

    if (sq.order.kind === 'idle' && sq.def.kind === 'team' && sq.setup === 'packed' && this.objective.has(sq.id)) {
      const enemyHq = world.hqOf(this.team === 0 ? 1 : 0);
      if (enemyHq) issueSetup(world, sq, enemyHq.pos);
      return;
    }
    if (sq.order.kind !== 'idle' && !this.stale(world, sq)) return;
    if (sq.def.kind === 'team' && sq.setup !== 'packed' && sq.order.kind === 'idle') {
      if (!this.stale(world, sq)) return;
    }
    this.assignObjective(world, sq, own);
  }

  /** Buy a weapon upgrade when supplied and munitions allow: anti-tank once enemy armour has been seen, otherwise more firepower. */
  private upgrade(world: World, sq: Squad): void {
    if (sq.def.upgrades.length === 0 || sq.upgrades.length > 0 || sq.upgrading || !canReinforceHere(world, sq)) return;
    const antiTank = (id: string) => UPGRADES[id].weapons.some((w) => WEAPONS[w].prefers === 'vehicle');
    const wantAt = this.seenVehicles.size > 0;
    const id = sq.def.upgrades.find((u) => antiTank(u) === wantAt) ?? sq.def.upgrades[0];
    // Keep some munitions back for grenades and barrages.
    if (world.teams[this.team].resources.munitions < UPGRADES[id].cost.munitions + 25) return;
    issueUpgrade(world, sq, id);
  }

  /** Engineers keep the armour and the HQ running: repair the most damaged one that is not under fire. */
  private repair(world: World, sq: Squad, own: Squad[]): boolean {
    if (sq.order.kind === 'repair') return true;
    const hq = world.hqOf(this.team);
    const candidates = [...own.filter((s) => s.def.kind === 'vehicle'), ...(hq ? [hq] : [])].filter((s) => {
      const hull = s.models.find((m) => m.alive);
      return hull && hull.hp < hull.maxHp * 0.75 && world.time - s.lastHurt > 5 && dist(s.pos, sq.pos) < 900;
    });
    if (candidates.length === 0) return false;
    candidates.sort((a, b) => healthFraction(a) - healthFraction(b));
    return issueRepair(world, sq, candidates[0]).ok;
  }

  private shouldRetreat(sq: Squad): boolean {
    const hp = healthFraction(sq);
    if (sq.def.kind === 'vehicle') return hp < 0.3;
    const frac = aliveCount(sq) / sq.def.models;
    if (sq.def.kind === 'team') return frac < 0.5 || hp < 0.3;
    return frac <= 0.4 || hp < 0.3 || (sq.suppState === 'pinned' && hp < 0.55);
  }

  /** An objective is stale when the point is safely ours and there is nothing to fight. */
  private stale(world: World, sq: Squad): boolean {
    const idx = this.objective.get(sq.id);
    if (idx === undefined || idx < 0) return idx === undefined;
    const p = world.points[idx];
    if (p.owner !== this.team) return false;
    if (sq.def.kind === 'team') return false;
    return !this.threatened(world, p) && dist(sq.pos, p.pos) < 80;
  }

  private threatened(world: World, p: CapturePoint): boolean {
    if (p.contested) return true;
    return this.enemies(world).some((e) => dist(e.pos, p.pos) < 260);
  }

  private assignObjective(world: World, sq: Squad, own: Squad[]): void {
    const enemyTeam: TeamId = this.team === 0 ? 1 : 0;
    const ownedCount = world.points.filter((p) => p.owner === this.team).length;
    const armyPop = own.reduce((s, u) => s + u.def.pop, 0);
    const enemyHq = world.hqOf(enemyTeam);

    if (enemyHq && ownedCount >= world.points.length - 1 && armyPop >= 30 && sq.def.kind !== 'team') {
      this.objective.set(sq.id, -1);
      issueAttackMove(world, sq, enemyHq.pos);
      return;
    }

    let best = -1;
    let bestScore = -Infinity;
    const lowFuel = world.teams[this.team].resources.fuel < 40;
    for (const p of world.points) {
      let score: number;
      if (p.owner === this.team) score = this.threatened(world, p) ? 2.2 : sq.def.kind === 'team' ? 1.2 : 0.2;
      else if (p.owner === -1) score = 2;
      else score = 1.6;
      if (p.kind === 'victory') score += 0.5;
      if (p.kind === 'fuel' && lowFuel) score += 0.3;
      if (sq.def.kind === 'vehicle' && p.owner !== this.team) score += 0.3;
      score -= dist(sq.pos, p.pos) / 700;
      let assigned = 0;
      for (const [id, idx] of this.objective) if (idx === p.index && id !== sq.id) assigned++;
      score -= assigned * 0.6;
      score += (world.rng.next() - 0.5) * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = p.index;
      }
    }
    if (best < 0) return;
    this.objective.set(sq.id, best);
    let dest: Vec2 = world.points[best].pos;
    // Support weapons hang back behind the point, towards home.
    if (sq.def.kind === 'team') dest = lerpVec(dest, world.teams[this.team].base, sq.def.role === 'mortar' ? 0.25 : 0.1);
    issueAttackMove(world, sq, world.map.nearestPassable(dest, sq.def.vehicle ? 'vehicle' : 'infantry'));
  }

  private useAbilities(world: World, sq: Squad): void {
    const res = world.teams[this.team].resources;
    for (const id of sq.def.abilities) {
      const ab = ABILITIES[id];
      if ((sq.cooldowns[id] ?? 0) > 0 || !canAfford(res, ab.cost) || res.munitions < ab.cost.munitions + 10) continue;
      const range = ab.range * (ab.requiresSetup ? 1 : 0.95);
      const target = this.enemies(world).find((e) => {
        if (!isSoft(e) || dist(e.pos, sq.pos) > range) return false;
        if (e.def.kind === 'team' && e.setup === 'deployed') return true;
        if (ab.requiresSetup) return aliveCount(e) >= 3 && e.order.kind === 'idle';
        const cover = coverAt(world.map, e.pos, sq.pos);
        return (cover === 'heavy' || cover === 'light') && aliveCount(e) >= 3;
      });
      if (target && issueAbility(world, sq, id, target.pos).ok) return;
    }
  }
}
