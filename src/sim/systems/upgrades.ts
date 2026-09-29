import { UPGRADES } from '../../data/upgrades';
import { createWeaponStates, type Squad } from '../entities';
import type { World } from '../world';

/**
 * Hand out an upgrade's weapons. The new kit goes first in the squad's loadout,
 * so reinforcements replace a lost bazooka or light MG before a rifle.
 */
export function applyUpgrade(sq: Squad, upgradeId: string): void {
  const def = UPGRADES[upgradeId];
  const base = sq.loadout.length - 1;
  const count = Math.min(def.count, sq.loadout[base].count);
  sq.loadout[base].count -= count;
  sq.loadout.unshift({ weapons: def.weapons, count });
  for (const m of sq.models) m.loadoutIndex++;
  let given = 0;
  for (const m of sq.models) {
    if (given >= count) break;
    if (!m.alive || m.loadoutIndex !== base + 1) continue;
    m.loadoutIndex = 0;
    m.weapons = createWeaponStates(def.weapons);
    given++;
  }
  sq.upgrades.push(upgradeId);
}

export function updateUpgrades(world: World, dt: number): void {
  for (const sq of world.squads) {
    if (sq.dead || !sq.upgrading) continue;
    sq.upgrading.remaining -= dt;
    if (sq.upgrading.remaining > 0) continue;
    const id = sq.upgrading.id;
    sq.upgrading = null;
    applyUpgrade(sq, id);
    world.emit({ type: 'float', pos: { ...sq.pos }, text: UPGRADES[id].name, tone: 'good' });
    world.emit({ type: 'notify', team: sq.team, text: `${sq.def.name}: ${UPGRADES[id].name} ready`, tone: 'good', pos: { ...sq.pos } });
  }
}
