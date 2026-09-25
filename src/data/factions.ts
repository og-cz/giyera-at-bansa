import type { FactionDef } from './types';

const LIST: FactionDef[] = [
  {
    id: 'usaffe',
    name: 'USAFFE',
    longName: 'U.S. Army Forces in the Far East',
    description:
      'Filipino and American defenders of Luzon. Fewer but tougher riflemen, a fast Stuart light tank and bazooka teams to hunt armour.',
    hq: 'us_hq',
    roster: ['us_riflemen', 'us_hmg', 'us_mortar', 'us_bazooka', 'us_stuart'],
    starting: ['us_riflemen', 'us_riflemen'],
  },
  {
    id: 'ija',
    name: 'Imperial Army',
    longName: 'Imperial Japanese Army — 14th Army',
    description:
      'Large rifle squads with long-ranged rifles, a heavy 81mm mortar and the Chi-Ha tank whose HE shells shred infantry.',
    hq: 'ija_hq',
    roster: ['ija_riflemen', 'ija_hmg', 'ija_mortar', 'ija_at', 'ija_chiha'],
    starting: ['ija_riflemen', 'ija_riflemen'],
  },
];

export const FACTIONS: Readonly<Record<string, FactionDef>> = Object.fromEntries(LIST.map((f) => [f.id, f]));
export const FACTION_IDS = LIST.map((f) => f.id);
