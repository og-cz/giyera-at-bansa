import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../src/data/balance';
import { MAPS } from '../src/data/maps';
import { issueMove } from '../src/sim/commands';
import { World } from '../src/sim/world';

function run(world: World, seconds: number): void {
  for (let t = 0; t < seconds; t += SIM_DT) {
    world.step(SIM_DT);
    world.events.length = 0;
  }
}

describe('move and face (right-click drag)', () => {
  it('a weapon team sets up facing the dragged direction on arrival', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const hmg = w.spawn(0, 'us_hmg', { x: 400, y: 560 }, 0);
    const facing = -Math.PI / 2;
    issueMove(w, hmg, { x: 520, y: 560 }, false, facing);
    run(w, 12);
    expect(hmg.setup).toBe('deployed');
    expect(hmg.setupFacing).toBeCloseTo(facing, 5);
  });

  it('infantry turn to the dragged direction on arrival', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const rifles = w.spawn(0, 'us_riflemen', { x: 400, y: 560 }, 0);
    issueMove(w, rifles, { x: 520, y: 560 }, false, Math.PI / 2);
    run(w, 10);
    expect(rifles.order.kind).toBe('idle');
    expect(rifles.heading).toBeCloseTo(Math.PI / 2, 5);
  });

  it('a plain move leaves a weapon team packed', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const hmg = w.spawn(0, 'us_hmg', { x: 400, y: 560 }, 0);
    issueMove(w, hmg, { x: 520, y: 560 });
    run(w, 12);
    expect(hmg.setup).toBe('packed');
  });
});
