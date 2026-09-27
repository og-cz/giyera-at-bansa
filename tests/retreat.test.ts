import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../src/data/balance';
import { MAPS } from '../src/data/maps';
import { issueAttackMove, issueMove, issueRetreat, issueSetup, issueStop } from '../src/sim/commands';
import { World } from '../src/sim/world';

function run(world: World, seconds: number): void {
  for (let t = 0; t < seconds; t += SIM_DT) {
    world.step(SIM_DT);
    world.events.length = 0;
  }
}

describe('retreat is binding', () => {
  it('a retreating squad refuses every other order', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const rifles = w.spawn(0, 'us_riflemen', { x: 700, y: 560 }, 0);
    issueRetreat(w, rifles);
    expect(issueMove(w, rifles, { x: 900, y: 560 }).ok).toBe(false);
    expect(issueAttackMove(w, rifles, { x: 900, y: 560 }).ok).toBe(false);
    expect(issueStop(w, rifles).ok).toBe(false);
    expect(rifles.retreating).toBe(true);
    expect(rifles.order.kind).toBe('retreat');
  });

  it('a retreating weapon team cannot set up', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const hmg = w.spawn(0, 'us_hmg', { x: 700, y: 560 }, 0);
    issueRetreat(w, hmg);
    expect(issueSetup(w, hmg).ok).toBe(false);
  });

  it('takes orders again once it reaches headquarters', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const rifles = w.spawn(0, 'us_riflemen', { x: 500, y: 560 }, 0);
    issueRetreat(w, rifles);
    run(w, 40);
    expect(rifles.retreating).toBe(false);
    expect(issueMove(w, rifles, { x: 600, y: 560 }).ok).toBe(true);
  });
});
