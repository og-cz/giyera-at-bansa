import { decodeGridRow } from './gridCodec';
import { CALUMPIT_ROWS } from './luzon/calumpit';
import { T } from './terrain';
import type { MapDef, MapFeature, MapPointDef, PointKind } from './types';

/**
 * Battlefields built from Watabou village maps (converted with
 * tools/watabou-to-grid.js) and named after real towns on Luzon. The maps are
 * not symmetrical, so bases and capture points are placed by driving distance:
 * victory points sit where both sides are equally far away, and each side gets
 * its own munitions and fuel at the same distance from home.
 */
interface LuzonMapSource {
  id: string;
  name: string;
  description: string;
  rows: readonly string[];
  /** The map has a river: one victory point goes on a bridge. */
  river?: boolean;
  names: { victory: readonly [string, string, string]; munitions: readonly [string, string]; fuel: readonly [string, string] };
}

/** Tiles tanks cannot cross: water, buildings, jungle, walls. */
const UNDRIVABLE = new Set(['~', '#', 'j', 'w']);
/** Half-size of the open ground cleared around each HQ. */
const BASE_CLEAR = 4;

type Cell = { x: number; y: number };

function build(src: LuzonMapSource): MapDef {
  const grid = src.rows.map(decodeGridRow);
  const H = grid.length;
  const W = grid[0].length;
  const drivable = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !UNDRIVABLE.has(grid[y][x]);
  const features: MapFeature[] = [{ kind: 'grid', rows: src.rows }];

  // Bases: where a road leaves the map on the west and east edges, nearest the middle.
  const bases = ([0, W - 1] as const).map((edge) => {
    let bestY = Math.floor(H / 2);
    let best = Infinity;
    for (let y = BASE_CLEAR + 1; y < H - BASE_CLEAR - 1; y++) {
      if (!drivable(edge, y)) continue;
      const score = Math.abs(y - H / 2) + (grid[y][edge] === '=' ? 0 : 1000);
      if (score < best) {
        best = score;
        bestY = y;
      }
    }
    const x = edge === 0 ? BASE_CLEAR + 2 : W - BASE_CLEAR - 3;
    // Clear room for the HQ and a road out to the map edge.
    features.push({ kind: 'rect', terrain: T.Open, x: x - BASE_CLEAR, y: bestY - BASE_CLEAR, w: BASE_CLEAR * 2 + 1, h: BASE_CLEAR * 2 + 1 });
    features.push({ kind: 'rect', terrain: T.Road, x: Math.min(edge, x), y: bestY, w: Math.abs(x - edge) + 1, h: 1 });
    for (let y = bestY - BASE_CLEAR; y <= bestY + BASE_CLEAR; y++) {
      for (let xx = x - BASE_CLEAR; xx <= x + BASE_CLEAR; xx++) if (y >= 0 && y < H && xx >= 0 && xx < W) grid[y][xx] = '.';
    }
    for (let xx = Math.min(edge, x); xx <= Math.max(edge, x); xx++) grid[bestY][xx] = '=';
    return { x, y: bestY };
  });

  // Driving distance (in tiles) from each base.
  const distanceFrom = (from: Cell): Float32Array => {
    const d = new Float32Array(W * H).fill(Infinity);
    const queue = [from];
    d[from.y * W + from.x] = 0;
    for (let head = 0; head < queue.length; head++) {
      const { x, y } = queue[head];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!drivable(nx, ny) || d[ny * W + nx] !== Infinity) continue;
        d[ny * W + nx] = d[y * W + x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }
    return d;
  };
  const dA = distanceFrom(bases[0]);
  const dB = distanceFrom(bases[1]);

  const around = (c: Cell, r: number, test: (ch: string) => boolean) => {
    let n = 0;
    for (let y = c.y - r; y <= c.y + r; y++) for (let x = c.x - r; x <= c.x + r; x++) if (y >= 0 && y < H && x >= 0 && x < W && test(grid[y][x])) n++;
    return n;
  };
  const houses = (c: Cell) => around(c, 6, (ch) => ch === '#');
  const bridge = (c: Cell) => (grid[c.y][c.x] === '=' && around(c, 1, (ch) => ch === '~') > 0 ? 1 : 0);
  const chosen: Cell[] = [...bases];
  const spacing = (c: Cell, min: number) => chosen.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= min);

  // Room to fight around a point: most of the 5×5 block around it must be drivable (no islands or slivers).
  const roomy = (c: Cell) => around(c, 2, (ch) => !UNDRIVABLE.has(ch)) >= 17;

  const pick = (ok: (c: Cell, a: number, b: number) => boolean, score: (c: Cell) => number, min = 13): Cell | null => {
    let best: Cell | null = null;
    let bestScore = -Infinity;
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const a = dA[y * W + x];
        const b = dB[y * W + x];
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        const c = { x, y };
        if (!ok(c, a, b) || !spacing(c, min) || !roomy(c)) continue;
        const s = score(c);
        if (s > bestScore) {
          bestScore = s;
          best = c;
        }
      }
    }
    if (best) chosen.push(best);
    return best;
  };

  const points: MapPointDef[] = [];
  const add = (c: Cell | null, kind: PointKind, name: string) => {
    if (c) points.push({ x: c.x + 0.5, y: c.y + 0.5, kind, name });
  };

  // Victory points. First the heart of the village, equally far from both bases.
  const firstFit = (tols: number[], make: (tol: number) => Cell | null) => {
    for (const tol of tols) {
      const c = make(tol);
      if (c) return c;
    }
    return null;
  };
  const heart = firstFit([2, 4, 8, 14], (tol) => pick((_c, a, b) => Math.abs(a - b) <= tol, (p) => houses(p) + (grid[p.y][p.x] === '=' ? 2 : 0), 16));
  add(heart, 'victory', src.names.victory[0]);
  // Then a river crossing if the map has one (the most even one), else another contested spot away from the first.
  const spread = (p: Cell) => (heart ? Math.hypot(heart.x - p.x, heart.y - p.y) * 0.3 : 0);
  const crossing = src.river
    ? pick((c, a, b) => bridge(c) === 1 && Math.abs(a - b) <= (a + b) * 0.3, (p) => -Math.abs(dA[p.y * W + p.x] - dB[p.y * W + p.x]), 14)
    : null;
  const second = crossing ?? firstFit([3, 6, 10, 16], (tol) => pick((_c, a, b) => Math.abs(a - b) <= tol, (p) => houses(p) + spread(p), 16));
  add(second, 'victory', src.names.victory[1]);
  // The third balances the second: if the second is nearer one side, the third is as much nearer the other.
  const skew = second ? dA[second.y * W + second.x] - dB[second.y * W + second.x] : 0;
  const third = firstFit([2, 4, 8, 14], (tol) => pick((_c, a, b) => Math.abs(a - b + skew) <= tol, (p) => houses(p) + spread(p), 16));
  add(third, 'victory', src.names.victory[2]);

  // Resources: each side gets munitions and fuel at matching distances from its own base.
  (['munitions', 'fuel'] as const).forEach((kind) => {
    const ownShare = (share: number) => (_c: Cell, a: number, b: number) => Math.abs(a / (a + b) - share) < 0.06;
    const score = kind === 'munitions' ? houses : (p: Cell) => around(p, 3, (ch) => ch === '=') - houses(p) * 0.2;
    const west = pick(ownShare(0.3), score);
    if (!west) return;
    const target = dA[west.y * W + west.x];
    const east = pick((_c, a, b) => Math.abs(b - target) <= 2 && a > b, score) ?? pick(ownShare(0.7), score);
    add(west, kind, src.names[kind][0]);
    add(east, kind, src.names[kind][1]);
  });

  return { id: src.id, name: src.name, description: src.description, width: W, height: H, bases: [bases[0], bases[1]], points, features };
}

const SOURCES: LuzonMapSource[] = [
  {
    id: 'calumpit',
    name: 'Calumpit',
    description: 'A river town on the Pampanga, two bridges over a winding river, paddies all around. Whoever holds the crossings holds the road to Bataan.',
    rows: CALUMPIT_ROWS,
    river: true,
    names: {
      victory: ['Poblacion', 'Calumpit Bridge', 'Barrio San Jose'],
      munitions: ['Bodega', 'Rice Mill'],
      fuel: ['Motor Pool', 'Gasolinahan'],
    },
  },
];

export const LUZON_MAPS: readonly MapDef[] = SOURCES.map(build);
