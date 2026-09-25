import { ECONOMY } from '../../data/balance';
import type { Resources, TeamId } from '../../data/types';
import { UNITS } from '../../data/units';
import type { World } from '../world';

export const canAfford = (have: Resources, cost: Resources): boolean =>
  have.manpower >= cost.manpower && have.munitions >= cost.munitions && have.fuel >= cost.fuel;

export function pay(have: Resources, cost: Resources): void {
  have.manpower -= cost.manpower;
  have.munitions -= cost.munitions;
  have.fuel -= cost.fuel;
}

export function refund(have: Resources, cost: Resources): void {
  have.manpower += cost.manpower;
  have.munitions += cost.munitions;
  have.fuel += cost.fuel;
}

/** Population in use, counting units still in the production queue. */
export function popUsed(world: World, team: TeamId): number {
  let pop = 0;
  for (const sq of world.squads) {
    if (sq.dead || sq.team !== team) continue;
    pop += sq.def.pop;
    for (const item of sq.production) pop += UNITS[item.unitId].pop;
  }
  return pop;
}

/** Income per minute: base + supplied points − manpower upkeep for the army's size. */
export function computeIncome(world: World, team: TeamId): Resources {
  const inc = { ...ECONOMY.base };
  for (const p of world.points) {
    if (p.owner !== team || !world.territory.isSupplied(team, p.sector)) continue;
    const add = ECONOMY.points[p.kind];
    inc.manpower += add.manpower;
    inc.munitions += add.munitions;
    inc.fuel += add.fuel;
  }
  const t = world.teams[team];
  inc.manpower = Math.max(ECONOMY.minManpowerIncome, inc.manpower - t.pop * ECONOMY.upkeepPerPop);
  inc.manpower *= t.incomeMult;
  inc.munitions *= t.incomeMult;
  inc.fuel *= t.incomeMult;
  return inc;
}

export function updateEconomy(world: World, dt: number): void {
  for (const t of world.teams) {
    t.pop = popUsed(world, t.id);
    t.income = computeIncome(world, t.id);
    t.resources.manpower += (t.income.manpower * dt) / 60;
    t.resources.munitions += (t.income.munitions * dt) / 60;
    t.resources.fuel += (t.income.fuel * dt) / 60;
  }
}
