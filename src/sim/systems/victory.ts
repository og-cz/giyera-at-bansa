import { VICTORY } from '../../data/balance';
import type { TeamId } from '../../data/types';
import type { World } from '../world';

/**
 * Open-battle victory, depending on the chosen win condition:
 * - points: holding more VPs drains the other side's tickets; 0 tickets or a lost HQ loses.
 * - annihilation: a side loses once its HQ and every one of its units are destroyed.
 * - none: no automatic victory; the battle runs until a player leaves.
 */
export function updateVictory(world: World, dt: number): void {
  if (world.win === 'points') drainTickets(world, dt);
  if (world.win === 'none') return;

  for (const team of [0, 1] as const) {
    const reason = world.win === 'points' ? pointsLoss(world, team) : annihilationLoss(world, team);
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

function pointsLoss(world: World, team: TeamId): string | null {
  const name = world.teams[team].faction.name;
  if (world.teams[team].tickets <= 0) return `${name} ran out of tickets`;
  const hq = world.hqOf(team);
  if (!hq || hq.dead) return `${name} headquarters destroyed`;
  return null;
}

function annihilationLoss(world: World, team: TeamId): string | null {
  const remaining = world.squads.some((s) => s.team === team && !s.dead);
  return remaining ? null : `${world.teams[team].faction.name} has been annihilated`;
}

/** Units still fighting on each side (HQ included), for the annihilation HUD. */
export function forcesRemaining(world: World): [number, number] {
  const n: [number, number] = [0, 0];
  for (const s of world.squads) if (!s.dead) n[s.team]++;
  return n;
}
