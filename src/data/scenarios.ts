import type { PlacedUnit, ScenarioDef, WaveDef } from './types';

const R = 'ija_riflemen';
const MG = 'ija_hmg';
const MO = 'ija_mortar';
const AT = 'ija_at';
const TK = 'ija_chiha';

const wave = (delay: number, ...units: string[]): WaveDef => ({ delay, units });
const at = (unitId: string, x: number, y: number, facing?: number, deployed?: boolean): PlacedUnit => ({ unitId, x, y, facing, deployed });

// ─── Shared layouts ────────────────────────────────────────────────

const SAMAT_SPAWNS = [
  { x: 12, y: 4 },
  { x: 40, y: 10 },
  { x: 68, y: 4 },
];

const SAMAT_DEFENDERS: PlacedUnit[] = [
  at('us_riflemen', 36, 33, -90),
  at('us_riflemen', 44, 33, -90),
  at('us_hmg', 40, 27, -90, true),
];

const ROUTE3_GARRISON: PlacedUnit[] = [
  // Tarlac
  at(R, 38, 21, 180), at(R, 37, 26, 180), at(MG, 34, 21, 180, true),
  // Bamban
  at(R, 70, 19, 180), at(R, 68, 24, 180), at(MG, 66, 20, 180, true), at(AT, 72, 21, 180),
  // San Fernando
  at(R, 97, 19, 180), at(R, 99, 23, 180), at(MG, 94, 21, 180, true), at(MO, 108, 22, 180, true), at(TK, 104, 22, 180),
  // Calumpit bridge
  at(R, 133, 21, 180), at(R, 133, 24, 180), at(R, 135, 19, 180),
  at(MG, 132, 17.5, 180, true), at(MG, 132, 26.5, 180, true), at(AT, 136, 22, 180), at(TK, 139, 22, 180),
];

const ROUTE3_START: PlacedUnit[] = [
  at('us_riflemen', 11, 20, 0),
  at('us_riflemen', 11, 24, 0),
  at('us_hmg', 13, 22, 0),
];

// ─── Theater of War ────────────────────────────────────────────────

export const THEATER: readonly ScenarioDef[] = [
  {
    id: 'tow-summit',
    name: 'Hold the Summit',
    tagline: 'Defend a hilltop against eight assault waves.',
    date: 'Scenario',
    location: 'Mount Samat, Bataan',
    briefing: [
      'The summit is the last good observation post on the line. Whoever holds it sees every approach.',
      'The enemy will come in waves up three lanes: the western trail, the central road and the eastern road. Each wave is stronger than the last.',
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
    id: 'tow-barrio',
    name: 'Defend the Barrio',
    tagline: 'Hold the crossroads village against seven waves.',
    date: 'Scenario',
    location: 'Bataan Crossroads',
    briefing: [
      'The crossroads barrio controls every road on this front. Lose it and the line folds.',
      'Enemy waves will push from the east along the road and through the paddies to the north and south.',
      'You hold the supply barn and the sugar central, so your income is secure — as long as the crossroads stands.',
    ],
    map: 'bataan',
    mode: 'defense',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 500, munitions: 70, fuel: 40 },
    playerUnits: [
      at('us_riflemen', 46, 33, 0),
      at('us_riflemen', 46, 38, 0),
      at('us_hmg', 48, 35.5, 0, true),
    ],
    owners: { 0: 0, 3: 0, 6: 0, 4: 1, 5: 1 },
    defense: {
      hold: [0],
      prepTime: 60,
      spawns: [
        { x: 88, y: 20 },
        { x: 90, y: 35 },
        { x: 88, y: 50 },
      ],
      waves: [
        wave(0, R, R),
        wave(70, R, R, MG),
        wave(70, R, R, R, AT),
        wave(75, R, R, MO, TK),
        wave(80, R, R, R, MG, AT),
        wave(80, R, R, R, R, TK, MO),
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
];

// ─── Campaign: the defence and liberation of Luzon ─────────────────

export const CAMPAIGN: readonly ScenarioDef[] = [
  {
    id: 'c1-withdrawal',
    name: 'Withdrawal to Bataan',
    tagline: 'Win the fight for the crossroads while the army falls back.',
    date: 'December 1941',
    location: 'Central Luzon',
    briefing: [
      'On 22 December 1941 the Japanese 14th Army landed at Lingayen Gulf and drove south towards Manila.',
      'The USAFFE command has ordered a fighting withdrawal into the Bataan peninsula. Every day the roads stay open, more men and supplies reach the new line.',
      'Your company holds a crossroads on the withdrawal route. Take the victory points and bleed the enemy advance.',
    ],
    map: 'bataan',
    mode: 'skirmish',
    factions: ['usaffe', 'ija'],
  },
  {
    id: 'c2-layac',
    name: 'Layac Junction',
    tagline: 'Hold the stone bridge against six waves.',
    date: '6 January 1942',
    location: 'Layac Junction, gateway to Bataan',
    briefing: [
      'The last units are crossing into Bataan. Layac Junction is the door, and your company is holding it open.',
      'The enemy will attack the stone bridge from the south in waves. Hold it until the withdrawal is complete.',
      'Your church and the ammunition dump to the north keep you supplied. Do not let the bridge fall.',
    ],
    map: 'san-roque',
    mode: 'defense',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 520, munitions: 70, fuel: 40 },
    playerUnits: [
      at('us_riflemen', 42, 34, 90),
      at('us_riflemen', 48, 34, 90),
      at('us_hmg', 45, 33.5, 90, true),
    ],
    owners: { 0: 0, 1: 0, 3: 0, 5: 0, 2: 1, 4: 1, 6: 1 },
    defense: {
      hold: [0],
      prepTime: 60,
      spawns: [
        { x: 16, y: 72 },
        { x: 45, y: 64 },
        { x: 74, y: 72 },
      ],
      waves: [
        wave(0, R, R),
        wave(70, R, R, MG),
        wave(70, R, R, R, AT),
        wave(75, R, R, MO, TK),
        wave(80, R, R, R, MG, AT),
        wave(85, R, R, R, R, TK, TK),
      ],
    },
  },
  {
    id: 'c3-samat',
    name: 'Mount Samat',
    tagline: 'Survive the final offensive on Bataan.',
    date: 'April 1942',
    location: 'Mount Samat, Bataan',
    briefing: [
      'After three months of siege the defenders of Bataan are starving and riddled with malaria. On 3 April 1942 the enemy opened its final offensive against Mount Samat.',
      'The summit is the key to the whole line. Hold it against every wave they send.',
      'History says the line broke. Change it.',
    ],
    map: 'mount-samat',
    mode: 'defense',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 480, munitions: 70, fuel: 30 },
    playerUnits: SAMAT_DEFENDERS,
    owners: { 0: 0, 1: 0, 2: 0 },
    defense: {
      hold: [0],
      prepTime: 60,
      spawns: SAMAT_SPAWNS,
      waves: [
        wave(0, R, R, R),
        wave(65, R, R, MG),
        wave(65, R, R, R, AT, MO),
        wave(70, R, R, R, TK),
        wave(70, R, R, R, MG, AT),
        wave(75, R, R, R, R, TK, MO),
        wave(75, R, R, R, R, TK, AT),
        wave(80, R, R, R, R, TK, TK, MG),
        wave(80, R, R, R, R, R, TK, TK, MO),
        wave(85, R, R, R, R, R, R, TK, TK, AT, MG),
      ],
    },
  },
  {
    id: 'c4-return',
    name: 'The Road to Manila',
    tagline: 'Drive down Route 3 and seize the Calumpit bridge.',
    date: 'January 1945',
    location: 'Route 3, Central Luzon',
    briefing: [
      'Three years later, American and Filipino forces have returned. On 9 January 1945 they landed at Lingayen Gulf, where the invasion began.',
      'The road to Manila runs straight down Route 3 through Tarlac, Bamban and San Fernando to the bridge at Calumpit.',
      'Every town is fortified. Take them in order, keep the advance moving, and seize the bridge before the enemy can blow it.',
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
      timeLimit: 960,
      bonusTime: 180,
      counterattackEvery: 130,
      counterattack: [R, R, MG],
    },
  },
];

export const SCENARIOS: Readonly<Record<string, ScenarioDef>> = Object.fromEntries(
  [...THEATER, ...CAMPAIGN].map((s) => [s.id, s]),
);
