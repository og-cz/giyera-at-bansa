import { ABILITIES } from '../../data/abilities';
import { WEAPONS } from '../../data/weapons';
import { angleTo, dist } from '../../core/vec';
import type { AbilityChannel, Squad } from '../entities';
import { finishOrder } from '../orders';
import type { World } from '../world';
import { launch, scatterPoint } from './combat';
import { canAfford, pay } from './economy';
import { startSetup } from './setup';

export function updateAbilities(world: World, dt: number): void {
  for (const sq of world.squads) {
    if (sq.dead) continue;
    for (const k in sq.cooldowns) if (sq.cooldowns[k] > 0) sq.cooldowns[k] -= dt;

    if (sq.channel) {
      if (sq.retreating || sq.suppState === 'pinned') {
        sq.channel = null;
        continue;
      }
      tickChannel(world, sq, sq.channel, dt);
      continue;
    }
    if (sq.order.kind !== 'ability' || !sq.order.dest) continue;
    const ab = ABILITIES[sq.order.abilityId ?? ''];
    if (!ab || sq.suppState === 'pinned' || sq.moving) continue;
    if (dist(sq.pos, sq.order.dest) > ab.range) continue;
    if (ab.requiresSetup && sq.setup !== 'deployed') {
      if (sq.setup === 'packed') startSetup(sq, angleTo(sq.pos, sq.order.dest));
      continue;
    }
    const team = world.teams[sq.team];
    if (!canAfford(team.resources, ab.cost) || (sq.cooldowns[ab.id] ?? 0) > 0) {
      finishOrder(sq);
      continue;
    }
    pay(team.resources, ab.cost);
    if (sq.def.kind === 'team') sq.setupFacing = angleTo(sq.pos, sq.order.dest);
    sq.channel = { abilityId: ab.id, target: { ...sq.order.dest }, timer: ab.windup, shots: ab.shots };
  }
}

function tickChannel(world: World, sq: Squad, ch: AbilityChannel, dt: number): void {
  const ab = ABILITIES[ch.abilityId];
  ch.timer -= dt;
  if (ch.timer > 0) return;
  const thrower = sq.models.find((m) => m.alive);
  if (thrower) {
    const w = WEAPONS[ab.weapon];
    const d = dist(thrower.pos, ch.target);
    const spread = w.scatter * (0.4 + 0.6 * Math.min(1, d / ab.range));
    thrower.facing = angleTo(thrower.pos, ch.target);
    const flight = w.projectile === 'grenade' ? 0.5 + d / 250 : 1 + d / 300;
    launch(world, sq, thrower.pos, scatterPoint(world, ch.target, spread), w, flight, true);
  }
  ch.shots--;
  ch.timer = ab.interval;
  if (ch.shots > 0) return;
  sq.channel = null;
  sq.cooldowns[ab.id] = ab.cooldown;
  if (sq.order.kind === 'ability') finishOrder(sq);
}
