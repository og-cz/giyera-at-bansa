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
  {
    id: 'mg_nest', name: 'MG Nest', hotkey: 'B',
    description: 'A machine gun behind a ring of sandbags that fires all round at anything in range.',
    cost: { manpower: 90, munitions: 35, fuel: 0 }, buildTime: 20, shape: 'structure', unit: 'mg_nest', terrain: null, maxLength: 1,
    hp: 0, blastResist: 0,
  },
  {
    id: 'bunker', name: 'Bunker', hotkey: 'N',
    description: 'A sturdy bunker with a machine gun. Squads nearby can reinforce and pick up upgrades there.',
    cost: { manpower: 220, munitions: 0, fuel: 0 }, buildTime: 35, shape: 'structure', unit: 'bunker', terrain: null, maxLength: 1,
    hp: 0, blastResist: 0,
  },
  {
    id: 'aid_tent', name: 'Aid Tent', hotkey: 'M',
    description: 'Heals friendly soldiers nearby while they are out of combat.',
    cost: { manpower: 150, munitions: 0, fuel: 0 }, buildTime: 25, shape: 'structure', unit: 'aid_tent', terrain: null, maxLength: 1,
    hp: 0, blastResist: 0,
  },
];

export const BUILDABLES: Readonly<Record<string, BuildableDef>> = Object.fromEntries(LIST.map((b) => [b.id, b]));
export const BUILDABLE_IDS = LIST.map((b) => b.id);

/** The defense a terrain tile is, if any (map-made sandbags count too). */
export const DEFENSE_BY_TERRAIN: ReadonlyMap<number, BuildableDef> = new Map(LIST.filter((b) => b.terrain !== null).map((b) => [b.terrain!, b]));
