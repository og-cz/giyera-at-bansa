import { Rng } from '../core/rng';
import { decodeGridRow, encodeGridRow } from './gridCodec';
import { CALUMPIT_ROWS } from './luzon/calumpit';
import { ABUCAY_ROWS } from './luzon/abucay';
import { BALIUAG_ROWS } from './luzon/baliuag';
import { DINALUPIHAN_ROWS } from './luzon/dinalupihan';
import { GUAGUA_ROWS } from './luzon/guagua';
import { HERMOSA_ROWS } from './luzon/hermosa';
import { LINGAYEN_ROWS } from './luzon/lingayen';
import { LUBAO_ROWS } from './luzon/lubao';
import { ORANI_ROWS } from './luzon/orani';
import { PILAR_ROWS } from './luzon/pilar';
import { PLARIDEL_ROWS } from './luzon/plaridel';
import { PORAC_ROWS } from './luzon/porac';
import { SAN_FERNANDO_ROWS } from './luzon/san-fernando';
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
  /** Name for a victory point on a bridge, used when a bridge is fair to both sides. */
  bridge?: string;
  names: { victory: readonly [string, string, string]; munitions: readonly [string, string]; fuel: readonly [string, string] };
}

/** Tiles tanks cannot cross: water, buildings, jungle, walls. */
const UNDRIVABLE = new Set(['~', '#', 'j', 'w', 'r']);
/** Half-size of the open ground cleared around each HQ. */
const BASE_CLEAR = 4;

type Cell = { x: number; y: number };

/** Decodes a grid and widens roads that only touch corner to corner (see below). */
function prepareGrid(rows: readonly string[]): string[][] {
  const grid = rows.map(decodeGridRow);
  const H = grid.length;
  const W = grid[0].length;
  const drivable = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !UNDRIVABLE.has(grid[y][x]);
  // Units never squeeze diagonally between two blocked tiles, so a road (or bridge) that only
  // touches corner to corner would be a dead end. Widen it at every such step.
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] !== '=') continue;
      for (const dx of [-1, 1]) {
        const nx = x + dx;
        if (nx < 0 || nx >= W || grid[y + 1][nx] !== '=') continue;
        if (!drivable(nx, y) && !drivable(x, y + 1)) grid[y + 1][x] = '=';
      }
    }
  }
  return grid;
}

/** Ground where shells and field works can go. */
const SOFT_GROUND = new Set(['.', ',', 'h']);

/**
 * Turns a peaceful village into a battlefield: hedgerows between the paddies,
 * ruined houses, shell craters thickest along the front between the two bases,
 * and short sandbag lines dug in on the approaches to every capture point.
 * Seeded by the map id, so a map always looks the same.
 */
function dressBattlefield(grid: string[][], id: string, bases: readonly Cell[], points: readonly Cell[]): void {
  const H = grid.length;
  const W = grid[0].length;
  let seed = 7;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rng = new Rng(seed);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? grid[y][x] : '');
  const nearBase = (x: number, y: number, r: number) => bases.some((b) => Math.abs(b.x - x) <= r && Math.abs(b.y - y) <= r);

  // Hedgerows on the open strips between paddies.
  const hedges: Cell[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y) !== '.') continue;
      const between = (at(x - 1, y) === ',' && at(x + 1, y) === ',') || (at(x, y - 1) === ',' && at(x, y + 1) === ',');
      if (between && rng.next() < 0.75) hedges.push({ x, y });
    }
  }
  for (const c of hedges) grid[c.y][c.x] = 'h';

  // Ruins: some house edges are only broken walls now.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y) !== '#') continue;
      const inner = ['#', 'w'].filter((k) => k === at(x - 1, y)).length + ['#', 'w'].filter((k) => k === at(x + 1, y)).length + ['#', 'w'].filter((k) => k === at(x, y - 1)).length + ['#', 'w'].filter((k) => k === at(x, y + 1)).length;
      if (inner <= 2 && rng.next() < 0.14) grid[y][x] = 'w';
    }
  }

  // Shell craters in barrages: clusters of hits, thickest halfway between the bases.
  const mid = { x: (bases[0].x + bases[1].x) / 2, y: (bases[0].y + bases[1].y) / 2 };
  const span = Math.max(12, Math.hypot(bases[0].x - bases[1].x, bases[0].y - bases[1].y) * 0.3);
  const barrages = Math.round((W * H) / 520);
  for (let n = 0, tries = 0; n < barrages && tries < barrages * 40; tries++) {
    const x = Math.floor(rng.next() * W);
    const y = Math.floor(rng.next() * H);
    if (nearBase(x, y, 8)) continue;
    const d = Math.hypot(x - mid.x, y - mid.y) / span;
    if (rng.next() > 0.15 + 0.85 * Math.exp(-d * d)) continue;
    n++;
    const hits = 4 + Math.floor(rng.next() * 5);
    for (let h = 0; h < hits; h++) {
      const a = rng.next() * Math.PI * 2;
      const r = rng.next() * 3.5;
      const cx = Math.round(x + Math.cos(a) * r);
      const cy = Math.round(y + Math.sin(a) * r);
      if (SOFT_GROUND.has(at(cx, cy)) && !nearBase(cx, cy, 6)) grid[cy][cx] = 'c';
    }
  }

  // Sandbags: a short line facing each base, three tiles out from every point.
  for (const p of points) {
    for (const b of bases) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const cx = p.x + ux * 3;
      const cy = p.y + uy * 3;
      for (let k = -1; k <= 1; k++) {
        const x = Math.round(cx - uy * k);
        const y = Math.round(cy + ux * k);
        if (SOFT_GROUND.has(at(x, y)) || at(x, y) === 'c') grid[y][x] = 's';
      }
    }
  }
}

/** Open ground for an HQ. */
function clearBase(grid: string[][], c: Cell): void {
  for (let y = c.y - BASE_CLEAR; y <= c.y + BASE_CLEAR; y++) {
    for (let x = c.x - BASE_CLEAR; x <= c.x + BASE_CLEAR; x++) if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = '.';
  }
}

function build(src: LuzonMapSource): MapDef {
  const grid = prepareGrid(src.rows);
  const H = grid.length;
  const W = grid[0].length;
  const drivable = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !UNDRIVABLE.has(grid[y][x]);

  const around = (c: Cell, r: number, test: (ch: string) => boolean) => {
    let n = 0;
    for (let y = c.y - r; y <= c.y + r; y++) for (let x = c.x - r; x <= c.x + r; x++) if (y >= 0 && y < H && x >= 0 && x < W && test(grid[y][x])) n++;
    return n;
  };

  // Bases: one near the west edge and one near the east edge, on solid land, preferring where a road
  // comes in near the middle. The ground around each HQ is cleared so it has room.
  const landAround = (x: number, y: number) => {
    let n = 0;
    for (let yy = y - BASE_CLEAR; yy <= y + BASE_CLEAR; yy++) {
      for (let xx = x - BASE_CLEAR; xx <= x + BASE_CLEAR; xx++) if (yy >= 0 && yy < H && xx >= 0 && xx < W && grid[yy][xx] !== '~') n++;
    }
    return n;
  };
  // Only the largest drivable area counts, so both HQs can reach each other and every point.
  const region = new Int32Array(W * H).fill(-1);
  let biggest = -1;
  let biggestSize = 0;
  for (let start = 0; start < W * H; start++) {
    if (region[start] !== -1 || !drivable(start % W, Math.floor(start / W))) continue;
    const id = start;
    const stack = [start];
    region[start] = id;
    let size = 0;
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % W;
      const y = Math.floor(i / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!drivable(nx, ny) || region[ny * W + nx] !== -1) continue;
        region[ny * W + nx] = id;
        stack.push(ny * W + nx);
      }
    }
    if (size > biggestSize) {
      biggestSize = size;
      biggest = id;
    }
  }
  const bases = ([0, 1] as const).map((side) => {
    let best: Cell = { x: side === 0 ? BASE_CLEAR + 2 : W - BASE_CLEAR - 3, y: Math.floor(H / 2) };
    let bestScore = Infinity;
    for (let inset = BASE_CLEAR + 2; inset < W / 2 - 12; inset++) {
      const x = side === 0 ? inset : W - 1 - inset;
      for (let y = BASE_CLEAR + 1; y < H - BASE_CLEAR - 1; y++) {
        if (region[y * W + x] !== biggest || landAround(x, y) < (BASE_CLEAR * 2 + 1) ** 2 - 3) continue;
        const road = around({ x, y }, 2, (ch) => ch === '=') > 0;
        const score = inset * 3 + Math.abs(y - H / 2) * 0.6 + (road ? 0 : 12);
        if (score < bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    clearBase(grid, best);
    return best;
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

  const houses = (c: Cell) => around(c, 6, (ch) => ch === '#');
  const bridge = (c: Cell) => (grid[c.y][c.x] === '=' && around(c, 1, (ch) => ch === '~') > 0 ? 1 : 0);
  const chosen: Cell[] = [...bases];
  const spacing = (c: Cell, min: number) => chosen.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= min);

  // Room to fight around a point: most of the 5×5 block around it must be drivable (no islands or slivers).
  const roomy = (c: Cell) => around(c, 2, (ch) => !UNDRIVABLE.has(ch)) >= 17;

  const pick = (ok: (c: Cell, a: number, b: number) => boolean, score: (c: Cell) => number, min = 13): Cell | null => {
    let best: Cell | null = null;
    let bestScore = -Infinity;
    for (let y = 4; y < H - 4; y++) {
      for (let x = 4; x < W - 4; x++) {
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
  // Spread out from the first point, but keep away from the map's edges and corners.
  const spread = (p: Cell) => (heart ? Math.hypot(heart.x - p.x, heart.y - p.y) * 0.3 : 0) - Math.hypot(p.x - W / 2, (p.y - H / 2) * 1.4) * 0.15;
  const crossing = src.bridge
    ? pick((c, a, b) => bridge(c) === 1 && Math.abs(a - b) <= (a + b) * 0.3, (p) => -Math.abs(dA[p.y * W + p.x] - dB[p.y * W + p.x]), 14)
    : null;
  const second =
    crossing ??
    firstFit([3, 6, 10, 16], (tol) => pick((_c, a, b) => Math.abs(a - b) <= tol, (p) => houses(p) + spread(p), 16)) ??
    firstFit([6, 14, 28], (tol) => pick((_c, a, b) => Math.abs(a - b) <= tol, (p) => houses(p) + spread(p), 9));
  add(second, 'victory', crossing && src.bridge ? src.bridge : src.names.victory[1]);
  // The third balances the second: if the second is nearer one side, the third is as much nearer the other.
  const skew = second ? dA[second.y * W + second.x] - dB[second.y * W + second.x] : 0;
  const third =
    firstFit([2, 4, 8, 14, 22, 34], (tol) => pick((_c, a, b) => Math.abs(a - b + skew) <= tol, (p) => houses(p) + spread(p), 16)) ??
    firstFit([4, 10, 20, 40], (tol) => pick((_c, a, b) => Math.abs(a - b) <= tol, (p) => houses(p) + spread(p), 9));
  add(third, 'victory', src.names.victory[2]);

  // Resources: each side gets munitions and fuel at matching distances from its own base.
  (['munitions', 'fuel'] as const).forEach((kind) => {
    const ownShare = (share: number) => (_c: Cell, a: number, b: number) => Math.abs(a / (a + b) - share) < 0.06;
    const score = kind === 'munitions' ? houses : (p: Cell) => around(p, 3, (ch) => ch === '=') - houses(p) * 0.2;
    const west = pick(ownShare(0.3), score);
    if (!west) return;
    const target = dA[west.y * W + west.x];
    const east =
      firstFit([2, 4, 7, 11, 16], (tol) => pick((_c, a, b) => Math.abs(b - target) <= tol && a > b, score)) ??
      firstFit([0.06, 0.1, 0.16, 0.25], (tol) => pick((_c, a, b) => Math.abs(a / (a + b) - 0.7) < tol, score)) ??
      pick((_c, a, b) => a > b, score, 10);
    add(west, kind, src.names[kind][0]);
    add(east, kind, src.names[kind][1]);
  });

  dressBattlefield(grid, src.id, bases, points.map((p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) })));
  const features: MapFeature[] = [{ kind: 'grid', rows: grid.map(encodeGridRow) }];
  return { id: src.id, name: src.name, description: src.description, width: W, height: H, bases: [bases[0], bases[1]], points, features };
}

const SOURCES: LuzonMapSource[] = [
  {
    id: 'calumpit',
    name: 'Calumpit',
    description: 'A river town on the Pampanga, two bridges over a winding river, paddies all around. Whoever holds the crossings holds the road to Bataan.',
    rows: CALUMPIT_ROWS,
    bridge: 'Calumpit Bridge',
    names: {
      victory: ['Poblacion', 'Barrio San Jose', 'Sitio Longos'],
      munitions: ['Bodega', 'Rice Mill'],
      fuel: ['Motor Pool', 'Gasolinahan'],
    },
  },
  {
    id: 'plaridel',
    name: 'Plaridel',
    description: 'A market town at a crossroads on the road north of Manila, ringed by rice paddies. The plaza and the church are the prize.',
    rows: PLARIDEL_ROWS,
    names: {
      victory: ['Plaza', 'Simbahan', 'Barrio Agnaya'],
      munitions: ['Bodega', 'Rice Mill'],
      fuel: ['Motor Pool', 'Gasolinahan'],
    },
  },
  {
    id: 'pilar',
    name: 'Pilar',
    description: 'A quiet barrio on the Bataan line: groves along the river and a single bridge across it.',
    rows: PILAR_ROWS,
    bridge: 'Pilar Bridge',
    names: {
      victory: ['Poblacion', 'Kapilya', 'Sitio Wawa'],
      munitions: ['Kamalig', 'Bodega'],
      fuel: ['Garahe', 'Motor Pool'],
    },
  },
  {
    id: 'orani',
    name: 'Orani',
    description: 'A fishing town where a river meets Manila Bay. The coastal highway runs straight through the market.',
    rows: ORANI_ROWS,
    bridge: 'Orani Bridge',
    names: {
      victory: ['Palengke', 'Munisipyo', 'Pantalan'],
      munitions: ['Bodega', 'Camarin'],
      fuel: ['Gasolinahan', 'Bus Depot'],
    },
  },
  {
    id: 'porac',
    name: 'Porac',
    description: 'A village at the foot of the Zambales mountains, hemmed in by jungle. Few roads, and every tree line hides an ambush.',
    rows: PORAC_ROWS,
    names: {
      victory: ['Poblacion', 'Kapilya', 'Sitio Manibaug'],
      munitions: ['Kamalig', 'Bodega'],
      fuel: ['Motor Pool', 'Garahe'],
    },
  },
  {
    id: 'abucay',
    name: 'Abucay',
    description: 'Houses strung along the Bataan shore, paddies inland and the sea at their backs.',
    rows: ABUCAY_ROWS,
    names: {
      victory: ['Simbahan', 'Poblacion', 'Sitio Bangkal'],
      munitions: ['Bodega', 'Kamalig'],
      fuel: ['Pantalan', 'Gasolinahan'],
    },
  },
  {
    id: 'san-fernando',
    name: 'San Fernando',
    description: 'The capital of Pampanga: a big town of streets, yards and stone houses, taken block by block.',
    rows: SAN_FERNANDO_ROWS,
    names: {
      victory: ['Plaza', 'Munisipyo', 'Estacion'],
      munitions: ['Sugar Central', 'Bodega'],
      fuel: ['Motor Pool', 'Bus Depot'],
    },
  },
  {
    id: 'dinalupihan',
    name: 'Dinalupihan',
    description: 'The gateway to Bataan: a clearing cut into thick jungle at the end of the road.',
    rows: DINALUPIHAN_ROWS,
    names: {
      victory: ['Poblacion', 'Kapilya', 'Sitio Pita'],
      munitions: ['Kamalig', 'Bodega'],
      fuel: ['Garahe', 'Motor Pool'],
    },
  },
  {
    id: 'hermosa',
    name: 'Hermosa',
    description: 'A small barrio on a jungle river. One crossing, heavy cover and little room to manoeuvre.',
    rows: HERMOSA_ROWS,
    bridge: 'Hermosa Bridge',
    names: {
      victory: ['Poblacion', 'Kapilya', 'Sitio Mabiga'],
      munitions: ['Bodega', 'Kamalig'],
      fuel: ['Motor Pool', 'Garahe'],
    },
  },
  {
    id: 'guagua',
    name: 'Guagua',
    description: 'Two rivers meet among the rice fields and the highway crosses both. Hold the crossings.',
    rows: GUAGUA_ROWS,
    bridge: 'Guagua Bridge',
    names: {
      victory: ['Poblacion', 'Simbahan', 'Barrio San Roque'],
      munitions: ['Rice Mill', 'Bodega'],
      fuel: ['Gasolinahan', 'Motor Pool'],
    },
  },
  {
    id: 'lingayen',
    name: 'Lingayen',
    description: 'The gulf town where the landings came ashore: close-packed streets between the beach and the highway.',
    rows: LINGAYEN_ROWS,
    names: {
      victory: ['Plaza', 'Capitolio', 'Barrio Libsong'],
      munitions: ['Bodega', 'Camarin'],
      fuel: ['Pantalan', 'Gasolinahan'],
    },
  },
  {
    id: 'baliuag',
    name: 'Baliuag',
    description: 'A crowded river town at a crossroads, the Angat flowing through its heart.',
    rows: BALIUAG_ROWS,
    bridge: 'Baliuag Bridge',
    names: {
      victory: ['Palengke', 'Simbahan', 'Barrio Santa Cruz'],
      munitions: ['Bodega', 'Rice Mill'],
      fuel: ['Bus Depot', 'Gasolinahan'],
    },
  },
  {
    id: 'lubao',
    name: 'Lubao',
    description: 'Open sugar and rice country along the highway. Long sight lines and very little cover.',
    rows: LUBAO_ROWS,
    names: {
      victory: ['Hacienda', 'Kapilya', 'Sitio Santa Maria'],
      munitions: ['Sugar Central', 'Kamalig'],
      fuel: ['Motor Pool', 'Gasolinahan'],
    },
  },
];

export const LUZON_MAPS: readonly MapDef[] = SOURCES.map(build);

/** A mission map: a converted grid with hand-placed bases and points (tile coordinates). */
export interface MissionMapSource {
  id: string;
  name: string;
  description: string;
  rows: readonly string[];
  bases: readonly [Cell, Cell];
  points: readonly MapPointDef[];
  /** Ground cut into the grid, such as a gate through a wall. */
  carve?: readonly { x: number; y: number; w: number; h: number; tile: string }[];
}

/**
 * Builds a mission map. Bases are cleared for their HQs, and each point is moved
 * to the nearest spot tanks can reach from the first base, so none ends up inside
 * a house or on the wrong side of a wall.
 */
export function missionMap(src: MissionMapSource): MapDef {
  const grid = prepareGrid(src.rows);
  const H = grid.length;
  const W = grid[0].length;
  for (const c of src.carve ?? []) {
    for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = c.tile;
  }
  for (const b of src.bases) clearBase(grid, b);
  const drivable = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !UNDRIVABLE.has(grid[y][x]);
  const reach = new Uint8Array(W * H);
  const queue: Cell[] = [src.bases[0]];
  reach[src.bases[0].y * W + src.bases[0].x] = 1;
  for (let head = 0; head < queue.length; head++) {
    const { x, y } = queue[head];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!drivable(nx, ny) || reach[ny * W + nx]) continue;
      reach[ny * W + nx] = 1;
      queue.push({ x: nx, y: ny });
    }
  }
  const snap = (p: MapPointDef): MapPointDef => {
    let best = { x: Math.floor(p.x), y: Math.floor(p.y) };
    let bestD = Infinity;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!reach[y * W + x]) continue;
        const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
    }
    return { ...p, x: best.x + 0.5, y: best.y + 0.5 };
  };
  const points = src.points.map(snap);
  dressBattlefield(grid, src.id, src.bases, points.map((p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) })));
  return {
    id: src.id,
    name: src.name,
    description: src.description,
    width: W,
    height: H,
    bases: [src.bases[0], src.bases[1]],
    points,
    features: [{ kind: 'grid', rows: grid.map(encodeGridRow) }],
  };
}
