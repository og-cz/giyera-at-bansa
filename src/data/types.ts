export type TeamId = 0 | 1;
export type Owner = TeamId | -1;
export type CoverType = 'negative' | 'none' | 'light' | 'heavy';
export type UnitKind = 'infantry' | 'team' | 'vehicle' | 'structure';
export type UnitRole = 'hq' | 'line' | 'mg' | 'mortar' | 'at' | 'tank';
export type PointKind = 'victory' | 'munitions' | 'fuel' | 'manpower';
export type Mover = 'infantry' | 'vehicle';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Resources {
  manpower: number;
  munitions: number;
  fuel: number;
}

export interface TerrainDef {
  id: number;
  name: string;
  cover: CoverType;
  /** Path cost multiplier; Infinity means impassable. */
  infantryCost: number;
  vehicleCost: number;
  blocksSight: boolean;
  /** Accumulated along a sight line; too much dense foliage blocks vision. */
  sightDensity: number;
  /** Terrain a vehicle turns this tile into when driving over it, or null. */
  crushInto: number | null;
}

export type ProjectileKind = 'bullet' | 'shell' | 'rocket' | 'mortar' | 'grenade';

export interface WeaponDef {
  id: string;
  name: string;
  range: number;
  minRange: number;
  /** Hit chance at point-blank and at max range. */
  accuracy: readonly [number, number];
  damage: number;
  penetration: readonly [number, number];
  cooldown: number;
  /** Rounds per magazine; 0 means no reload cycle. */
  clip: number;
  reload: number;
  suppression: number;
  /** Accuracy multiplier while moving; 0 means the weapon cannot fire on the move. */
  moveAccuracy: number;
  /** Accuracy multiplier against man-sized targets (AT weapons are poor at this). */
  infantryAccuracy: number;
  aoe: number;
  indirect: boolean;
  scatter: number;
  craterChance: number;
  /** Crew-served: the team must set up before firing. */
  crew: boolean;
  /** Firing arc in degrees for crew weapons (360 = unrestricted). */
  arc: number;
  turret: boolean;
  prefers: 'infantry' | 'vehicle' | 'any';
  projectile: ProjectileKind;
}

export interface LoadoutEntry {
  weapons: readonly string[];
  count: number;
}

export interface ArmorDef {
  front: number;
  rear: number;
}

export interface VehicleDef {
  turnRate: number;
  turretRate: number;
  length: number;
  width: number;
  reverseFactor: number;
}

export interface UnitDef {
  id: string;
  name: string;
  description: string;
  kind: UnitKind;
  role: UnitRole;
  models: number;
  modelHp: number;
  cost: Resources;
  pop: number;
  buildTime: number;
  speed: number;
  sight: number;
  loadout: readonly LoadoutEntry[];
  receivedAccuracy: number;
  canCapture: boolean;
  setupTime: number;
  teardownTime: number;
  abilities: readonly string[];
  armor: ArmorDef | null;
  vehicle: VehicleDef | null;
  radius: number;
  vetXp: readonly number[];
}

export interface AbilityDef {
  id: string;
  name: string;
  hotkey: string;
  description: string;
  cost: Resources;
  cooldown: number;
  range: number;
  weapon: string;
  shots: number;
  interval: number;
  windup: number;
  requiresSetup: boolean;
}

export interface FactionDef {
  id: string;
  name: string;
  longName: string;
  description: string;
  hq: string;
  roster: readonly string[];
  starting: readonly string[];
}

export type MapFeature =
  | { kind: 'rect'; terrain: number; x: number; y: number; w: number; h: number }
  | { kind: 'line'; terrain: number; points: readonly (readonly [number, number])[]; width: number }
  | { kind: 'circle'; terrain: number; x: number; y: number; r: number }
  | { kind: 'scatter'; terrain: number; x: number; y: number; w: number; h: number; count: number; seed: number };

export interface MapPointDef {
  x: number;
  y: number;
  kind: PointKind;
  name: string;
}

/** Map coordinates are in tiles (continuous); world = tiles * TILE. */
export interface MapDef {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  features: readonly MapFeature[];
  bases: readonly [{ x: number; y: number }, { x: number; y: number }];
  points: readonly MapPointDef[];
}
