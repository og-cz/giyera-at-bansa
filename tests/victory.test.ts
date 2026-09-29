import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../src/data/balance';
import { MAPS } from '../src/data/maps';
import type { WinCondition } from '../src/data/types';
import { World } from '../src/sim/world';

const battle = (win?: WinCondition) => new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'], win });

function destroy(world: World, filter: (team: 0 | 1, isHq: boolean) => boolean): void {
  for (const sq of world.squads) {
    if (!filter(sq.team, sq.def.kind === 'structure')) continue;
    for (const m of sq.models) m.alive = false;
    sq.dead = true;
  }
}

describe('win conditions', () => {
  it('defaults to capture points', () => {
    expect(battle().win).toBe('points');
  });

  it('points: running out of tickets loses', () => {
    const w = battle('points');
    w.teams[1].tickets = 0;
    w.step(SIM_DT);
    expect(w.winner).toBe(0);
    expect(w.endReason).toMatch(/tickets/);
  });

  it('annihilation: tickets do not matter', () => {
    const w = battle('annihilation');
    w.teams[1].tickets = 0;
    w.step(SIM_DT);
    expect(w.winner).toBe(-1);
  });

  it.each(['points', 'annihilation', 'none'] as const)('%s: destroying the enemy HQ always wins', (win) => {
    const w = battle(win);
    destroy(w, (team, isHq) => team === 1 && isHq);
    w.step(SIM_DT);
    expect(w.winner).toBe(0);
    expect(w.endReason).toMatch(/headquarters/);
  });

  it('annihilation: wiping out the whole enemy army wins', () => {
    const w = battle('annihilation');
    destroy(w, (team, isHq) => team === 1 && !isHq);
    w.step(SIM_DT);
    expect(w.winner).toBe(0);
    expect(w.endReason).toMatch(/annihilated/);
  });

  it('annihilation: not while the enemy HQ is still recruiting', () => {
    const w = battle('annihilation');
    destroy(w, (team, isHq) => team === 1 && !isHq);
    w.hqOf(1)!.production.push({ unitId: 'ija_riflemen', remaining: 10 });
    w.step(SIM_DT);
    expect(w.winner).toBe(-1);
  });

  it('none: tickets and losses do not end it, only the HQ', () => {
    const w = battle('none');
    w.teams[1].tickets = 0;
    destroy(w, (team, isHq) => team === 1 && !isHq);
    w.step(SIM_DT);
    expect(w.winner).toBe(-1);
  });
});
