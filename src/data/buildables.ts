import { T } from './terrain';
import type { BuildableDef } from './types';

const LIST: BuildableDef[] = [
  {
    id: 'sandbags', name: 'Sandbags', hotkey: 'Z',
    description: 'A wall of sandbags: heavy cover for anyone behind it. Bullets cannot hurt it; explosives wear it down and tanks can crush it.',
    cost: { manpower: 10, munitions: 0, fuel: 0 }, buildTime: 2, shape: 'line', terrain: T.Sandbag, maxLength: 8,
    hp: 600, blastResist: 1,
  },
  {
    id: 'wire', name: 'Barbed Wire', hotkey: 'X',
    description: 'Stops infantry in their tracks and funnels them into your guns. Tanks roll straight over it; explosions blow gaps in it.',
    cost: { manpower: 6, munitions: 0, fuel: 0 }, buildTime: 1.5, shape: 'line', terrain: T.Wire, maxLength: 10,
    hp: 160, blastResist: 1,
  },
  {
    id: 'tanktrap', name: 'Tank Traps', hotkey: 'C',
    description: 'Steel hedgehogs that no tank can cross. Infantry walk through and use them as light cover.',
    cost: { manpower: 15, munitions: 0, fuel: 0 }, buildTime: 3, shape: 'line', terrain: T.TankTrap, maxLength: 6,
    hp: 1000, blastResist: 0.5,
  },
  {
    id: 'mine', name: 'Mine', hotkey: 'V',
    description: 'A buried mine the enemy cannot see. Wrecks tanks and maims infantry that step on it.',
    cost: { manpower: 0, munitions: 25, fuel: 0 }, buildTime: 6, shape: 'point', terrain: null, maxLength: 1,
    hp: 0, blastResist: 0,
  },
];

export const BUILDABLES: Readonly<Record<string, BuildableDef>> = Object.fromEntries(LIST.map((b) => [b.id, b]));
export const BUILDABLE_IDS = LIST.map((b) => b.id);

/** The defense a terrain tile is, if any (map-made sandbags count too). */
export const DEFENSE_BY_TERRAIN: ReadonlyMap<number, BuildableDef> = new Map(LIST.filter((b) => b.terrain !== null).map((b) => [b.terrain!, b]));
