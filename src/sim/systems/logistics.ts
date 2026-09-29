import { LOGISTICS } from '../../data/balance';
import type { UnitDef } from '../../data/types';
import { add, dist, rotate } from '../../core/vec';
import { aliveCount, createModel, formationOffset, type Squad } from '../entities';
import type { World } from '../world';

export const reinforceCost = (def: UnitDef): number =>
  Math.round((def.cost.manpower / def.models) * LOGISTICS.reinforceCostMult);

/** Reinforce near the HQ, or at any owned capture point that is still supplied. */
export function canReinforceHere(world: World, sq: Squad): boolean {
  if (sq.def.kind === 'vehicle' || sq.def.kind === 'structure') return false;
  const hq = world.hqOf(sq.team);
  if (hq && !hq.dead && dist(sq.pos, hq.pos) <= LOGISTICS.reinforceHqRadius) return true;
  for (const p of world.points) {
    if (p.owner !== sq.team || !world.territory.isSupplied(sq.team, p.sector)) continue;
    if (dist(sq.pos, p.pos) <= LOGISTICS.reinforcePointRadius) return true;
  }
  return false;
}

/** Which loadout slot a new recruit should fill (e.g. replace the lost bazooka first). */
function missingLoadout(sq: Squad): number {
  const have = sq.loadout.map(() => 0);
  for (const m of sq.models) if (m.alive) have[m.loadoutIndex]++;
  const i = sq.loadout.findIndex((e, idx) => have[idx] < e.count);
  return i < 0 ? sq.loadout.length - 1 : i;
}

export function addRecruit(world: World, sq: Squad): void {
  const n = aliveCount(sq);
  const pos = add(sq.pos, rotate(formationOffset(n, n + 1), sq.heading));
  const m = createModel(world.nextId(), sq.loadout, missingLoadout(sq), sq.def.modelHp, world.map.nearestPassable(pos, 'infantry'));
  m.facing = sq.heading;
  sq.models.push(m);
}

export function updateLogistics(world: World, dt: number): void {
  for (const sq of world.squads) {
    if (sq.dead || sq.def.kind === 'structure') continue;
    const team = world.teams[sq.team];
    const hq = world.hqOf(sq.team);

    const calm = world.time - sq.lastHurt > LOGISTICS.combatCooldown;
    if (calm && hq && !hq.dead && dist(sq.pos, hq.pos) <= LOGISTICS.healRadius) {
      const rate = sq.def.kind === 'vehicle' ? LOGISTICS.repairRate : LOGISTICS.healRate;
      for (const m of sq.models) if (m.alive) m.hp = Math.min(m.maxHp, m.hp + rate * dt);
    }

    if (!sq.reinforcing) continue;
    if (aliveCount(sq) >= sq.def.models || sq.retreating || !canReinforceHere(world, sq)) {
      sq.reinforcing = false;
      continue;
    }
    sq.reinforceTimer -= dt;
    if (sq.reinforceTimer > 0) continue;
    const cost = reinforceCost(sq.def);
    if (team.resources.manpower < cost) {
      sq.reinforcing = false;
      world.emit({ type: 'notify', team: sq.team, text: 'Not enough manpower to reinforce', tone: 'bad' });
      continue;
    }
    team.resources.manpower -= cost;
    addRecruit(world, sq);
    sq.reinforceTimer = LOGISTICS.reinforceTime;
  }
}
