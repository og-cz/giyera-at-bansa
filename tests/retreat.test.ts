import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../src/data/balance';
import { MAPS } from '../src/data/maps';
import { issueAttackMove, issueMove, issueRetreat, issueSetup, issueStop, queueProduction } from '../src/sim/commands';
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

  it('tanks cannot retreat, and headquarters does not repair them', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    const hq = w.hqOf(0)!;
    const tank = w.spawn(0, 'us_stuart', { x: hq.pos.x + 60, y: hq.pos.y }, 0);
    expect(issueRetreat(w, tank).ok).toBe(false);
    tank.models[0].hp = 200;
    run(w, 20);
    expect(tank.models[0].hp).toBe(200);
  });

  it('new units come out of headquarters side by side, not stacked', () => {
    const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
    w.teams[0].resources = { manpower: 9000, munitions: 9000, fuel: 9000 };
    for (let i = 0; i < 3; i++) queueProduction(w, 0, 'us_stuart');
    const before = new Set(w.squads.map((s) => s.id));
    const spots: { x: number; y: number }[] = [];
    for (let t = 0; t < 200 && spots.length < 3; t += SIM_DT) {
      w.step(SIM_DT);
      w.events.length = 0;
      for (const s of w.squads) if (!before.has(s.id)) { before.add(s.id); spots.push({ ...s.pos }); }
    }
    expect(spots).toHaveLength(3);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y)).toBeGreaterThan(20);
  });
});
