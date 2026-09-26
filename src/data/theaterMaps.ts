import { circle, line, MAPS, rect, scatter } from './maps';
import { T } from './terrain';
import type { MapDef } from './types';

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

export const THEATER_MAPS: Readonly<Record<string, MapDef>> = { [SAMAT.id]: SAMAT, [ROUTE3.id]: ROUTE3 };

/** Every map, skirmish and scenario, by id. */
export const ALL_MAPS: Readonly<Record<string, MapDef>> = { ...MAPS, ...THEATER_MAPS };
