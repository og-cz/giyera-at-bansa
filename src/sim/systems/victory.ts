import { VICTORY } from '../../data/balance';
import type { TeamId } from '../../data/types';
import type { World } from '../world';

/**
 * Open-battle victory. Destroying the enemy headquarters always wins; on top of that:
 * - points: holding more VPs drains the other side's tickets; 0 tickets loses.
 * - annihilation: wiping out the enemy's whole field army (with nothing in production) also wins.
 * - none: only the headquarters decides the battle.
 */
export function updateVictory(world: World, dt: number): void {
  if (world.win === 'points') drainTickets(world, dt);

  for (const team of [0, 1] as const) {
    const reason = hqLoss(world, team) ?? (world.win === 'points' ? ticketLoss(world, team) : world.win === 'annihilation' ? annihilationLoss(world, team) : null);
    if (!reason) continue;
    const winner: TeamId = team === 0 ? 1 : 0;
    world.winner = winner;
    world.endReason = reason;
    world.emit({ type: 'notify', team: -1, text: `${world.teams[winner].faction.name} wins`, tone: 'info' });
    return;
  }
}

function drainTickets(world: World, dt: number): void {
  world.ticketTimer += dt;
  if (world.ticketTimer < VICTORY.drainInterval) return;
  world.ticketTimer -= VICTORY.drainInterval;
  const held = [0, 0];
  for (const p of world.points) if (p.kind === 'victory' && p.owner !== -1) held[p.owner]++;
  const diff = held[0] - held[1];
  if (diff > 0) world.teams[1].tickets = Math.max(0, world.teams[1].tickets - diff);
  if (diff < 0) world.teams[0].tickets = Math.max(0, world.teams[0].tickets + diff);
}

function hqLoss(world: World, team: TeamId): string | null {
  const hq = world.hqOf(team);
  return !hq || hq.dead ? `${world.teams[team].faction.name} headquarters destroyed` : null;
}

function ticketLoss(world: World, team: TeamId): string | null {
  return world.teams[team].tickets <= 0 ? `${world.teams[team].faction.name} ran out of tickets` : null;
}

function annihilationLoss(world: World, team: TeamId): string | null {
  const army = world.squads.some((s) => s.team === team && !s.dead && s.def.kind !== 'structure');
  const recruiting = (world.hqOf(team)?.production.length ?? 0) > 0;
  return army || recruiting ? null : `${world.teams[team].faction.name} has been annihilated`;
}

/** Units still fighting on each side (HQ included), for the annihilation HUD. */
export function forcesRemaining(world: World): [number, number] {
  const n: [number, number] = [0, 0];
  for (const s of world.squads) if (!s.dead) n[s.team]++;
  return n;
}
