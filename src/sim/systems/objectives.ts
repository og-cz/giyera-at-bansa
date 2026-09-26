import { TILE } from '../../data/balance';
import type { DefenseRules, Difficulty, GameMode, OffensiveRules, ScenarioDef, TeamId } from '../../data/types';
import { UNITS } from '../../data/units';
import { add, angleTo, dist, normalize, scale, sub, type Vec2 } from '../../core/vec';
import { issueAttackMove } from '../commands';
import type { World } from '../world';
import { updateVictory } from './victory';

/** Scenarios are authored with the player as team 0 and the enemy as team 1. */
const PLAYER: TeamId = 0;
const ENEMY: TeamId = 1;

export interface ObjectiveState {
  mode: GameMode;
  // Defense
  wave: number;
  totalWaves: number;
  nextWaveIn: number;
  waveSquads: number[];
  orderTimer: number;
  // Offensive
  sector: number;
  totalSectors: number;
  timeLeft: number;
  counterIn: number;
}

export function createObjective(s: ScenarioDef | null): ObjectiveState {
  return {
    mode: s?.mode ?? 'skirmish',
    wave: 0,
    totalWaves: s?.defense?.waves.length ?? 0,
    nextWaveIn: s?.defense?.prepTime ?? 0,
    waveSquads: [],
    orderTimer: 0,
    sector: 0,
    totalSectors: s?.offensive?.sectors.length ?? 0,
    timeLeft: s?.offensive?.timeLimit ?? 0,
    counterIn: s?.offensive?.counterattackEvery ?? 0,
  };
}

export function updateObjectives(world: World, dt: number): void {
  const s = world.scenario;
  if (!s || s.mode === 'skirmish') {
    updateVictory(world, dt);
    return;
  }
  if (!alive(world, world.teams[PLAYER].hqId)) return end(world, ENEMY, 'Your headquarters has fallen');
  if (!alive(world, world.teams[ENEMY].hqId)) return end(world, PLAYER, 'Enemy headquarters destroyed');
  if (s.defense) updateDefense(world, s.defense, dt);
  else if (s.offensive) updateOffensive(world, s.offensive, dt);
}

function alive(world: World, id: number): boolean {
  const sq = world.get(id);
  return !!sq && !sq.dead;
}

function end(world: World, winner: TeamId, reason: string): void {
  if (world.winner !== -1) return;
  world.winner = winner;
  world.endReason = reason;
  world.emit({ type: 'notify', team: -1, text: reason, tone: winner === PLAYER ? 'good' : 'bad' });
}

/** Easy waves drop a rifle squad, hard waves add one. */
export function scaleWave(units: readonly string[], difficulty: Difficulty, rifle: string): string[] {
  const out = [...units];
  if (difficulty === 'easy' && out.length > 2) {
    const i = out.indexOf(rifle);
    if (i >= 0) out.splice(i, 1);
  }
  if (difficulty === 'hard') out.push(rifle);
  return out;
}

function tileToWorld(p: { x: number; y: number }): Vec2 {
  return { x: p.x * TILE, y: p.y * TILE };
}

/** Spawns a group of enemy units around a point and sends them at a target. */
function spawnGroup(world: World, units: readonly string[], origins: Vec2[], target: Vec2): number[] {
  const ids: number[] = [];
  units.forEach((unitId, i) => {
    const def = UNITS[unitId];
    const origin = origins[i % origins.length];
    const spread = (Math.floor(i / origins.length) - 1) * 28;
    const side = normalize({ x: -(target.y - origin.y), y: target.x - origin.x });
    const mover = def.vehicle ? 'vehicle' : 'infantry';
    const pos = world.map.nearestPassable(add(origin, scale(side, spread)), mover);
    const sq = world.spawn(ENEMY, unitId, pos, angleTo(pos, target));
    issueAttackMove(world, sq, world.map.nearestPassable(target, mover));
    ids.push(sq.id);
  });
  return ids;
}

function updateDefense(world: World, d: DefenseRules, dt: number): void {
  const o = world.objective;
  const holdPoints = d.hold.map((i) => world.points[i]);

  o.nextWaveIn -= dt;
  if (o.wave < o.totalWaves && o.nextWaveIn <= 0) {
    const rifle = world.teams[ENEMY].faction.roster.find((id) => UNITS[id].role === 'line') ?? '';
    const units = scaleWave(d.waves[o.wave].units, world.difficulty, rifle);
    const target = holdPoints[o.wave % holdPoints.length].pos;
    o.waveSquads.push(...spawnGroup(world, units, d.spawns.map(tileToWorld), target));
    o.wave++;
    o.nextWaveIn = o.wave < o.totalWaves ? d.waves[o.wave].delay : Infinity;
    world.emit({ type: 'notify', team: PLAYER, text: `Wave ${o.wave} of ${o.totalWaves} incoming`, tone: 'bad' });
  }
  o.waveSquads = o.waveSquads.filter((id) => alive(world, id));

  // Attackers never give up: idle wave units are sent back at the objective.
  o.orderTimer -= dt;
  if (o.orderTimer <= 0) {
    o.orderTimer = 1.5;
    for (const id of o.waveSquads) {
      const sq = world.get(id)!;
      if (sq.order.kind !== 'idle' || (sq.def.kind === 'team' && sq.setup !== 'packed')) continue;
      const target = holdPoints.reduce((a, b) => (dist(sq.pos, a.pos) <= dist(sq.pos, b.pos) ? a : b));
      if (dist(sq.pos, target.pos) > 40) issueAttackMove(world, sq, world.map.nearestPassable(target.pos, sq.def.vehicle ? 'vehicle' : 'infantry'));
    }
  }

  const lost = holdPoints.find((p) => p.owner === ENEMY);
  if (lost) return end(world, ENEMY, `${lost.name} has fallen`);
  if (o.wave >= o.totalWaves && o.waveSquads.length === 0) end(world, PLAYER, 'Every wave has been repelled');
}

function updateOffensive(world: World, off: OffensiveRules, dt: number): void {
  const o = world.objective;
  o.timeLeft -= dt;

  const current = world.points[off.sectors[o.sector]];
  if (current && current.owner === PLAYER) {
    current.locked = true;
    o.sector++;
    o.timeLeft += off.bonusTime;
    // The front moves forward: reinforcements now arrive at the captured sector.
    const team = world.teams[PLAYER];
    const back = normalize(sub(team.base, current.pos));
    team.spawn = world.map.nearestPassable(add(current.pos, scale(back, TILE * 4)), 'vehicle');
    team.retreatPoint = world.map.nearestPassable(add(current.pos, scale(back, TILE * 3)), 'infantry');
    const next = world.points[off.sectors[o.sector]];
    if (!next) return end(world, PLAYER, 'All sectors secured');
    next.locked = false;
    world.emit({ type: 'notify', team: PLAYER, text: `${current.name} secured · next objective: ${next.name}`, tone: 'good' });
  }

  if (o.sector > 0 && off.counterattackEvery > 0) {
    o.counterIn -= dt;
    if (o.counterIn <= 0) {
      o.counterIn = off.counterattackEvery;
      const target = world.points[off.sectors[o.sector - 1]].pos;
      spawnGroup(world, off.counterattack, [world.teams[ENEMY].spawn], target);
      world.emit({ type: 'notify', team: PLAYER, text: 'Enemy counterattack!', tone: 'bad' });
    }
  }

  if (o.timeLeft <= 0) end(world, ENEMY, 'Out of time — the advance has stalled');
}
