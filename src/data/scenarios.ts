import { CAMPAIGN_PARTS } from './campaign';
import { AT, MG, MO, R, ROUTE3_GARRISON, ROUTE3_START, SAMAT_DEFENDERS, SAMAT_SPAWNS, TK, at, wave } from './scenarioKit';
import type { ScenarioDef } from './types';

// ─── Theater of War ────────────────────────────────────────────────

export const THEATER: readonly ScenarioDef[] = [
  {
    id: 'tow-city',
    name: 'Defend the City',
    tagline: 'Hold the Plaza de Roma inside the walls of Intramuros against eight waves.',
    date: 'Scenario',
    location: 'Intramuros, Manila',
    briefing: [
      'The old walled city of Intramuros guards the heart of Manila. Its stone ramparts have stood for centuries; tonight they must stand again.',
      'The enemy will storm the landward gates at once: from the north, the north-west and the west. Every wave is stronger than the last. The bay guards your back and Fort Santiago holds your headquarters.',
      'The streets are narrow and the walls cannot be climbed. Cover the gates with your machine guns, keep a reserve at the plaza, and do not let the Plaza de Roma fall.',
    ],
    map: 'intramuros',
    mode: 'defense',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 560, munitions: 90, fuel: 50 },
    playerUnits: [
      at('us_riflemen', 28, 44, -90),
      at('us_riflemen', 38, 44, -90),
      at('us_hmg', 33, 41, -90, true),
    ],
    owners: { 0: 0, 1: 0, 2: 0, 4: 0, 3: 1 },
    defense: {
      hold: [0],
      prepTime: 75,
      spawns: [
        { x: 43, y: 1 },
        { x: 1, y: 18 },
        { x: 1, y: 45 },
      ],
      waves: [
        wave(0, R, R),
        wave(70, R, R, R),
        wave(70, R, R, MG),
        wave(75, R, R, R, AT),
        wave(75, R, R, MO, TK),
        wave(80, R, R, R, R, MG),
        wave(80, R, R, R, TK, MO),
        wave(85, R, R, R, R, TK, AT, MG),
      ],
    },
  },
  {
    id: 'tow-summit',
    name: 'Hold the Summit',
    tagline: 'Defend a hilltop against eight assault waves.',
    date: 'Scenario',
    location: 'Mount Samat, Bataan',
    briefing: [
      'The summit is the last good observation post on the line. Whoever holds it sees every approach.',
      'The enemy will come in waves by three routes: down the north road, across the western fields and out of the jungle to the south-east. Each wave is stronger than the last.',
      'Use the sixty seconds before the first wave to reinforce, set up your machine gun arcs and bring a mortar forward.',
    ],
    map: 'mount-samat',
    mode: 'defense',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 520, munitions: 80, fuel: 40 },
    playerUnits: SAMAT_DEFENDERS,
    owners: { 0: 0, 1: 0, 2: 0 },
    defense: {
      hold: [0],
      prepTime: 60,
      spawns: SAMAT_SPAWNS,
      waves: [
        wave(0, R, R),
        wave(70, R, R, MG),
        wave(70, R, R, R, AT),
        wave(75, R, R, MO, TK),
        wave(75, R, R, R, MG, AT),
        wave(80, R, R, R, TK, MO),
        wave(80, R, R, R, R, TK, AT),
        wave(85, R, R, R, R, TK, TK, MG),
      ],
    },
  },
  {
    id: 'tow-highway',
    name: 'Highway 3 Assault',
    tagline: 'Break four fortified positions along the highway before time runs out.',
    date: 'Scenario',
    location: 'Route 3, Central Luzon',
    briefing: [
      'The enemy has fortified every town on the highway: machine guns covering the road, anti-tank guns in the villages, armour held in reserve.',
      'Take the sectors in order. Each captured sector moves your reinforcement point forward and buys you three more minutes.',
      'Flank the machine gun nests through the paddies and hedgerows. Driving straight down the road is how you lose a platoon.',
    ],
    map: 'route-3',
    mode: 'offensive',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 620, munitions: 90, fuel: 80 },
    playerUnits: ROUTE3_START,
    enemyUnits: ROUTE3_GARRISON,
    owners: { 0: 1, 1: 1, 2: 1, 3: 1 },
    offensive: {
      sectors: [0, 1, 2, 3],
      timeLimit: 900,
      bonusTime: 180,
      counterattackEvery: 150,
      counterattack: [R, R],
    },
  },
  {
    id: 'tow-luzon',
    name: 'Battle for Luzon',
    tagline: 'A full battle on historical ground. Choose how it is won.',
    date: 'December 1941',
    location: 'Central Luzon',
    briefing: [
      'December 1941. Enemy columns are pushing south from the Lingayen beaches, and every crossroads on the plain is contested.',
      'Build your company, take the ground and break the enemy on your terms: hold the victory points, annihilate them, or fight with no limit at all.',
    ],
    map: 'san-fernando',
    mode: 'skirmish',
    win: 'points',
    factions: ['usaffe', 'ija'],
  },
];

export const SCENARIOS: Readonly<Record<string, ScenarioDef>> = Object.fromEntries(
  [...THEATER, ...CAMPAIGN_PARTS].map((s) => [s.id, s]),
);
