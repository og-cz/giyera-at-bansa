import { VICTORY } from '../../data/balance';
import type { TeamId } from '../../data/types';
import type { World } from '../world';

/**
 * Victory-point tickets: whoever holds more VPs drains the other side by the
 * difference. A team also loses when its headquarters is destroyed.
 */
export function updateVictory(world: World, dt: number): void {
  world.ticketTimer += dt;
  if (world.ticketTimer >= VICTORY.drainInterval) {
    world.ticketTimer -= VICTORY.drainInterval;
    const held = [0, 0];
    for (const p of world.points) if (p.kind === 'victory' && p.owner !== -1) held[p.owner]++;
    const diff = held[0] - held[1];
    if (diff > 0) world.teams[1].tickets = Math.max(0, world.teams[1].tickets - diff);
    if (diff < 0) world.teams[0].tickets = Math.max(0, world.teams[0].tickets + diff);
  }

  for (const team of [0, 1] as const) {
    const hq = world.hqOf(team);
    const lost = world.teams[team].tickets <= 0 || !hq || hq.dead;
    if (!lost) continue;
    const winner: TeamId = team === 0 ? 1 : 0;
    world.winner = winner;
    world.emit({ type: 'notify', team: -1, text: `${world.teams[winner].faction.name} wins`, tone: 'info' });
    return;
  }
}
