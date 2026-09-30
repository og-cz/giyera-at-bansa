import { describe, expect, it } from 'vitest';
import { SIM_DT, TILE } from '../src/data/balance';
import { MAPS } from '../src/data/maps';
import { UNITS } from '../src/data/units';
import { UPGRADES } from '../src/data/upgrades';
import { WEAPONS } from '../src/data/weapons';
import { activeJobs, cancelReinforce, cancelUpgrade, issueMove, issueReinforce, issueUpgrade, queueProduction } from '../src/sim/commands';
import { addRecruit } from '../src/sim/systems/logistics';
import { World } from '../src/sim/world';

function run(world: World, seconds: number): void {
  for (let t = 0; t < seconds; t += SIM_DT) {
    world.step(SIM_DT);
    world.events.length = 0;
  }
}

const weaponsOf = (sq: { models: { alive: boolean; weapons: { def: { id: string } }[] }[] }) =>
  sq.models.filter((m) => m.alive).map((m) => m.weapons[0].def.id);

function atHq() {
  const w = new World({ map: MAPS.bataan, factions: ['usaffe', 'ija'] });
  w.teams[0].resources.munitions = 200;
  const hq = w.hqOf(0)!;
  const rifles = w.spawn(0, 'us_riflemen', { x: hq.pos.x + 2 * TILE, y: hq.pos.y }, 0);
  return { w, rifles };
}

describe('squad upgrades', () => {
  it('a rifleman takes a bazooka after the upgrade time, paid in munitions', () => {
    const { w, rifles } = atHq();
    expect(issueUpgrade(w, rifles, 'us_bazooka_kit').ok).toBe(true);
    expect(w.teams[0].resources.munitions).toBe(140);
    run(w, 6);
    expect(weaponsOf(rifles)).not.toContain('bazooka');
    run(w, 7);
    expect(rifles.upgrades).toEqual(['us_bazooka_kit']);
    expect(weaponsOf(rifles).filter((id) => id === 'bazooka')).toHaveLength(1);
    expect(weaponsOf(rifles).filter((id) => id === 'm1_garand')).toHaveLength(4);
  });

  it('allows only one upgrade, and only ones from the squad’s own list', () => {
    const { w, rifles } = atHq();
    expect(issueUpgrade(w, rifles, 'ija_lmg').ok).toBe(false);
    expect(issueUpgrade(w, rifles, 'us_bar').ok).toBe(true);
    expect(issueUpgrade(w, rifles, 'us_bazooka_kit').ok).toBe(false);
    const mortar = w.spawn(0, 'us_mortar', rifles.pos, 0);
    expect(issueUpgrade(w, mortar, 'us_bar').ok).toBe(false);
  });

  it('must be bought near the HQ or a supplied point', () => {
    const { w, rifles } = atHq();
    rifles.pos = { x: w.map.pixelWidth / 2, y: w.map.pixelHeight / 2 };
    for (const m of rifles.models) m.pos = { ...rifles.pos };
    for (const p of w.points) p.owner = -1;
    expect(issueUpgrade(w, rifles, 'us_bar').ok).toBe(false);
  });

  it('reinforcements replace the lost upgrade weapon first', () => {
    const { w, rifles } = atHq();
    issueUpgrade(w, rifles, 'us_bazooka_kit');
    run(w, 13);
    const gunner = rifles.models.find((m) => m.weapons[0].def.id === 'bazooka')!;
    gunner.alive = false;
    expect(weaponsOf(rifles)).not.toContain('bazooka');
    addRecruit(w, rifles);
    expect(weaponsOf(rifles).filter((id) => id === 'bazooka')).toHaveLength(1);
    addRecruit(w, rifles);
    expect(weaponsOf(rifles).filter((id) => id === 'm1_garand')).toHaveLength(5);
  });

  it('upgrade weapons reach at least as far as the rifles they replace', () => {
    // Squads stop at their rifles' range; a shorter-ranged gun would sit out the fight.
    for (const unit of Object.values(UNITS)) {
      for (const id of unit.upgrades) {
        const base = WEAPONS[unit.loadout[unit.loadout.length - 1].weapons[0]];
        for (const w of UPGRADES[id].weapons) expect(WEAPONS[w].range, `${id} on ${unit.id}`).toBeGreaterThanOrEqual(base.range);
      }
    }
  });

  it('recruiting, upgrades and reinforcements share three queue slots', () => {
    const { w, rifles } = atHq();
    w.teams[0].resources.manpower = 5000;
    expect(queueProduction(w, 0, 'us_riflemen').ok).toBe(true);
    expect(queueProduction(w, 0, 'us_riflemen').ok).toBe(true);
    expect(issueUpgrade(w, rifles, 'us_bar').ok).toBe(true);
    expect(activeJobs(w, 0)).toBe(3);
    rifles.models[0].alive = false;
    const wounded = w.spawn(0, 'us_riflemen', rifles.pos, 0);
    wounded.models[0].alive = false;
    expect(issueReinforce(w, wounded).reason).toMatch(/Queue full/);
    expect(queueProduction(w, 0, 'us_riflemen').reason).toMatch(/Queue full/);
    // Cancelling the upgrade frees a slot and refunds the munitions.
    const munitions = w.teams[0].resources.munitions;
    expect(cancelUpgrade(w, rifles).ok).toBe(true);
    expect(w.teams[0].resources.munitions).toBe(munitions + 50);
    expect(issueReinforce(w, wounded).ok).toBe(true);
    expect(cancelReinforce(w, wounded).ok).toBe(true);
    expect(activeJobs(w, 0)).toBe(2);
  });

  it('keeps going while the squad moves off', () => {
    const { w, rifles } = atHq();
    issueUpgrade(w, rifles, 'us_bar');
    issueMove(w, rifles, { x: rifles.pos.x + 10 * TILE, y: rifles.pos.y });
    run(w, 13);
    expect(weaponsOf(rifles)).toContain('bar');
  });
});
