import { ABILITIES } from '../data/abilities';
import { BUILDABLES } from '../data/buildables';
import { ECONOMY, LOGISTICS } from '../data/balance';
import type { TeamId } from '../data/types';
import { UNITS } from '../data/units';
import { angleTo, type Vec2 } from '../core/vec';
import { aliveCount, type Squad } from './entities';
import { resetMovement, setOrder } from './orders';
import { canAfford, pay, popUsed, refund } from './systems/economy';
import { planBuild } from './systems/engineering';
import { canReinforceHere, reinforceCost } from './systems/logistics';
import { startSetup, startTeardown } from './systems/setup';
import type { World } from './world';

/**
 * The only way to change what units do. The player's input and the AI both go
 * through here, so the AI obeys exactly the same rules as the player.
 */
export interface CommandResult {
  ok: boolean;
  reason?: string;
}

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** Retreating squads ignore every order until they reach headquarters. */
const RETREATING = fail('Retreating: orders resume at headquarters');

function commandable(sq: Squad): boolean {
  return !sq.dead && sq.def.kind !== 'structure';
}

/** Move to `dest`; with `facing`, face that way on arrival (weapon teams also set up). */
export function issueMove(world: World, sq: Squad, dest: Vec2, queue = false, facing?: number): CommandResult {
  if (sq.dead) return fail('Unit is dead');
  if (sq.def.kind === 'structure') {
    sq.rally = { ...dest };
    return OK;
  }
  if (sq.retreating) return RETREATING;
  sq.channel = null;
  setOrder(sq, { kind: 'move', dest: clampToMap(world, dest), facing }, queue);
  return OK;
}

export function issueAttackMove(world: World, sq: Squad, dest: Vec2, queue = false): CommandResult {
  if (!commandable(sq)) return fail('Cannot move');
  if (sq.retreating) return RETREATING;
  sq.channel = null;
  setOrder(sq, { kind: 'attackMove', dest: clampToMap(world, dest) }, queue);
  return OK;
}

export function issueAttack(_world: World, sq: Squad, target: Squad): CommandResult {
  if (sq.dead || target.dead || target.team === sq.team) return fail('Invalid target');
  if (sq.def.kind === 'structure') return fail('Structures fire automatically');
  if (sq.retreating) return RETREATING;
  sq.channel = null;
  setOrder(sq, { kind: 'attack', targetId: target.id });
  sq.targetId = target.id;
  if (sq.def.kind === 'team' && sq.setup === 'deployed') sq.setupFacing = angleTo(sq.pos, target.pos);
  return OK;
}

export function issueStop(_world: World, sq: Squad): CommandResult {
  if (!commandable(sq)) return fail('Cannot stop');
  if (sq.retreating) return RETREATING;
  sq.channel = null;
  sq.queue.length = 0;
  sq.order = { kind: 'idle' };
  resetMovement(sq);
  return OK;
}

export function issueRetreat(world: World, sq: Squad): CommandResult {
  if (!commandable(sq)) return fail('Cannot retreat');
  const team = world.teams[sq.team];
  sq.retreating = true;
  sq.channel = null;
  sq.reinforcing = false;
  sq.targetId = null;
  sq.queue.length = 0;
  sq.order = { kind: 'retreat', dest: { ...team.retreatPoint } };
  resetMovement(sq);
  startTeardown(sq);
  return OK;
}

export function issueReinforce(world: World, sq: Squad): CommandResult {
  if (!commandable(sq) || sq.def.kind === 'vehicle') return fail('Cannot reinforce vehicles');
  if (aliveCount(sq) >= sq.def.models) return fail('Squad is at full strength');
  if (sq.retreating) return RETREATING;
  if (!canReinforceHere(world, sq)) return fail('Must be near HQ or a supplied friendly point');
  if (world.teams[sq.team].resources.manpower < reinforceCost(sq.def)) return fail('Not enough manpower');
  sq.reinforcing = true;
  sq.reinforceTimer = LOGISTICS.reinforceTime;
  return OK;
}

/** Toggle set up / tear down for crew weapons, facing `toward` if given. */
export function issueSetup(_world: World, sq: Squad, toward?: Vec2): CommandResult {
  if (!commandable(sq) || sq.def.kind !== 'team') return fail('Only weapon teams set up');
  if (sq.retreating) return RETREATING;
  if (sq.setup === 'deployed' || sq.setup === 'settingUp') {
    startTeardown(sq);
    return OK;
  }
  if (sq.setup === 'tearingDown') return fail('Tearing down');
  sq.queue.length = 0;
  sq.order = { kind: 'idle' };
  resetMovement(sq);
  startSetup(sq, toward ? angleTo(sq.pos, toward) : sq.heading);
  return OK;
}

export function issueAbility(world: World, sq: Squad, abilityId: string, target: Vec2): CommandResult {
  const ab = ABILITIES[abilityId];
  if (!commandable(sq) || !ab || !sq.def.abilities.includes(abilityId)) return fail('Ability unavailable');
  if (sq.retreating) return RETREATING;
  if (sq.suppState === 'pinned') return fail('Squad is pinned');
  if ((sq.cooldowns[abilityId] ?? 0) > 0) return fail(`${ab.name} is recharging`);
  if (!canAfford(world.teams[sq.team].resources, ab.cost)) return fail('Not enough munitions');
  sq.channel = null;
  setOrder(sq, { kind: 'ability', abilityId, dest: clampToMap(world, target) });
  return OK;
}

/** Engineers: build a line of defenses (or one mine) from `from` to `to`. Cost is paid up front. */
export function issueBuild(world: World, sq: Squad, buildId: string, from: Vec2, to: Vec2): CommandResult {
  const def = BUILDABLES[buildId];
  if (!commandable(sq) || !def || !sq.def.builds.includes(buildId)) return fail('Only engineers can build that');
  if (sq.retreating) return RETREATING;
  const plan = planBuild(world, buildId, from, to);
  const tiles = plan.tiles.filter((t) => t.valid);
  if (tiles.length === 0) return fail('Cannot build there');
  if (!canAfford(world.teams[sq.team].resources, plan.cost)) {
    return fail(plan.cost.munitions > world.teams[sq.team].resources.munitions ? 'Not enough munitions' : 'Not enough manpower');
  }
  pay(world.teams[sq.team].resources, plan.cost);
  const construction = {
    id: world.nextId(),
    team: sq.team,
    buildId,
    ownerId: sq.id,
    tiles: tiles.map((t) => ({ tx: t.tx, ty: t.ty, progress: 0, done: false })),
  };
  world.constructions.push(construction);
  sq.channel = null;
  setOrder(sq, { kind: 'build', targetId: construction.id });
  return OK;
}

/** Engineers: repair a friendly vehicle or structure. */
export function issueRepair(_world: World, sq: Squad, target: Squad): CommandResult {
  if (!commandable(sq) || !sq.def.canRepair) return fail('Only engineers can repair');
  if (sq.retreating) return RETREATING;
  if (target.team !== sq.team || target.dead || !target.def.armor) return fail('Nothing to repair');
  const hull = target.models.find((m) => m.alive);
  if (!hull || hull.hp >= hull.maxHp) return fail('Already at full strength');
  sq.channel = null;
  setOrder(sq, { kind: 'repair', targetId: target.id });
  return OK;
}

export function queueProduction(world: World, team: TeamId, unitId: string): CommandResult {
  const t = world.teams[team];
  const hq = world.hqOf(team);
  const def = UNITS[unitId];
  if (!hq || hq.dead) return fail('Headquarters destroyed');
  if (!def || !t.faction.roster.includes(unitId)) return fail('Not in roster');
  if (hq.production.length >= ECONOMY.maxQueue) return fail('Production queue full');
  if (popUsed(world, team) + def.pop > ECONOMY.popCap) return fail('Population cap reached');
  if (!canAfford(t.resources, def.cost)) {
    const need = def.cost.fuel > t.resources.fuel ? 'fuel' : def.cost.munitions > t.resources.munitions ? 'munitions' : 'manpower';
    return fail(`Not enough ${need}`);
  }
  pay(t.resources, def.cost);
  hq.production.push({ unitId, remaining: def.buildTime });
  return OK;
}

export function cancelProduction(world: World, team: TeamId, index: number): CommandResult {
  const hq = world.hqOf(team);
  if (!hq || index < 0 || index >= hq.production.length) return fail('Nothing to cancel');
  const [item] = hq.production.splice(index, 1);
  refund(world.teams[team].resources, UNITS[item.unitId].cost);
  return OK;
}

function clampToMap(world: World, p: Vec2): Vec2 {
  return {
    x: Math.max(4, Math.min(world.map.pixelWidth - 4, p.x)),
    y: Math.max(4, Math.min(world.map.pixelHeight - 4, p.y)),
  };
}
