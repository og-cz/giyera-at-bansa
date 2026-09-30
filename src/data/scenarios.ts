import type { PlacedUnit, ScenarioDef, WaveDef } from './types';

const R = 'ija_riflemen';
const MG = 'ija_hmg';
const MO = 'ija_mortar';
const AT = 'ija_at';
const TK = 'ija_chiha';

const wave = (delay: number, ...units: string[]): WaveDef => ({ delay, units });
const at = (unitId: string, x: number, y: number, facing?: number, deployed?: boolean): PlacedUnit => ({ unitId, x, y, facing, deployed });

// ─── Shared layouts ────────────────────────────────────────────────

// Waves climb the north-west trail, come down the north road and out of the eastern fields.
const SAMAT_SPAWNS = [
  { x: 60, y: 1 },
  { x: 1, y: 10 },
  { x: 95, y: 52 },
];

const SAMAT_DEFENDERS: PlacedUnit[] = [
  at('us_riflemen', 42, 26, -90),
  at('us_riflemen', 52, 26, -90),
  at('us_hmg', 47, 24, -90, true),
];

const ROUTE3_GARRISON: PlacedUnit[] = [
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

const ROUTE3_START: PlacedUnit[] = [
  at('us_riflemen', 8, 20, 0),
  at('us_riflemen', 8, 28, 0),
  at('us_hmg', 11, 24, 0),
];

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

// ─── Campaign: the defence and liberation of Luzon ─────────────────

export const CAMPAIGN: readonly ScenarioDef[] = [
  {
    id: 'c1-withdrawal',
    name: 'Withdrawal to Bataan',
    tagline: 'Destroy the enemy vanguard at Calumpit.',
    date: 'December 1941',
    location: 'Central Luzon',
    briefing: [
      'On 22 December 1941 the Japanese 14th Army landed at Lingayen Gulf and drove south towards Manila.',
      'Command has ordered a fighting withdrawal into the Bataan peninsula. Every day the roads stay open, more men and supplies reach the new line.',
      'An enemy vanguard is racing for Calumpit and its bridges over the Pampanga, the only way across on the withdrawal route. Destroy it to the last man, and the road stays open.',
    ],
    map: 'calumpit',
    mode: 'skirmish',
    win: 'annihilation',
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
      'The enemy will come at the bridge in waves from the north, the junction town and the fields to the east. Hold it until the withdrawal is complete.',
      'Barrio Layac and the Dinalupihan road on your bank keep you supplied. Do not let the bridge fall.',
    ],
    map: 'layac',
    mode: 'defense',
    factions: ['usaffe', 'ija'],
    startResources: { manpower: 520, munitions: 70, fuel: 40 },
    playerUnits: [
      at('us_riflemen', 32, 44, -45),
      at('us_riflemen', 28, 40, -45),
      at('us_hmg', 31, 41, -45, true),
    ],
    owners: { 0: 0, 1: 0, 3: 0, 2: 1, 4: 1 },
    defense: {
      hold: [0],
      prepTime: 60,
      spawns: [
        { x: 36, y: 1 },
        { x: 95, y: 3 },
        { x: 95, y: 40 },
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
    tagline: 'Drive down Route 3 and break through to the San Fernando road.',
    date: 'January 1945',
    location: 'Route 3, Central Luzon',
    briefing: [
      'Three years later, the Hukbong Maharlika has returned. On 9 January 1945 the landings came at Lingayen Gulf, where the invasion began.',
      'The road to Manila runs straight down Route 3. Here it passes through a fortified town: the Tarlac road, the poblacion, the church and the road south to San Fernando.',
      'Every position is dug in. Take them in order, keep the advance moving, and break through before the enemy can bring up reserves.',
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
