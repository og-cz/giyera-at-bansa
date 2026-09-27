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

  it('annihilation: losing the HQ alone is not enough', () => {
    const w = battle('annihilation');
    destroy(w, (team, isHq) => team === 1 && isHq);
    w.step(SIM_DT);
    expect(w.winner).toBe(-1);
  });

  it('annihilation: destroying every enemy unit and the HQ wins', () => {
    const w = battle('annihilation');
    destroy(w, (team) => team === 1);
    w.step(SIM_DT);
    expect(w.winner).toBe(0);
    expect(w.endReason).toMatch(/annihilated/);
  });

  it('none: the battle never ends on its own', () => {
    const w = battle('none');
    w.teams[1].tickets = 0;
    destroy(w, (team) => team === 1);
    w.step(SIM_DT);
    expect(w.winner).toBe(-1);
  });
});
