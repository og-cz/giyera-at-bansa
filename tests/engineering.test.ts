import { describe, expect, it } from 'vitest';
import { SIM_DT, TILE } from '../src/data/balance';
import { MAPS } from '../src/data/maps';
import { T } from '../src/data/terrain';
import { issueBuild, issueHelpBuild, issueMove, issueRepair } from '../src/sim/commands';
import { planBuild } from '../src/sim/systems/engineering';
import { World } from '../src/sim/world';

const at = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });

function run(world: World, seconds: number): void {
  for (let t = 0; t < seconds; t += SIM_DT) {
    world.step(SIM_DT);
    world.events.length = 0;
  }
}

/** Open ground north of the Bataan crossroads, clear of buildings. */
function battle() {
  const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
  for (let x = 18; x <= 30; x++) for (let y = 28; y <= 33; y++) w.map.set(x, y, T.Open);
  w.map.changes.length = 0;
  return w;
}

describe('engineers', () => {
  it('plans a straight line capped at the maximum length', () => {
    const w = battle();
    const plan = planBuild(w, 'sandbags', at(18, 30), at(30, 30));
    expect(plan.tiles).toHaveLength(8);
    expect(plan.tiles.every((t) => t.valid)).toBe(true);
    expect(plan.cost.manpower).toBe(80);
  });

  it('will not build on buildings or water', () => {
    const w = battle();
    w.map.set(20, 30, T.Building);
    w.map.set(21, 30, T.Water);
    const plan = planBuild(w, 'wire', at(19, 30), at(22, 30));
    expect(plan.tiles.map((t) => t.valid)).toEqual([true, false, false, true]);
  });

  it('builds sandbags tile by tile and charges for them', () => {
    const w = battle();
    const eng = w.spawn(0, 'us_engineers', at(20, 32), 0);
    const before = w.teams[0].resources.manpower;
    expect(issueBuild(w, eng, 'sandbags', at(19, 30), at(22, 30)).ok).toBe(true);
    expect(w.teams[0].resources.manpower).toBeLessThan(before - 39);
    run(w, 20);
    expect([19, 20, 21, 22].map((x) => w.map.get(x, 30))).toEqual([T.Sandbag, T.Sandbag, T.Sandbag, T.Sandbag]);
    expect(eng.order.kind).toBe('idle');
    expect(w.constructions).toHaveLength(0);
  });

  it('refunds unbuilt tiles when the engineers are given another order', () => {
    const w = battle();
    const eng = w.spawn(0, 'us_engineers', at(20, 32), 0);
    const start = w.teams[0].resources.manpower;
    issueBuild(w, eng, 'tanktrap', at(19, 30), at(24, 30));
    issueMove(w, eng, at(25, 33));
    run(w, 0.1);
    expect(w.constructions).toHaveLength(0);
    expect(w.teams[0].resources.manpower).toBeGreaterThanOrEqual(start - 1);
  });

  it('a second engineer squad helps and the job finishes faster', () => {
    const timeToBuild = (helpers: number) => {
      const w = battle();
      const lead = w.spawn(0, 'us_engineers', at(20, 32), 0);
      issueBuild(w, lead, 'tanktrap', at(19, 30), at(24, 30));
      const id = lead.order.targetId!;
      for (let i = 0; i < helpers; i++) expect(issueHelpBuild(w, w.spawn(0, 'us_engineers', at(22, 32), 0), id).ok).toBe(true);
      let t = 0;
      while (w.constructions.length > 0 && t < 60) {
        run(w, 0.5);
        t += 0.5;
      }
      expect([19, 20, 21, 22, 23, 24].every((x) => w.map.get(x, 30) === T.TankTrap)).toBe(true);
      return t;
    };
    expect(timeToBuild(1)).toBeLessThan(timeToBuild(0) * 0.75);
  });

  it('a job is only cancelled when every squad on it leaves', () => {
    const w = battle();
    const lead = w.spawn(0, 'us_engineers', at(20, 32), 0);
    const helper = w.spawn(0, 'us_engineers', at(22, 32), 0);
    issueBuild(w, lead, 'sandbags', at(19, 30), at(24, 30));
    issueHelpBuild(w, helper, lead.order.targetId!);
    issueMove(w, lead, at(25, 33));
    run(w, 0.2);
    expect(w.constructions).toHaveLength(1);
    issueMove(w, helper, at(25, 33));
    run(w, 0.2);
    expect(w.constructions).toHaveLength(0);
  });

  it('wire stops infantry but tanks crush it; tank traps stop tanks', () => {
    const w = battle();
    w.map.set(24, 30, T.Wire);
    w.map.set(25, 30, T.TankTrap);
    expect(w.map.passable(24, 30, 'infantry')).toBe(false);
    expect(w.map.passable(24, 30, 'vehicle')).toBe(true);
    expect(w.map.passable(25, 30, 'infantry')).toBe(true);
    expect(w.map.passable(25, 30, 'vehicle')).toBe(false);
  });

  it('a mine is laid, stays hidden in the mine list and wrecks an enemy tank', () => {
    const w = battle();
    const eng = w.spawn(0, 'us_engineers', at(20, 32), 0);
    issueBuild(w, eng, 'mine', at(22, 30), at(22, 30));
    run(w, 12);
    expect(w.mines).toHaveLength(1);
    const tank = w.spawn(1, 'ija_chiha', at(28, 30), Math.PI);
    issueMove(w, tank, at(18, 30));
    run(w, 10);
    expect(w.mines).toHaveLength(0);
    expect(tank.dead || tank.models[0].hp < tank.models[0].maxHp * 0.7).toBe(true);
  });

  it('repairs a damaged friendly tank', () => {
    const w = battle();
    const tank = w.spawn(0, 'us_stuart', at(24, 30), 0);
    tank.models[0].hp = 200;
    const eng = w.spawn(0, 'us_engineers', at(20, 32), 0);
    expect(issueRepair(w, eng, tank).ok).toBe(true);
    run(w, 25);
    expect(tank.models[0].hp).toBe(tank.models[0].maxHp);
    expect(eng.order.kind).toBe('idle');
  });

  it('only engineers build or repair', () => {
    const w = battle();
    const rifles = w.spawn(0, 'us_riflemen', at(20, 32), 0);
    const tank = w.spawn(0, 'us_stuart', at(24, 30), 0);
    tank.models[0].hp = 100;
    expect(issueBuild(w, rifles, 'sandbags', at(19, 30), at(22, 30)).ok).toBe(false);
    expect(issueRepair(w, rifles, tank).ok).toBe(false);
  });
});
