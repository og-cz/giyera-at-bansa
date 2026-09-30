import { ALL_MAPS } from './theaterMaps';
import type { DefenseRules, OffensiveRules, Owner, PlacedUnit, ScenarioDef, WaveDef } from './types';

/** Building blocks shared by Theater of War and the campaign. */

export const R = 'ija_riflemen';
export const MG = 'ija_hmg';
export const MO = 'ija_mortar';
export const AT = 'ija_at';
export const TK = 'ija_chiha';

export const wave = (delay: number, ...units: string[]): WaveDef => ({ delay, units });
export const at = (unitId: string, x: number, y: number, facing?: number, deployed?: boolean): PlacedUnit => ({ unitId, x, y, facing, deployed });

// Waves climb the north-west trail, come down the north road and out of the eastern fields.
export const SAMAT_SPAWNS = [
  { x: 60, y: 1 },
  { x: 1, y: 10 },
  { x: 95, y: 52 },
];

export const SAMAT_DEFENDERS: PlacedUnit[] = [
  at('us_riflemen', 42, 26, -90),
  at('us_riflemen', 52, 26, -90),
  at('us_hmg', 47, 24, -90, true),
];

export const ROUTE3_GARRISON: PlacedUnit[] = [
  // Tarlac Road
  at(R, 28, 31, 180), at(R, 28, 37, 180), at(MG, 30, 34, 180, true),
  // Poblacion
  at(R, 42, 38, 180), at(R, 42, 45, 180), at(MG, 44, 41, 180, true), at(AT, 46, 39, 180),
  // Simbahan
  at(R, 63, 39, 180), at(R, 64, 46, 180), at(MG, 66, 43, 180, true), at(MO, 70, 40, 180, true), at(TK, 68, 45, 180),
  // San Fernando Road
  at(R, 83, 48, 180), at(R, 83, 55, 180), at(R, 86, 51, 180),
  at(MG, 85, 47, 180, true), at(MG, 85, 56, 180, true), at(AT, 88, 52, 180), at(TK, 90, 53, 180),
];

export const ROUTE3_START: PlacedUnit[] = [
  at('us_riflemen', 8, 20, 0),
  at('us_riflemen', 8, 28, 0),
  at('us_hmg', 11, 24, 0),
];

type Spot = { x: number; y: number };
const gap = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * A defense on any map, laid out from the map itself: we hold `hold` and
 * everything on our half, the enemy holds the far half, and the waves come
 * from the enemy base and the two enemy points nearest it.
 */
export function holdOn(mapId: string, hold: number[], waves: WaveDef[], prepTime = 70): Pick<ScenarioDef, 'owners' | 'defense'> {
  const map = ALL_MAPS[mapId];
  const [home, away] = map.bases;
  const owners: Record<number, Owner> = {};
  map.points.forEach((p, i) => (owners[i] = gap(p, home) <= gap(p, away) ? 0 : 1));
  for (const i of hold) owners[i] = 0;
  const enemySide = map.points.filter((_, i) => owners[i] === 1).sort((a, b) => gap(a, away) - gap(b, away));
  const spawns = [away, ...enemySide.slice(0, 2)].map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  const defense: DefenseRules = { hold, prepTime, spawns, waves };
  return { owners, defense };
}

/**
 * An assault on any map: the enemy holds every sector, dug in around each one
 * facing the way we come from; later sectors are held more strongly.
 */
export function assault(
  mapId: string,
  sectors: number[],
  rules: Omit<OffensiveRules, 'sectors'>,
): Pick<ScenarioDef, 'owners' | 'offensive' | 'enemyUnits'> {
  const map = ALL_MAPS[mapId];
  const [home, away] = map.bases;
  const owners: Record<number, Owner> = {};
  map.points.forEach((p, i) => {
    if (sectors.includes(i)) owners[i] = 1;
    else if (gap(p, home) < gap(p, away)) owners[i] = 0;
  });
  const enemyUnits: PlacedUnit[] = [];
  let from: Spot = home;
  sectors.forEach((idx, k) => {
    const p = map.points[idx];
    const len = Math.max(1, gap(p, from));
    const ux = (from.x - p.x) / len;
    const uy = (from.y - p.y) / len;
    const facing = Math.round((Math.atan2(uy, ux) * 180) / Math.PI);
    // Riflemen either side of the point, a machine gun in front of it.
    enemyUnits.push(at(R, p.x - uy * 3, p.y + ux * 3, facing), at(R, p.x + uy * 3, p.y - ux * 3, facing), at(MG, p.x + ux * 2, p.y + uy * 2, facing, true));
    if (k >= 1) enemyUnits.push(at(AT, p.x - ux * 2, p.y - uy * 2, facing));
    if (k >= 2) enemyUnits.push(at(MO, p.x - ux * 5, p.y - uy * 5, facing, true));
    if (k === sectors.length - 1) enemyUnits.push(at(TK, p.x - ux * 4 + uy * 2, p.y - uy * 4 - ux * 2, facing), at(R, p.x - ux * 3, p.y - uy * 3, facing));
    from = p;
  });
  return { owners, enemyUnits, offensive: { sectors, ...rules } };
}
