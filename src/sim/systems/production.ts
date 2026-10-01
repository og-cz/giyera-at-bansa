import { UNITS } from '../../data/units';
import { add, angleTo, dist, rotate, type Vec2 } from '../../core/vec';
import { setOrder } from '../orders';
import type { World } from '../world';

/** The nearest open spot around `at` that no unit is already standing on, so new units do not stack. */
function freeSpot(world: World, at: Vec2, mover: 'infantry' | 'vehicle', room: number): Vec2 {
  const taken = (p: Vec2) => world.squads.some((s) => !s.dead && s.def.kind !== 'structure' && dist(s.pos, p) < room);
  for (let ring = 0; ring <= 6; ring++) {
    const n = ring === 0 ? 1 : ring * 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = world.map.nearestPassable({ x: at.x + Math.cos(a) * ring * room, y: at.y + Math.sin(a) * ring * room }, mover);
      if (!taken(p)) return p;
    }
  }
  return world.map.nearestPassable(at, mover);
}

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
    // Headquarters sends units out of the base exit; a tier building out of its own door.
    const exit = hq.def.role === 'hq' ? team.spawn : add(hq.pos, rotate({ x: hq.def.radius + 14, y: 0 }, hq.heading));
    const pos = freeSpot(world, exit, mover, def.vehicle ? 30 : 18);
    const sq = world.spawn(hq.team, item.unitId, pos, angleTo(pos, center));
    team.stats.produced++;
    const rally = hq.rally ?? world.hqOf(hq.team)?.rally;
    if (rally) setOrder(sq, { kind: 'move', dest: { ...rally } });
    world.emit({ type: 'notify', team: hq.team, text: `${def.name} ready`, tone: 'info', pos: { ...pos } });
  }
}
