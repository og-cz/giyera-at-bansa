import { TILE } from '../../data/balance';
import { BUILDABLES } from '../../data/buildables';
import { T } from '../../data/terrain';
import type { Resources, TeamId } from '../../data/types';
import { WEAPONS } from '../../data/weapons';
import { dist, type Vec2 } from '../../core/vec';
import { aliveCount, type Construction, type Squad } from '../entities';
import { finishOrder } from '../orders';
import type { World } from '../world';
import { explode } from './combat';
import { defenseAt, repairDefense, resetDefense } from './defenses';
import { refund } from './economy';

/** Ground engineers may build on. Existing defenses, buildings and water are off limits. */
const BUILDABLE_GROUND = new Set<number>([T.Open, T.Road, T.Paddy, T.Crater, T.Hedge]);
/** How close a squad must stand to the tile it works on. */
export const WORK_RANGE = 34;
/** Hit points restored per second by a full engineer squad. */
const REPAIR_RATE = 14;
/** Hit points restored per second on sandbags, wire or tank traps. */
const DEFENSE_REPAIR_RATE = 30;
const MINE_TRIGGER = 11;

export interface PlannedTile {
  tx: number;
  ty: number;
  valid: boolean;
}

export interface BuildPlan {
  tiles: PlannedTile[];
  /** Total cost of the valid tiles. */
  cost: Resources;
}

/** Tiles along a straight line between two tiles (inclusive), Bresenham-style. */
function lineTiles(x0: number, y0: number, x1: number, y1: number, max: number): [number, number][] {
  const out: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (out.length < max) {
    out.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

/** What placing `buildId` from `from` to `to` would produce, and what it would cost. Used for previews too. */
export function planBuild(world: World, buildId: string, from: Vec2, to: Vec2): BuildPlan {
  const def = BUILDABLES[buildId];
  const tx0 = Math.floor(from.x / TILE);
  const ty0 = Math.floor(from.y / TILE);
  const cells =
    def.shape === 'structure'
      ? footprintTiles(def, tx0, ty0).map((f) => [f.tx, f.ty] as [number, number])
      : def.shape === 'point'
        ? [[tx0, ty0] as [number, number]]
        : lineTiles(tx0, ty0, Math.floor(to.x / TILE), Math.floor(to.y / TILE), def.maxLength);
  const pending = new Set<number>();
  for (const c of world.constructions) {
    for (const t of c.tiles) if (!t.done) pending.add(world.map.idx(t.tx, t.ty));
    for (const f of c.footprint ?? []) pending.add(world.map.idx(f.tx, f.ty));
  }
  const tiles = cells.map(([tx, ty]) => {
    let valid = world.map.inBounds(tx, ty) && BUILDABLE_GROUND.has(world.map.get(tx, ty)) && !pending.has(world.map.idx(tx, ty));
    if (valid && def.shape === 'point') {
      const center = world.map.tileCenter(tx, ty);
      valid = !world.mines.some((m) => dist(m.pos, center) < TILE);
    }
    if (valid && def.shape === 'structure') {
      // Not on top of another structure (the HQ has no footprint of its own, so keep clear of it).
      const center = world.map.tileCenter(tx, ty);
      valid = !world.squads.some((s) => !s.dead && s.def.kind === 'structure' && s.footprint.length === 0 && dist(s.pos, center) < s.def.radius + TILE);
    }
    return { tx, ty, valid };
  });
  // A structure is one building: all its tiles must be free, and it costs once.
  if (def.shape === 'structure') {
    const ok = tiles.every((t) => t.valid);
    for (const t of tiles) t.valid = ok;
    return { tiles, cost: ok ? { ...def.cost } : { manpower: 0, munitions: 0, fuel: 0 } };
  }
  const n = tiles.filter((t) => t.valid).length;
  return { tiles, cost: { manpower: def.cost.manpower * n, munitions: def.cost.munitions * n, fuel: def.cost.fuel * n } };
}

/** The tiles a structure takes up when placed on (tx, ty), wide × deep around that tile. */
export function footprintTiles(def: { footprint?: readonly [number, number] }, tx: number, ty: number): { tx: number; ty: number }[] {
  const [w, h] = def.footprint ?? [1, 1];
  const x0 = tx - Math.floor((w - 1) / 2);
  const y0 = ty - Math.floor((h - 1) / 2);
  const out: { tx: number; ty: number }[] = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push({ tx: x, ty: y });
  return out;
}

/** Centre of a footprint in world units. */
function footprintCenter(tiles: { tx: number; ty: number }[]): Vec2 {
  const xs = tiles.map((t) => t.tx);
  const ys = tiles.map((t) => t.ty);
  return { x: ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * TILE, y: ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * TILE };
}

export function currentTile(c: Construction): Construction['tiles'][number] | undefined {
  return c.tiles.find((t) => !t.done);
}

/** Where an engineer squad should stand to work on its current tile: the closest passable neighbour. */
export function workSpot(world: World, sq: Squad, c: Construction): Vec2 | null {
  const tile = currentTile(c);
  if (!tile) return null;
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = tile.tx + dx;
      const ny = tile.ty + dy;
      if (!world.map.passable(nx, ny, 'infantry')) continue;
      if (c.tiles.some((t) => !t.done && t.tx === nx && t.ty === ny)) continue;
      const p = world.map.tileCenter(nx, ny);
      const d = dist(p, sq.pos);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  return best ?? world.map.tileCenter(tile.tx, tile.ty);
}

/** The team's unfinished construction job covering the tile under `p`, if any. */
export function constructionAt(world: World, team: number, p: Vec2): Construction | undefined {
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor(p.y / TILE);
  return world.constructions.find((c) => c.team === team && c.tiles.some((t) => !t.done && t.tx === tx && t.ty === ty));
}

export function constructionOf(world: World, sq: Squad): Construction | undefined {
  return sq.order.kind === 'build' ? world.constructions.find((c) => c.id === sq.order.targetId) : undefined;
}

export function updateEngineering(world: World, dt: number): void {
  clearRuins(world);
  updateConstructions(world, dt);
  updateRepairs(world, dt);
  updateMines(world);
}

/** A fallen structure leaves rubble that units can cross again. */
function clearRuins(world: World): void {
  for (const s of world.squads) {
    if (!s.dead || s.footprint.length === 0) continue;
    for (const f of s.footprint) if (world.map.get(f.tx, f.ty) === T.Emplacement) world.map.set(f.tx, f.ty, T.Crater);
    s.footprint = [];
  }
}

/** Engineer squads currently assigned to a construction job. */
export function workersOf(world: World, c: Construction): Squad[] {
  return world.squads.filter((s) => !s.dead && s.team === c.team && s.order.kind === 'build' && s.order.targetId === c.id);
}

function updateConstructions(world: World, dt: number): void {
  if (world.constructions.length === 0) return;
  const keep: Construction[] = [];
  for (const c of world.constructions) {
    const def = BUILDABLES[c.buildId];
    const workers = workersOf(world, c);
    const unbuilt = c.tiles.filter((t) => !t.done).length;
    // Abandoned (every squad on it took another order, retreated or died): refund whatever was not built.
    if (workers.length === 0) {
      refund(world.teams[c.team].resources, {
        manpower: def.cost.manpower * unbuilt,
        munitions: def.cost.munitions * unbuilt,
        fuel: def.cost.fuel * unbuilt,
      });
      continue;
    }
    const tile = currentTile(c);
    if (!tile) {
      for (const w of workers) finishOrder(w);
      world.emit({ type: 'notify', team: c.team, text: `${def.name} finished`, tone: 'good' });
      continue;
    }
    keep.push(c);
    const center = world.map.tileCenter(tile.tx, tile.ty);
    // Every squad on the job adds its effort: two squads build twice as fast.
    for (const w of workers) {
      if (w.moving || w.suppState === 'pinned' || dist(w.pos, center) > WORK_RANGE) continue;
      tile.progress += (dt * (aliveCount(w) / w.def.models)) / def.buildTime;
    }
    if (tile.progress < 1) continue;
    tile.done = true;
    if (def.shape === 'structure') {
      const tiles = c.footprint ?? [{ tx: tile.tx, ty: tile.ty }];
      const sq = world.spawn(c.team as TeamId, def.unit!, footprintCenter(tiles), c.facing ?? workers[0].heading);
      sq.footprint = tiles;
      for (const f of tiles) world.map.set(f.tx, f.ty, T.Emplacement);
      // Anyone standing where it now stands steps out of the way.
      for (const s of world.squads) {
        if (s.dead || s.def.kind === 'structure') continue;
        const mover = s.def.vehicle ? 'vehicle' : 'infantry';
        if (!world.map.worldPassable(s.pos, mover)) s.pos = world.map.nearestPassable(s.pos, mover);
        for (const m of s.models) if (m.alive && !world.map.worldPassable(m.pos, 'infantry')) m.pos = world.map.nearestPassable(m.pos, 'infantry');
      }
    } else if (def.terrain !== null) {
      if (BUILDABLE_GROUND.has(world.map.get(tile.tx, tile.ty))) world.map.set(tile.tx, tile.ty, def.terrain);
      resetDefense(world, tile.tx, tile.ty);
    } else {
      world.mines.push({ id: world.nextId(), team: c.team as TeamId, pos: center });
    }
  }
  world.constructions = keep;
}

function updateRepairs(world: World, dt: number): void {
  for (const sq of world.squads) {
    if (sq.dead || sq.order.kind !== 'repair') continue;
    const spot = sq.order.dest;
    if (sq.order.targetId === undefined && spot) {
      // Patching up a defense tile.
      const tx = Math.floor(spot.x / TILE);
      const ty = Math.floor(spot.y / TILE);
      if (!defenseAt(world, tx, ty)) {
        finishOrder(sq);
        continue;
      }
      if (sq.moving || dist(sq.pos, spot) > WORK_RANGE) continue;
      if (repairDefense(world, tx, ty, DEFENSE_REPAIR_RATE * (aliveCount(sq) / sq.def.models) * dt)) finishOrder(sq);
      continue;
    }
    const target = world.get(sq.order.targetId);
    const hull = target?.models.find((m) => m.alive);
    if (!target || target.dead || target.team !== sq.team || !hull || hull.hp >= hull.maxHp) {
      finishOrder(sq);
      continue;
    }
    if (sq.moving || dist(sq.pos, target.pos) > target.def.radius + WORK_RANGE) continue;
    hull.hp = Math.min(hull.maxHp, hull.hp + REPAIR_RATE * (aliveCount(sq) / sq.def.models) * dt);
  }
}

function updateMines(world: World): void {
  if (world.mines.length === 0) return;
  const survivors = [];
  for (const mine of world.mines) {
    let trigger: Vec2 | null = null;
    for (const s of world.squads) {
      if (s.dead || s.team === mine.team || s.def.kind === 'structure') continue;
      const m = s.models.find((m) => m.alive && dist(m.pos, mine.pos) <= MINE_TRIGGER + s.def.radius);
      if (m) {
        trigger = m.pos;
        break;
      }
    }
    if (!trigger) {
      survivors.push(mine);
      continue;
    }
    // The charge goes off under whoever stepped on it.
    world.emit({ type: 'float', pos: { ...mine.pos }, text: 'Mine!', tone: 'bad' });
    explode(world, { ...trigger }, WEAPONS.mine, null);
  }
  world.mines = survivors;
}

/** True when this squad can build or repair (engineers). */
export const isEngineer = (sq: Squad): boolean => sq.def.builds.length > 0 || sq.def.canRepair;
