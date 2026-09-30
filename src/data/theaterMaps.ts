import { INTRAMUROS_ROWS } from './luzon/intramuros';
import { LAYAC_ROWS } from './luzon/layac';
import { SAMAT_ROWS } from './luzon/mount-samat';
import { ROUTE3_ROWS } from './luzon/route-3';
import { missionMap } from './luzonMaps';
import { MAPS } from './maps';
import type { MapDef } from './types';

/**
 * Maps for Theater of War and Campaign missions, converted from Watabou's
 * generators. Unlike skirmish maps they are not balanced: one side attacks,
 * the other defends, and points are placed for the mission (tile coordinates).
 */

// Hold the barrio on the summit against waves from the north and east.
const SAMAT = missionMap({
  id: 'mount-samat',
  name: 'Mount Samat',
  description: 'A hilltop barrio above the Pilar–Bagac road, ringed by jungle. Four roads converge on the summit.',
  rows: SAMAT_ROWS,
  bases: [
    { x: 30, y: 60 },
    { x: 30, y: 4 },
  ],
  points: [
    { x: 47, y: 30, kind: 'victory', name: 'Samat Summit' },
    { x: 34, y: 44, kind: 'munitions', name: 'Aid Station' },
    { x: 58, y: 46, kind: 'fuel', name: 'Motor Pool' },
    { x: 12, y: 20, kind: 'manpower', name: 'Pilar Trail' },
    { x: 76, y: 57, kind: 'manpower', name: 'Orion Road' },
  ],
});

// Push down the highway through a farm town, sector by sector, west to east.
const ROUTE3 = missionMap({
  id: 'route-3',
  name: 'Route 3',
  description: 'The national highway through a town in the rice country, lined with paddies and dug-in defenders.',
  rows: ROUTE3_ROWS,
  bases: [
    { x: 6, y: 24 },
    { x: 89, y: 60 },
  ],
  points: [
    { x: 25, y: 34, kind: 'manpower', name: 'Tarlac Road' },
    { x: 40, y: 41, kind: 'munitions', name: 'Poblacion' },
    { x: 62, y: 42, kind: 'fuel', name: 'Simbahan' },
    { x: 82, y: 51, kind: 'victory', name: 'San Fernando Road' },
  ],
});

// The walled city: hold the plaza while the enemy storms the gates.
const INTRAMUROS = missionMap({
  id: 'intramuros',
  name: 'Intramuros',
  description: 'The walled city of Manila on the bay. Stone ramparts, gates on the landward side, Fort Santiago in the south wall and the Plaza de Roma at its heart.',
  rows: INTRAMUROS_ROWS,
  bases: [
    { x: 33, y: 80 },
    { x: 86, y: 5 },
  ],
  // A gate from Fort Santiago into the city.
  carve: [{ x: 34, y: 62, w: 3, h: 13, tile: '=' }],
  points: [
    { x: 30, y: 50, kind: 'victory', name: 'Plaza de Roma' },
    { x: 35, y: 70, kind: 'munitions', name: 'Fort Santiago' },
    { x: 64, y: 57, kind: 'fuel', name: 'San Agustin' },
    { x: 43, y: 3, kind: 'manpower', name: 'Puerta Real' },
    { x: 5, y: 45, kind: 'manpower', name: 'Puerta del Parian' },
  ],
});

// Hold the bridge on the road into Bataan.
const LAYAC = missionMap({
  id: 'layac',
  name: 'Layac Junction',
  description: 'The last bridge on the road into Bataan, where the highway crosses a wide bend of the river. Jungle on both banks.',
  rows: LAYAC_ROWS,
  bases: [
    { x: 6, y: 62 },
    { x: 88, y: 8 },
  ],
  points: [
    { x: 37, y: 39, kind: 'victory', name: 'Layac Bridge' },
    { x: 22, y: 44, kind: 'munitions', name: 'Barrio Layac' },
    { x: 53, y: 30, kind: 'fuel', name: 'Junction Town' },
    { x: 14, y: 54, kind: 'manpower', name: 'Dinalupihan Road' },
    { x: 66, y: 50, kind: 'manpower', name: 'Hermosa Fields' },
  ],
});

export const THEATER_MAPS: Readonly<Record<string, MapDef>> = {
  [SAMAT.id]: SAMAT,
  [ROUTE3.id]: ROUTE3,
  [INTRAMUROS.id]: INTRAMUROS,
  [LAYAC.id]: LAYAC,
};

/** Every map, skirmish and scenario, by id. */
export const ALL_MAPS: Readonly<Record<string, MapDef>> = { ...MAPS, ...THEATER_MAPS };
