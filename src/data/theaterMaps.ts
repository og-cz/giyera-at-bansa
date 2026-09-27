import { circle, line, MAPS, rect, scatter } from './maps';
import { T } from './terrain';
import type { MapDef, MapFeature } from './types';

/**
 * Asymmetric maps for Theater of War and Campaign scenarios. Unlike skirmish
 * maps they are not mirrored: one side attacks, the other defends.
 */

// ─── Mount Samat: hold the summit against waves from the north ─────
const SAMAT: MapDef = {
  id: 'mount-samat',
  name: 'Mount Samat',
  description: 'A scarred hilltop above the Pilar–Bagac road. Three approaches converge on the summit.',
  width: 80,
  height: 70,
  bases: [
    { x: 40, y: 64 },
    { x: 40, y: 5 },
  ],
  points: [
    { x: 40, y: 30, kind: 'victory', name: 'Samat Summit' },
    { x: 22, y: 46, kind: 'munitions', name: 'Aid Station' },
    { x: 58, y: 46, kind: 'fuel', name: 'Motor Pool' },
    { x: 18, y: 12, kind: 'manpower', name: 'Pilar Trail' },
    { x: 62, y: 12, kind: 'manpower', name: 'Orion Road' },
  ],
  features: [
    circle(T.Jungle, 8, 32, 11),
    circle(T.Jungle, 72, 32, 11),
    circle(T.Jungle, 6, 57, 8),
    circle(T.Jungle, 74, 57, 8),
    circle(T.Jungle, 22, 2, 5),
    circle(T.Jungle, 58, 2, 5),
    rect(T.Paddy, 23, 8, 11, 7),
    rect(T.Paddy, 46, 8, 11, 7),
    line(T.Water, 2, [0, 20], [20, 21.5], [40, 19.5], [60, 21.5], [80, 20]),
    scatter(T.Crater, 28, 13, 24, 15, 24, 5),
    scatter(T.Crater, 30, 34, 20, 8, 8, 6),
    line(T.Hedge, 1, [24, 25], [30, 25]),
    line(T.Hedge, 1, [50, 25], [56, 25]),
    line(T.Hedge, 1, [14, 40], [28, 40]),
    line(T.Hedge, 1, [52, 40], [66, 40]),
    // Summit ring and forward trenches
    line(T.Sandbag, 1, [34, 26.5], [37, 24.5], [43, 24.5], [46, 26.5]),
    line(T.Sandbag, 1, [33, 28], [33, 33]),
    line(T.Sandbag, 1, [47, 28], [47, 33]),
    line(T.Sandbag, 1, [29, 23.5], [34, 23.5]),
    line(T.Sandbag, 1, [46, 23.5], [51, 23.5]),
    line(T.Sandbag, 1, [30, 50], [36, 50]),
    line(T.Sandbag, 1, [44, 50], [50, 50]),
    line(T.Wall, 1, [36, 35], [38, 36]),
    rect(T.Building, 42, 33, 2, 2),
    rect(T.Building, 19, 48, 3, 2),
    rect(T.Building, 58, 48, 3, 2),
    rect(T.Building, 14, 15, 2, 2),
    rect(T.Building, 64, 15, 2, 2),
    line(T.Road, 1, [40, 64], [36, 54], [44, 42], [40, 31]),
    line(T.Road, 1, [40, 29], [38, 18], [40, 5]),
    line(T.Road, 1, [12, 4], [16, 20], [24, 30], [22, 46], [30, 58], [40, 63]),
    line(T.Road, 1, [68, 4], [64, 20], [56, 30], [58, 46], [50, 58], [40, 63]),
  ],
};

// ─── Route 3: a long highway assault, sector by sector ─────────────
const ROUTE3: MapDef = {
  id: 'route-3',
  name: 'Route 3',
  description: 'The national highway south from Tarlac to the Calumpit bridge, lined with paddies and dug-in defenders.',
  width: 150,
  height: 44,
  bases: [
    { x: 7, y: 22 },
    { x: 143, y: 22 },
  ],
  points: [
    { x: 36, y: 22, kind: 'manpower', name: 'Tarlac' },
    { x: 68, y: 20, kind: 'munitions', name: 'Bamban' },
    { x: 98, y: 21, kind: 'fuel', name: 'San Fernando' },
    { x: 128.5, y: 22, kind: 'victory', name: 'Calumpit Bridge' },
  ],
  features: [
    rect(T.Paddy, 14, 4, 16, 10),
    rect(T.Paddy, 14, 30, 16, 10),
    rect(T.Paddy, 44, 29, 18, 11),
    rect(T.Paddy, 44, 4, 14, 9),
    rect(T.Paddy, 76, 4, 16, 10),
    rect(T.Paddy, 78, 30, 14, 10),
    rect(T.Paddy, 106, 29, 14, 11),
    rect(T.Paddy, 104, 4, 14, 9),
    circle(T.Jungle, 60, 1, 6),
    circle(T.Jungle, 88, 43, 6),
    circle(T.Jungle, 118, 1, 7),
    circle(T.Jungle, 30, 43, 6),
    circle(T.Jungle, 146, 6, 5),
    line(T.Water, 2, [52, 0], [54, 22], [51, 44]),
    line(T.Water, 3, [127, 0], [129, 22], [127, 44]),
    scatter(T.Crater, 20, 15, 105, 14, 40, 9),
    line(T.Hedge, 1, [20, 17], [30, 17]),
    line(T.Hedge, 1, [40, 27], [50, 27]),
    line(T.Hedge, 1, [58, 16], [63, 16]),
    line(T.Hedge, 1, [72, 26], [84, 26]),
    line(T.Hedge, 1, [86, 16], [92, 16]),
    line(T.Hedge, 1, [104, 26], [114, 26]),
    line(T.Hedge, 1, [110, 16], [120, 16]),
    // Enemy positions face west, towards the attacker
    line(T.Sandbag, 1, [32, 19], [32, 25]),
    line(T.Sandbag, 1, [64, 17], [64, 23]),
    line(T.Sandbag, 1, [92, 17], [92, 25]),
    line(T.Sandbag, 1, [131, 17], [131, 27]),
    line(T.Wall, 1, [70, 15], [74, 15]),
    line(T.Wall, 1, [96, 12], [103, 12]),
    rect(T.Building, 38, 16, 3, 3),
    rect(T.Building, 40, 25, 3, 3),
    rect(T.Building, 34, 27, 2, 2),
    rect(T.Building, 70, 23, 3, 3),
    rect(T.Building, 66, 11, 3, 2),
    rect(T.Building, 94, 14, 3, 3),
    rect(T.Building, 100, 14, 3, 3),
    rect(T.Building, 94, 25, 3, 3),
    rect(T.Building, 101, 25, 3, 3),
    rect(T.Building, 106, 17, 3, 3),
    rect(T.Building, 133, 15, 2, 2),
    rect(T.Building, 133, 27, 2, 2),
    line(T.Road, 2, [0, 22], [20, 20], [36, 22], [52, 24], [68, 20], [84, 23], [98, 21], [114, 23], [128, 22], [150, 22]),
  ],
};

// ─── Intramuros: the walled city of Manila ─────────────────────────
// Stone ramparts with four gates, a moat, a street grid of dense blocks and
// the Plaza de Roma at the heart. Defenders hold the north, attackers come
// through the southern, eastern and western gates.

/** Walls run on these lines; streets cross them only at the gates. */
const WALL = { west: 16, east: 74, north: 14, south: 60 };
const STREETS_X = [25, 44, 64];
const STREETS_Y = [25, 37, 50];
const PLAZA = { x: 45, y: 38, r: 6 };
const CHURCH_SQUARE = { x: 49, y: 55, r: 7 };

function cityBlocks(): MapFeature[] {
  const out: MapFeature[] = [];
  const xs = [WALL.west + 2, ...STREETS_X.flatMap((s) => [s - 1, s + 2]), WALL.east - 1];
  const ys = [WALL.north + 2, ...STREETS_Y.flatMap((s) => [s - 1, s + 2]), WALL.south - 1];
  for (let i = 0; i + 1 < xs.length; i += 2) {
    for (let j = 0; j + 1 < ys.length; j += 2) {
      const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[j], ys[j + 1]];
      // Split each block into houses with a one-tile alley between them.
      const w = x1 - x0;
      const cols = w > 10 ? 2 : 1;
      const colW = Math.floor((w - (cols - 1)) / cols);
      for (let c = 0; c < cols; c++) {
        const bx = x0 + c * (colW + 1);
        const cx = bx + colW / 2;
        const cy = (y0 + y1) / 2;
        // Keep the plaza, Fort Santiago and San Agustin's square open.
        if (Math.hypot(cx - PLAZA.x, cy - PLAZA.y) < PLAZA.r + 4) continue;
        if (cx < 25 && cy < 25) continue;
        if (Math.hypot(cx - CHURCH_SQUARE.x, cy - CHURCH_SQUARE.y) < CHURCH_SQUARE.r) continue;
        out.push(rect(T.Building, bx + 0.5, y0 + 0.5, colW - 1, y1 - y0 - 1));
      }
    }
  }
  return out;
}

const INTRAMUROS: MapDef = {
  id: 'intramuros',
  name: 'Intramuros',
  description: 'The walled city of Manila. Stone ramparts, four gates, narrow streets and the Plaza de Roma at its heart.',
  width: 90,
  height: 72,
  bases: [
    { x: 45, y: 4 },
    { x: 45, y: 69 },
  ],
  points: [
    { x: 45, y: 38, kind: 'victory', name: 'Plaza de Roma' },
    { x: 21, y: 20, kind: 'munitions', name: 'Fort Santiago' },
    { x: CHURCH_SQUARE.x, y: CHURCH_SQUARE.y, kind: 'fuel', name: 'San Agustin' },
    { x: 45, y: 62, kind: 'manpower', name: 'Puerta Real' },
    { x: 70, y: 38, kind: 'manpower', name: 'Puerta del Parian' },
  ],
  features: [
    // Parks and fields outside the walls
    circle(T.Jungle, 5, 22, 5),
    circle(T.Jungle, 85, 22, 5),
    circle(T.Jungle, 5, 56, 4),
    circle(T.Jungle, 85, 56, 4),
    scatter(T.Crater, 18, 64, 54, 6, 14, 12),
    // Moat around the walls
    line(T.Water, 2, [12, 11], [78, 11], [78, 64], [12, 64], [12, 11]),
    // Ramparts with corner bastions
    line(T.Rampart, 2, [WALL.west, WALL.north], [WALL.east, WALL.north], [WALL.east, WALL.south], [WALL.west, WALL.south], [WALL.west, WALL.north]),
    circle(T.Rampart, WALL.west, WALL.north, 2.6),
    circle(T.Rampart, WALL.east, WALL.north, 2.6),
    circle(T.Rampart, WALL.west, WALL.south, 2.6),
    circle(T.Rampart, WALL.east, WALL.south, 2.6),
    // Fort Santiago's inner walls and San Agustin church
    line(T.Wall, 1, [18, 17], [24, 17]),
    line(T.Sandbag, 1, [18, 23], [23, 23]),
    ...cityBlocks(),
    rect(T.Building, 55, 53, 6, 5),
    // Barricades around the plaza
    line(T.Sandbag, 1, [40, 33], [43, 33]),
    line(T.Sandbag, 1, [47, 33], [50, 33]),
    line(T.Sandbag, 1, [40, 43], [43, 43]),
    line(T.Sandbag, 1, [47, 43], [50, 43]),
    line(T.Sandbag, 1, [39, 34], [39, 36.5]),
    line(T.Sandbag, 1, [51, 34], [51, 36.5]),
    // Streets: the two main roads pass through the four gates
    rect(T.Road, 44, 0, 2, 72),
    rect(T.Road, 0, 37, 90, 2),
    ...STREETS_X.filter((x) => x !== 44).map((x) => rect(T.Road, x, WALL.north + 2, 2, WALL.south - WALL.north - 3)),
    ...STREETS_Y.filter((y) => y !== 37).map((y) => rect(T.Road, WALL.west + 2, y, WALL.east - WALL.west - 3, 2)),
  ],
};

export const THEATER_MAPS: Readonly<Record<string, MapDef>> = { [SAMAT.id]: SAMAT, [ROUTE3.id]: ROUTE3, [INTRAMUROS.id]: INTRAMUROS };

/** Every map, skirmish and scenario, by id. */
export const ALL_MAPS: Readonly<Record<string, MapDef>> = { ...MAPS, ...THEATER_MAPS };
