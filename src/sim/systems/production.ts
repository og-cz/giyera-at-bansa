import { UNITS } from '../../data/units';
import { angleTo } from '../../core/vec';
import { setOrder } from '../orders';
import type { World } from '../world';

export function updateProduction(world: World, dt: number): void {
  for (const hq of world.squads) {
    if (hq.dead || hq.production.length === 0) continue;
    const item = hq.production[0];
    item.remaining -= dt;
    if (item.remaining > 0) continue;
    hq.production.shift();
    const team = world.teams[hq.team];
    const def = UNITS[item.unitId];
    const mover = def.vehicle ? 'vehicle' : 'infantry';
    const center = { x: world.map.pixelWidth / 2, y: world.map.pixelHeight / 2 };
    const pos = world.map.nearestPassable(team.spawn, mover);
    const sq = world.spawn(hq.team, item.unitId, pos, angleTo(pos, center));
    team.stats.produced++;
    if (hq.rally) setOrder(sq, { kind: 'move', dest: { ...hq.rally } });
    world.emit({ type: 'notify', team: hq.team, text: `${def.name} ready`, tone: 'info', pos: { ...pos } });
  }
}
