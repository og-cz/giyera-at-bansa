import type { WeaponDef } from './types';

const DEFAULTS: Omit<WeaponDef, 'id' | 'name'> = {
  range: 180,
  minRange: 0,
  accuracy: [0.5, 0.3],
  damage: 10,
  penetration: [1.5, 1],
  cooldown: 1,
  clip: 0,
  reload: 0,
  suppression: 0,
  moveAccuracy: 0.5,
  infantryAccuracy: 1,
  aoe: 0,
  indirect: false,
  scatter: 0,
  craterChance: 0,
  crew: false,
  arc: 360,
  turret: false,
  prefers: 'infantry',
  projectile: 'bullet',
};

const weapon = (id: string, name: string, stats: Partial<WeaponDef>): WeaponDef => ({
  ...DEFAULTS,
  ...stats,
  id,
  name,
});

const LIST: WeaponDef[] = [
  // Small arms
  weapon('m1_garand', 'M1 Garand', {
    range: 180, accuracy: [0.62, 0.36], damage: 16, cooldown: 1.15, clip: 8, reload: 2.5,
    suppression: 0.006, moveAccuracy: 0.55,
  }),
  weapon('arisaka', 'Type 99 Arisaka', {
    range: 180, accuracy: [0.56, 0.36], damage: 16, cooldown: 1.5, clip: 5, reload: 2.6,
    suppression: 0.006, moveAccuracy: 0.45,
  }),
  weapon('m1_carbine', 'M1 Carbine', {
    range: 150, accuracy: [0.55, 0.3], damage: 12, cooldown: 0.95, clip: 15, reload: 2.4,
    suppression: 0.004, moveAccuracy: 0.65,
  }),
  weapon('type38_carbine', 'Type 38 Carbine', {
    range: 160, accuracy: [0.55, 0.32], damage: 16, cooldown: 1.4, clip: 5, reload: 2.4,
    suppression: 0.004, moveAccuracy: 0.55,
  }),

  // Crew-served machine guns: must set up, narrow arc, heavy suppression
  weapon('m1917_hmg', 'M1917 Browning HMG', {
    range: 225, accuracy: [0.42, 0.24], damage: 8, cooldown: 0.12, clip: 50, reload: 4.5,
    suppression: 0.03, moveAccuracy: 0, crew: true, arc: 70,
  }),
  weapon('type92_hmg', 'Type 92 HMG', {
    range: 235, accuracy: [0.45, 0.28], damage: 11, cooldown: 0.19, clip: 30, reload: 3.8,
    suppression: 0.038, moveAccuracy: 0, crew: true, arc: 70,
  }),

  // Indirect fire
  weapon('m2_mortar', 'M2 60mm Mortar', {
    range: 440, minRange: 90, damage: 55, penetration: [6, 6], cooldown: 4.2, suppression: 0.22,
    moveAccuracy: 0, aoe: 26, indirect: true, scatter: 42, craterChance: 0.3, crew: true, projectile: 'mortar',
  }),
  weapon('type97_mortar', 'Type 97 81mm Mortar', {
    range: 480, minRange: 110, damage: 70, penetration: [8, 8], cooldown: 5.6, suppression: 0.28,
    moveAccuracy: 0, aoe: 30, indirect: true, scatter: 50, craterChance: 0.4, crew: true, projectile: 'mortar',
  }),

  // Anti-tank
  weapon('bazooka', 'M1 Bazooka', {
    range: 215, accuracy: [0.62, 0.42], damage: 150, penetration: [110, 85], cooldown: 4.5,
    suppression: 0.05, moveAccuracy: 0, infantryAccuracy: 0.3, prefers: 'vehicle', projectile: 'rocket',
  }),
  weapon('type97_at_rifle', 'Type 97 20mm AT Rifle', {
    range: 225, accuracy: [0.7, 0.5], damage: 55, penetration: [75, 55], cooldown: 2.6, clip: 7, reload: 6,
    suppression: 0.03, moveAccuracy: 0, infantryAccuracy: 0.45, prefers: 'vehicle', projectile: 'shell',
  }),

  // Tank guns
  weapon('m6_37mm', 'M6 37mm Gun', {
    range: 210, accuracy: [0.72, 0.5], damage: 70, penetration: [85, 65], cooldown: 3.1, suppression: 0.04,
    moveAccuracy: 0.7, infantryAccuracy: 0.45, turret: true, prefers: 'any', projectile: 'shell',
  }),
  weapon('type97_57mm', 'Type 97 57mm Gun', {
    range: 205, accuracy: [0.62, 0.42], damage: 45, penetration: [62, 48], cooldown: 3.8, suppression: 0.2,
    moveAccuracy: 0.6, aoe: 18, craterChance: 0.15, turret: true, prefers: 'infantry', projectile: 'shell',
  }),
  weapon('coax_30cal', 'Coaxial .30 cal', {
    range: 190, accuracy: [0.4, 0.22], damage: 8, cooldown: 0.16, clip: 40, reload: 3.5,
    suppression: 0.012, moveAccuracy: 0.7, turret: true,
  }),
  weapon('coax_type97', 'Type 97 Coaxial MG', {
    range: 190, accuracy: [0.4, 0.22], damage: 9, cooldown: 0.2, clip: 30, reload: 3.5,
    suppression: 0.014, moveAccuracy: 0.7, turret: true,
  }),

  // Structures
  weapon('hq_mg', 'Base Defense MG', {
    range: 200, accuracy: [0.4, 0.25], damage: 8, cooldown: 0.25, clip: 30, reload: 4, suppression: 0.02,
  }),

  // Ability-only munitions
  weapon('mk2_grenade', 'Mk 2 Grenade', {
    range: 110, damage: 80, penetration: [10, 10], aoe: 30, suppression: 0.35, scatter: 16,
    craterChance: 0.05, projectile: 'grenade',
  }),
  weapon('type97_grenade', 'Type 97 Grenade', {
    range: 110, damage: 70, penetration: [10, 10], aoe: 32, suppression: 0.4, scatter: 18,
    craterChance: 0.05, projectile: 'grenade',
  }),
];

export const WEAPONS: Readonly<Record<string, WeaponDef>> = Object.fromEntries(LIST.map((w) => [w.id, w]));
