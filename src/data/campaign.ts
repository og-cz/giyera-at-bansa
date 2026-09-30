import { AT, MG, MO, R, ROUTE3_GARRISON, ROUTE3_START, SAMAT_DEFENDERS, SAMAT_SPAWNS, TK, assault, at, holdOn, wave } from './scenarioKit';
import type { CampaignMission, ScenarioDef, StoryPage } from './types';

/**
 * Campaign: the defence and liberation of Luzon, told through one company.
 * Every mission has two parts; story scenes play before each part and after
 * the mission is won.
 */

const FACTIONS = ['usaffe', 'ija'] as const;

// The people of the company.
const MAJOR = 'Major Dimalanta';
const SARGE = 'Sgt. Enzo Villareal';
const TOMAS = 'Cpl. Tomas Bautista';
const PEPE = 'Pepe, radioman';
const CHED = 'Nurse Ched Laurel';
const OCAMPO = 'Lt. Rafael Ocampo';
const ISING = 'Ka Ising';

const say = (speaker: string, text: string): StoryPage => ({ speaker, text });
const tell = (text: string): StoryPage => ({ text });

// ─── Chapter I · The Invasion ──────────────────────────────────────

const LINGAYEN_1: ScenarioDef = {
  id: 'c1a-lingayen',
  name: 'Stand at the Plaza',
  tagline: 'Hold the town plaza while the landings come ashore.',
  date: '22 December 1941',
  location: 'Lingayen, Pangasinan',
  story: [
    tell('Lingayen Gulf. Before dawn on 22 December 1941 the sea is full of ships.'),
    say(PEPE, 'Kapitan! Battalion on the line. Landing craft on the beach from Agoo to Damortis, and more coming into the gulf.'),
    say(MAJOR, 'Your company holds Lingayen town until the column on the highway gets clear. Keep the plaza. Every hour you give us is a battalion saved.'),
    say(SARGE, 'The boys have never been shot at, Kapitan. They will learn this morning.'),
    tell('The church bells stop ringing. Somewhere past the market, the first rifles open up.'),
  ],
  briefing: [
    'The enemy is coming ashore on the gulf and pushing inland through the town.',
    'Hold the plaza against every wave. Dig in the machine gun, keep a squad in reserve and use the stone buildings for cover.',
  ],
  map: 'lingayen',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 520, munitions: 70, fuel: 40 },
  ...holdOn('lingayen', [0], [wave(0, R, R), wave(65, R, R), wave(65, R, R, MG), wave(70, R, R, R, AT), wave(75, R, R, MO, TK)], 75),
};

const LINGAYEN_2: ScenarioDef = {
  id: 'c1b-baliuag',
  name: 'Break Contact',
  tagline: 'Destroy the column chasing the withdrawal.',
  date: '24 December 1941',
  location: 'Baliuag, Bulacan',
  story: [
    tell('The plaza held until the order came to pull back. Two days of marching south, sleeping in ditches.'),
    say(TOMAS, 'They are still behind us, Sarhento. Trucks, bicycles, a tank. They never stop.'),
    say(SARGE, 'Then we stop them. Here, at Baliuag, with the river at our backs.'),
    say(MAJOR, 'That column must not reach the bridges. Destroy it and the road south stays ours for another day.'),
  ],
  briefing: [
    'An enemy column has caught up with the withdrawal at Baliuag.',
    'Wipe it out: destroy every enemy unit or their headquarters. Capture points pay out resources but do not decide the fight.',
  ],
  aftermath: [
    tell('The column is gone. Burning trucks line the road out of Baliuag.'),
    say(SARGE, 'They will come again tomorrow, with more.'),
    say(MAJOR, 'Tomorrow we will be across the Pampanga. Good work. Get some sleep if you can.'),
  ],
  map: 'baliuag',
  mode: 'skirmish',
  win: 'annihilation',
  factions: FACTIONS,
};

const WITHDRAWAL_1: ScenarioDef = {
  id: 'c1-withdrawal',
  name: 'The Calumpit Bridges',
  tagline: 'Destroy the enemy vanguard at Calumpit.',
  date: '31 December 1941',
  location: 'Calumpit, Bulacan',
  story: [
    tell('The whole army is falling back into Bataan, and every road goes through the bridges at Calumpit.'),
    say(MAJOR, 'The engineers blow the bridges on New Year’s morning. Until then they stay open, whatever it costs.'),
    say(PEPE, 'Enemy vanguard reported at the barrio across the fields. Light tanks with them.'),
    say(SARGE, 'Bazookas to the front. The rest of you, keep your heads down and your rifles clean.'),
  ],
  briefing: [
    'Command has ordered a fighting withdrawal into the Bataan peninsula. Every day the roads stay open, more men and supplies reach the new line.',
    'An enemy vanguard is racing for Calumpit and its bridges over the Pampanga, the only way across on the withdrawal route. Destroy it to the last man, and the road stays open.',
  ],
  map: 'calumpit',
  mode: 'skirmish',
  win: 'annihilation',
  factions: FACTIONS,
};

const WITHDRAWAL_2: ScenarioDef = {
  id: 'c2b-plaridel',
  name: 'Plaridel Crossroads',
  tagline: 'Hold the crossroads long enough for the last convoys.',
  date: '1 January 1942',
  location: 'Plaridel, Bulacan',
  story: [
    tell('At six in the morning the Calumpit bridges go up with a roar you feel in your chest.'),
    say(TOMAS, 'Happy New Year, Kapitan.'),
    say(MAJOR, 'Not everyone made it across in time. Stragglers and trucks are still coming through Plaridel. Hold the crossroads for them.'),
    say(SARGE, 'Take the plaza and the church. Whoever holds the most ground here holds the road.'),
  ],
  briefing: [
    'The last convoys are still on the road through Plaridel.',
    'Hold more victory points than the enemy to drain their tickets, or destroy their headquarters.',
  ],
  aftermath: [
    tell('The last truck rolls through the crossroads with men hanging off its sides.'),
    say(CHED, 'I have forty wounded in that truck, Kapitan. They are alive because you stayed.'),
    say(MAJOR, 'Now we go too. Next stop, Bataan.'),
  ],
  map: 'plaridel',
  mode: 'skirmish',
  win: 'points',
  factions: FACTIONS,
};

const MANILA_1: ScenarioDef = {
  id: 'c3a-intramuros',
  name: 'The Walled City',
  tagline: 'Guard Intramuros while the last supplies leave the port.',
  date: '26 December 1941',
  location: 'Intramuros, Manila',
  story: [
    tell('Manila, the day after Christmas. The port is full of ships loading everything that can be carried to Bataan and Corregidor.'),
    say(MAJOR, 'Enemy patrols are probing the city from the north. Your company goes into Intramuros and keeps them off the waterfront.'),
    say(OCAMPO, 'Lieutenant Ocampo, reporting with a platoon from the academy, sir. We are yours.'),
    say(SARGE, 'Cadets. Babies with rifles. Put them on the walls, Kapitan, and pray.'),
  ],
  briefing: [
    'The old walled city guards the port. The enemy will storm the landward gates: from the north, the north-west and the west.',
    'The streets are narrow and the walls cannot be climbed. Cover the gates with your machine guns, keep a reserve at the plaza, and do not let the Plaza de Roma fall.',
  ],
  map: 'intramuros',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 560, munitions: 90, fuel: 50 },
  playerUnits: [at('us_riflemen', 28, 44, -90), at('us_riflemen', 38, 44, -90), at('us_hmg', 33, 41, -90, true)],
  owners: { 0: 0, 1: 0, 2: 0, 4: 0, 3: 1 },
  defense: {
    hold: [0],
    prepTime: 75,
    spawns: [
      { x: 43, y: 1 },
      { x: 1, y: 18 },
      { x: 1, y: 45 },
    ],
    waves: [wave(0, R, R), wave(70, R, R, R), wave(70, R, R, MG), wave(75, R, R, R, AT), wave(75, R, R, MO, TK), wave(80, R, R, R, R, MG)],
  },
};

const MANILA_2: ScenarioDef = {
  id: 'c3b-guagua',
  name: 'The Last Bridge at Guagua',
  tagline: 'Hold the bridge on the road west until the rearguard is through.',
  date: '2 January 1942',
  location: 'Guagua, Pampanga',
  story: [
    tell('The last ship left Manila with the company’s wounded aboard. The rest of you went west by truck, then on foot.'),
    say(OCAMPO, 'My cadets fought like soldiers on the walls, Kapitan. Two of them did not come back.'),
    say(SARGE, 'They are soldiers now. That is what it costs.'),
    say(MAJOR, 'The rearguard is coming through Guagua. The bridge is the only way over the river there. Hold it.'),
  ],
  briefing: [
    'The road west to Bataan crosses the river at Guagua.',
    'Hold the Guagua Bridge against every wave until the rearguard is through.',
  ],
  aftermath: [
    tell('The rearguard crosses at dusk. The engineers drop the bridge into the river behind them.'),
    say(PEPE, 'Message from battalion: well done, and keep moving. They want us at Layac by morning.'),
  ],
  map: 'guagua',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 520, munitions: 80, fuel: 40 },
  ...holdOn('guagua', [1], [wave(0, R, R), wave(65, R, R, MG), wave(70, R, R, R, AT), wave(70, R, R, MO), wave(75, R, R, R, TK), wave(80, R, R, R, R, MG, AT)], 80),
};

const LAYAC_1: ScenarioDef = {
  id: 'c4a-lubao',
  name: 'Delaying Action at Lubao',
  tagline: 'Slow the pursuit in the sugar fields of Lubao.',
  date: '4 January 1942',
  location: 'Lubao, Pampanga',
  story: [
    tell('The sugar cane stands higher than a man. Somewhere in it, the enemy is looking for you.'),
    say(MAJOR, 'Two more days and the last units are inside Bataan. Make the enemy pay for every hectare around Lubao.'),
    say(TOMAS, 'I grew up near here, Kapitan. My lola’s house is by the hacienda. I know every path.'),
    say(SARGE, 'Then you lead. Take the ground and hold it.'),
  ],
  briefing: ['Hold more of Lubao than the enemy does to bleed their advance, or destroy their headquarters.'],
  map: 'lubao',
  mode: 'skirmish',
  win: 'points',
  factions: FACTIONS,
};

const LAYAC_2: ScenarioDef = {
  id: 'c2-layac',
  name: 'Layac Junction',
  tagline: 'Hold the stone bridge against six waves.',
  date: '6 January 1942',
  location: 'Layac Junction, gateway to Bataan',
  story: [
    tell('Layac Junction. The last door into Bataan, and your company is standing in it.'),
    say(MAJOR, 'When the last units are across, you come across too. Not one minute before.'),
    say(CHED, 'I set up the aid station by the barrio. Send me the wounded, Kapitan, not the dead.'),
    say(SARGE, 'Machine gun on the bridge. Nobody crosses that bridge who is not ours.'),
  ],
  briefing: [
    'The enemy will come at the bridge in waves from the north, the junction town and the fields to the east. Hold it until the withdrawal is complete.',
    'Barrio Layac and the Dinalupihan road on your bank keep you supplied. Do not let the bridge fall.',
  ],
  aftermath: [
    tell('The last units cross the bridge after dark. Then you cross too, and the peninsula closes behind you.'),
    say(SARGE, 'Bataan. No more retreating now. There is nowhere left to go.'),
  ],
  map: 'layac',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 520, munitions: 70, fuel: 40 },
  playerUnits: [at('us_riflemen', 32, 44, -45), at('us_riflemen', 28, 40, -45), at('us_hmg', 31, 41, -45, true)],
  owners: { 0: 0, 1: 0, 3: 0, 2: 1, 4: 1 },
  defense: {
    hold: [0],
    prepTime: 60,
    spawns: [
      { x: 36, y: 1 },
      { x: 95, y: 3 },
      { x: 95, y: 40 },
    ],
    waves: [wave(0, R, R), wave(70, R, R, MG), wave(70, R, R, R, AT), wave(75, R, R, MO, TK), wave(80, R, R, R, MG, AT), wave(85, R, R, R, R, TK, TK)],
  },
};

// ─── Chapter II · Bataan ───────────────────────────────────────────

const ABUCAY_1: ScenarioDef = {
  id: 'c5a-abucay',
  name: 'Hold the Line',
  tagline: 'Keep the Abucay line from breaking.',
  date: '12 January 1942',
  location: 'Abucay, Bataan',
  story: [
    tell('The Abucay line runs from Manila Bay up into the jungle of Mount Natib. Your company holds the town.'),
    say(PEPE, 'Rations are cut in half, Kapitan. Rice and a little sardines.'),
    say(SARGE, 'Half rations, full fight. They will hit the poblacion first.'),
    say(MAJOR, 'If Abucay breaks, the whole line breaks. It does not break.'),
  ],
  briefing: ['Hold the Poblacion against every wave. The first comes after 75 seconds: dig in and set your machine gun arcs.'],
  map: 'abucay',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 540, munitions: 80, fuel: 40 },
  ...holdOn('abucay', [1], [wave(0, R, R, R), wave(65, R, R, MG), wave(65, R, R, R, AT), wave(70, R, R, MO, TK), wave(75, R, R, R, MG, AT), wave(80, R, R, R, R, TK, MO)], 75),
};

const ABUCAY_2: ScenarioDef = {
  id: 'c5b-pilar',
  name: 'Counterattack at Pilar',
  tagline: 'Push the enemy back out of Pilar, sector by sector.',
  date: '16 January 1942',
  location: 'Pilar, Bataan',
  story: [
    tell('The enemy found a gap west of Abucay and poured through into Pilar.'),
    say(MAJOR, 'Counterattack. Take Pilar back before they can dig in. Kamalig first, then the poblacion, then the bodega and the bridge.'),
    say(OCAMPO, 'My platoon will lead, Kapitan. The cadets want to go first.'),
    say(SARGE, 'Brave boy. Stay low, Tenyente, and do not stand up in the open.'),
  ],
  briefing: ['Capture the sectors in order. Each one you take moves your reinforcement point forward and adds time to the clock.'],
  aftermath: [
    tell('Pilar is ours again by nightfall. The line holds, for now.'),
    say(CHED, 'Lieutenant Ocampo took a bullet in the shoulder. He will live. He keeps asking if the bridge is ours.'),
    say(SARGE, 'Tell him yes. Tell him the cadets took it.'),
  ],
  map: 'pilar',
  mode: 'offensive',
  factions: FACTIONS,
  startResources: { manpower: 600, munitions: 90, fuel: 70 },
  ...assault('pilar', [3, 0, 4, 1], { timeLimit: 900, bonusTime: 180, counterattackEvery: 150, counterattack: [R, R] }),
};

const SAMAT_1: ScenarioDef = {
  id: 'c3-samat',
  name: 'Mount Samat',
  tagline: 'Survive the final offensive on Bataan.',
  date: 'April 1942',
  location: 'Mount Samat, Bataan',
  story: [
    tell('Three months of siege. The men are thin as rifles, shaking with malaria, and still on the line.'),
    say(CHED, 'I am out of quinine, Kapitan. I am out of almost everything.'),
    say(PEPE, 'Artillery all along the front since dawn. They are coming for the mountain.'),
    say(MAJOR, 'Mount Samat is the key to the whole line. We hold the summit, or Bataan falls.'),
    say(SARGE, 'Then we hold it.'),
  ],
  briefing: [
    'On 3 April 1942 the enemy opened its final offensive against Mount Samat.',
    'The summit is the key to the whole line. Hold it against every wave they send.',
  ],
  map: 'mount-samat',
  mode: 'defense',
  factions: FACTIONS,
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
};

const SAMAT_2: ScenarioDef = {
  id: 'c6b-orani',
  name: 'The Last Boats',
  tagline: 'Hold the pier at Orani while the boats get away.',
  date: 'April 1942',
  location: 'Orani, Bataan',
  story: [
    tell('The summit held. Everywhere else, the line did not.'),
    say(MAJOR, 'The order is to get every wounded man and every nurse out to Corregidor. Boats are coming in to the pier at Orani tonight.'),
    say(CHED, 'I am not leaving my wounded.'),
    say(SARGE, 'You are taking them with you, Ched. That is the whole point. We keep the pier open.'),
  ],
  briefing: ['Hold the Pantalan (the pier) until the boats have gone. The enemy will come at it from the whole front.'],
  aftermath: [
    tell('The last boat pulls away from the pier with Ched standing in the stern, not waving.'),
    say(MAJOR, 'Bataan will surrender tomorrow. I will not order any man to surrender. Go into the hills. Keep your rifles.'),
    say(SARGE, 'We will see each other again, Kapitan. In the mountains.'),
  ],
  map: 'orani',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 520, munitions: 80, fuel: 30 },
  ...holdOn('orani', [2], [wave(0, R, R, R), wave(60, R, R, MG), wave(65, R, R, R, AT), wave(65, R, R, MO, TK), wave(70, R, R, R, R, MG), wave(75, R, R, R, TK, AT), wave(80, R, R, R, R, TK, MO, MG)], 70),
};

// ─── Chapter III · The Hills ───────────────────────────────────────

const HILLS_1: ScenarioDef = {
  id: 'c7a-porac',
  name: 'Raid on Porac',
  tagline: 'Wipe out the garrison and take its supplies.',
  date: 'March 1943',
  location: 'Porac, Pampanga',
  story: [
    tell('A year in the hills. The company is a guerrilla band now: farmers by day, soldiers by night.'),
    say(ISING, 'I am Ka Ising. The barrios feed you, hide you and tell you where the patrols go. In return you protect them.'),
    say(ISING, 'The garrison at Porac takes the rice from the farmers and the young men for labour. Everyone knows where they keep the ammunition.'),
    say(SARGE, 'Rifles, ammunition, medicine. We take all of it, and they do not come back.'),
  ],
  briefing: ['Destroy the Porac garrison: every enemy unit or its headquarters.'],
  map: 'porac',
  mode: 'skirmish',
  win: 'annihilation',
  factions: FACTIONS,
};

const HILLS_2: ScenarioDef = {
  id: 'c7b-dinalupihan',
  name: 'Ambush at Dinalupihan',
  tagline: 'Hold the barrio when the punitive column comes.',
  date: 'April 1943',
  location: 'Dinalupihan, Bataan',
  story: [
    tell('The raid worked too well. A punitive column is marching on Dinalupihan to burn the barrios that helped you.'),
    say(ISING, 'If we run, they burn everything. If we fight, maybe they burn nothing.'),
    say(TOMAS, 'We fight.'),
    say(SARGE, 'Take the good ground before they arrive: the poblacion, the chapel, Sitio Pita. Make them bleed for every house.'),
  ],
  briefing: ['Hold more of Dinalupihan than the enemy to drain their tickets, or destroy their headquarters.'],
  aftermath: [
    tell('The column turns back towards the highway, dragging its wounded. The barrio still stands.'),
    say(PEPE, 'Kapitan. I got something on the radio. It is faint, but it is ours. They are coming back.'),
  ],
  map: 'dinalupihan',
  mode: 'skirmish',
  win: 'points',
  factions: FACTIONS,
};

// ─── Chapter IV · Liberation ───────────────────────────────────────

const RETURN_1: ScenarioDef = {
  id: 'c8a-lingayen',
  name: 'Back to Lingayen',
  tagline: 'Land at Lingayen and clear the town, sector by sector.',
  date: '9 January 1945',
  location: 'Lingayen, Pangasinan',
  story: [
    tell('January 1945. The ships in Lingayen Gulf are ours this time, and there are more of them than anyone can count.'),
    say(MAJOR, 'I told you we would meet again. Welcome back to the army, Kapitan.'),
    say(SARGE, 'Three years ago we held that plaza. Now we take it back.'),
    say(MAJOR, 'The bodega first, then the plaza, the capitolio and the camarin. Keep moving and they cannot dig in.'),
  ],
  briefing: ['Capture the sectors in order. Each one moves your reinforcement point forward and adds time to the clock.'],
  map: 'lingayen',
  mode: 'offensive',
  factions: FACTIONS,
  startResources: { manpower: 620, munitions: 90, fuel: 80 },
  ...assault('lingayen', [3, 0, 1, 4], { timeLimit: 960, bonusTime: 180, counterattackEvery: 150, counterattack: [R, R] }),
};

const RETURN_2: ScenarioDef = {
  id: 'c4-return',
  name: 'The Road to Manila',
  tagline: 'Drive down Route 3 and break through to the San Fernando road.',
  date: 'January 1945',
  location: 'Route 3, Central Luzon',
  story: [
    tell('The road to Manila runs straight down Route 3, through every town you marched through in 1941.'),
    say(TOMAS, 'Same road. Other direction.'),
    say(PEPE, 'Recon says the town ahead is dug in at every corner: Tarlac road, the poblacion, the church, the road south.'),
    say(SARGE, 'Flank the guns through the paddies. Anyone who drives straight down the road does not get home.'),
  ],
  briefing: [
    'The road to Manila passes through a fortified town: the Tarlac road, the poblacion, the church and the road south to San Fernando.',
    'Every position is dug in. Take them in order, keep the advance moving, and break through before the enemy can bring up reserves.',
  ],
  aftermath: [
    tell('The town is open. Farmers come out of the paddies to watch the column pass, and somebody starts to sing.'),
    say(MAJOR, 'San Fernando next. Then Manila.'),
  ],
  map: 'route-3',
  mode: 'offensive',
  factions: FACTIONS,
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
};

const FERNANDO_1: ScenarioDef = {
  id: 'c9a-sanfernando',
  name: 'Take the Town',
  tagline: 'Clear San Fernando from the sugar central to the station.',
  date: 'February 1945',
  location: 'San Fernando, Pampanga',
  story: [
    tell('San Fernando: the railway town, the heart of Pampanga, and the last strong position north of Manila.'),
    say(OCAMPO, 'Captain Ocampo, reporting, sir. Promoted, if you can believe it. I asked to come back to this company.'),
    say(SARGE, 'The cadet. Look at you. Still standing up in the open?'),
    say(MAJOR, 'Sugar central, plaza, station, bodega. Take San Fernando and the road to Manila is open.'),
  ],
  briefing: ['Capture the sectors in order before time runs out. Expect counterattacks.'],
  map: 'san-fernando',
  mode: 'offensive',
  factions: FACTIONS,
  startResources: { manpower: 640, munitions: 100, fuel: 90 },
  ...assault('san-fernando', [3, 0, 2, 4], { timeLimit: 960, bonusTime: 180, counterattackEvery: 140, counterattack: [R, R, MG] }),
};

const FERNANDO_2: ScenarioDef = {
  id: 'c9b-hold',
  name: 'The Counterattack',
  tagline: 'Hold the station against everything they have left.',
  date: 'February 1945',
  location: 'San Fernando, Pampanga',
  story: [
    tell('Night falls over San Fernando. The station is yours, and the enemy is gathering everything it has left in the north.'),
    say(PEPE, 'Tanks, Kapitan. A lot of them. And infantry behind.'),
    say(ISING, 'The whole province came to fight with you tonight. Tell us where to stand.'),
    say(SARGE, 'At the station. With us. Nobody goes back one step.'),
  ],
  briefing: ['Hold the Estacion against eight waves. Mines and tank traps on the approaches will help.'],
  aftermath: [
    tell('At dawn the last attack breaks in front of the station. There is no one left to send.'),
    say(MAJOR, 'The road to Manila is open. It is over, here at least.'),
    say(SARGE, 'Lingayen to Bataan to the hills and back again. Four years, Kapitan.'),
    say(CHED, 'I heard this company was in San Fernando. I came to see who is still alive.'),
    tell('More of you than anyone expected. Salamat, Kapitan.'),
  ],
  map: 'san-fernando',
  mode: 'defense',
  factions: FACTIONS,
  startResources: { manpower: 620, munitions: 120, fuel: 70 },
  ...holdOn(
    'san-fernando',
    [2],
    [
      wave(0, R, R, R),
      wave(65, R, R, MG),
      wave(65, R, R, R, AT, MO),
      wave(70, R, R, R, TK),
      wave(75, R, R, R, R, MG, AT),
      wave(75, R, R, R, TK, TK, MO),
      wave(80, R, R, R, R, R, TK, AT),
      wave(85, R, R, R, R, R, TK, TK, MG, MO),
    ],
    80,
  ),
};

export const CAMPAIGN: readonly CampaignMission[] = [
  { id: 'm1-lingayen', chapter: 'I · The Invasion', name: 'The Beaches of Lingayen', date: 'December 1941', location: 'Pangasinan and Bulacan', tagline: 'The enemy lands in the gulf. Buy time for the army.', parts: [LINGAYEN_1, LINGAYEN_2] },
  { id: 'm2-withdrawal', chapter: 'I · The Invasion', name: 'Withdrawal to Bataan', date: 'December 1941', location: 'Calumpit and Plaridel', tagline: 'Keep the roads open while the army falls back.', parts: [WITHDRAWAL_1, WITHDRAWAL_2] },
  { id: 'm3-manila', chapter: 'I · The Invasion', name: 'Rearguard', date: 'Dec 1941 – Jan 1942', location: 'Manila and Guagua', tagline: 'Cover the port, then the last bridge west.', parts: [MANILA_1, MANILA_2] },
  { id: 'm4-layac', chapter: 'I · The Invasion', name: 'The Door to Bataan', date: 'January 1942', location: 'Lubao and Layac', tagline: 'Slow the pursuit and hold the last bridge.', parts: [LAYAC_1, LAYAC_2] },
  { id: 'm5-abucay', chapter: 'II · Bataan', name: 'The Abucay Line', date: 'January 1942', location: 'Abucay and Pilar', tagline: 'Hold the line, then take back what was lost.', parts: [ABUCAY_1, ABUCAY_2] },
  { id: 'm6-samat', chapter: 'II · Bataan', name: 'The Fall of Bataan', date: 'April 1942', location: 'Mount Samat and Orani', tagline: 'Hold the mountain, then save who you can.', parts: [SAMAT_1, SAMAT_2] },
  { id: 'm7-hills', chapter: 'III · The Hills', name: 'Mga Gerilya', date: '1943', location: 'Porac and Dinalupihan', tagline: 'Fight on from the hills with the barrios behind you.', parts: [HILLS_1, HILLS_2] },
  { id: 'm8-return', chapter: 'IV · Liberation', name: 'The Return', date: 'January 1945', location: 'Lingayen and Route 3', tagline: 'Land where it began and drive south.', parts: [RETURN_1, RETURN_2] },
  { id: 'm9-sanfernando', chapter: 'IV · Liberation', name: 'San Fernando', date: 'February 1945', location: 'San Fernando, Pampanga', tagline: 'Take the town, then hold it against everything.', parts: [FERNANDO_1, FERNANDO_2] },
];

/** Every playable part of the campaign, in order. */
export const CAMPAIGN_PARTS: readonly ScenarioDef[] = CAMPAIGN.flatMap((m) => m.parts);
