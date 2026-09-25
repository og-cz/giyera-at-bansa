import { TILE } from '../data/balance';
import { MIN_TERRAIN_COST } from '../data/terrain';
import type { Mover } from '../data/types';
import type { Vec2 } from '../core/vec';
import type { GameMap } from './grid';

const SQRT2 = Math.SQRT2;
const DIRS: readonly [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

/** Minimal binary min-heap keyed by f-score; stale entries are skipped on pop. */
class Heap {
  private nodes: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.nodes.length;
  }

  push(node: number, key: number): void {
    const n = this.nodes;
    const k = this.keys;
    let i = n.length;
    n.push(node);
    k.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      n[i] = n[p];
      k[i] = k[p];
      i = p;
    }
    n[i] = node;
    k[i] = key;
  }

  pop(): number {
    const n = this.nodes;
    const k = this.keys;
    const top = n[0];
    const lastN = n.pop()!;
    const lastK = k.pop()!;
    if (n.length > 0) {
      let i = 0;
      const len = n.length;
      for (;;) {
        const l = i * 2 + 1;
        if (l >= len) break;
        const r = l + 1;
        const c = r < len && k[r] < k[l] ? r : l;
        if (k[c] >= lastK) break;
        n[i] = n[c];
        k[i] = k[c];
        i = c;
      }
      n[i] = lastN;
      k[i] = lastK;
    }
    return top;
  }
}

function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return (dx + dy + (SQRT2 - 2) * Math.min(dx, dy)) * MIN_TERRAIN_COST;
}

/**
 * Terrain-cost-aware A* over the tile grid. If the goal is unreachable the path
 * leads to the closest reachable tile instead. Returns smoothed world waypoints
 * (excluding the start position); empty when already there.
 */
export function findPath(map: GameMap, from: Vec2, to: Vec2, mover: Mover): Vec2[] {
  const start = map.nearestPassableTile(Math.floor(from.x / TILE), Math.floor(from.y / TILE), mover);
  const goalTileX = Math.floor(to.x / TILE);
  const goalTileY = Math.floor(to.y / TILE);
  const goal = map.nearestPassableTile(goalTileX, goalTileY, mover);
  if (!start || !goal) return [];

  const w = map.w;
  const n = w * map.h;
  const s = start[1] * w + start[0];
  const g = goal[1] * w + goal[0];
  const exactGoal = goal[0] === goalTileX && goal[1] === goalTileY;
  if (s === g) return exactGoal ? [{ x: to.x, y: to.y }] : [map.tileCenter(goal[0], goal[1])];

  const gScore = new Float32Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap = new Heap();
  gScore[s] = 0;
  heap.push(s, octile(start[0], start[1], goal[0], goal[1]));
  let best = s;
  let bestH = Infinity;

  while (heap.size > 0) {
    const cur = heap.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === g) break;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    const h = octile(cx, cy, goal[0], goal[1]);
    if (h < bestH) {
      bestH = h;
      best = cur;
    }
    const curCost = map.cost(cx, cy, mover);
    for (const [dx, dy, step] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!map.passable(nx, ny, mover)) continue;
      const ni = ny * w + nx;
      if (closed[ni]) continue;
      // No squeezing diagonally between two blocked tiles.
      if (dx !== 0 && dy !== 0 && (!map.passable(cx + dx, cy, mover) || !map.passable(cx, cy + dy, mover))) continue;
      const ng = gScore[cur] + (step * (curCost + map.cost(nx, ny, mover))) / 2;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        parent[ni] = cur;
        heap.push(ni, ng + octile(nx, ny, goal[0], goal[1]));
      }
    }
  }

  const end = closed[g] ? g : best;
  const tiles: number[] = [];
  for (let c = end; c !== -1 && c !== s; c = parent[c]) tiles.push(c);
  tiles.reverse();
  const raw = tiles.map((i) => map.tileCenter(i % w, Math.floor(i / w)));
  if (end === g && exactGoal && raw.length > 0) raw[raw.length - 1] = { x: to.x, y: to.y };
  return smooth(map, from, raw, mover);
}

/** String-pulling: skip intermediate waypoints that have a clear straight line. */
function smooth(map: GameMap, from: Vec2, pts: Vec2[], mover: Mover): Vec2[] {
  if (pts.length <= 1) return pts;
  const out: Vec2[] = [];
  let anchor = from;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !map.lineWalkable(anchor, pts[j], mover)) j--;
    out.push(pts[j]);
    anchor = pts[j];
    i = j + 1;
  }
  return out;
}

export function pathLength(from: Vec2, path: readonly Vec2[]): number {
  let total = 0;
  let prev = from;
  for (const p of path) {
    total += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return total;
}
