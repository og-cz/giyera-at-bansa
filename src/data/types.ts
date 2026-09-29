export type TeamId = 0 | 1;
export type Owner = TeamId | -1;
export type CoverType = 'negative' | 'none' | 'light' | 'heavy';
export type UnitKind = 'infantry' | 'team' | 'vehicle' | 'structure';
export type UnitRole = 'hq' | 'line' | 'mg' | 'mortar' | 'at' | 'tank' | 'engineer';
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
  /**
   * Damage multiplier by target type. This is what makes the roster a web of
   * counters rather than a ladder: mortars wreck weapon teams, rifles bully
   * crews, anti-tank weapons are wasted on infantry, and so on.
   */
  vs: Readonly<Partial<Record<UnitKind, number>>>;
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
  /** Plain-language counters, shown in tooltips and on the unit card. */
  strongVs: string;
  weakVs: string;
  /** Defenses this unit can construct (engineers). */
  builds: readonly string[];
  /** Can repair vehicles and structures (engineers). */
  canRepair: boolean;
}

/** Something engineers can build: a line of fortification tiles, or a single item such as a mine. */
export interface BuildableDef {
  id: string;
  name: string;
  hotkey: string;
  description: string;
  /** Cost per tile (lines) or per item. */
  cost: Resources;
  /** Seconds of work for a full squad, per tile or item. */
  buildTime: number;
  shape: 'line' | 'point';
  /** Terrain laid down when a tile is finished; null for mines. */
  terrain: number | null;
  maxLength: number;
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

/** skirmish = open battle; defense = survive enemy waves; offensive = capture sectors in order. */
export type GameMode = 'skirmish' | 'defense' | 'offensive';

/**
 * How an open battle is won. points = victory-point tickets; annihilation =
 * destroy every enemy unit and the enemy HQ; none = no automatic victory.
 */
export type WinCondition = 'points' | 'annihilation' | 'none';

/** A unit placed on the map at the start of a scenario (tile coordinates). */
export interface PlacedUnit {
  unitId: string;
  x: number;
  y: number;
  /** Facing in degrees (0 = east, 90 = south). */
  facing?: number;
  /** Crew weapons start already set up. */
  deployed?: boolean;
}

export interface WaveDef {
  units: readonly string[];
  /** Seconds after the previous wave (or after the prep phase for the first wave). */
  delay: number;
}

export interface DefenseRules {
  /** Point indices the player must not lose. */
  hold: readonly number[];
  prepTime: number;
  waves: readonly WaveDef[];
  /** Where waves enter the map (tile coordinates). */
  spawns: readonly { x: number; y: number }[];
}

export interface OffensiveRules {
  /** Point indices to capture, in order. */
  sectors: readonly number[];
  timeLimit: number;
  bonusTime: number;
  /** Seconds between enemy counterattacks (0 = none). */
  counterattackEvery: number;
  counterattack: readonly string[];
}

export interface ScenarioDef {
  id: string;
  name: string;
  tagline: string;
  date: string;
  location: string;
  /** Briefing paragraphs shown before the mission. */
  briefing: readonly string[];
  map: string;
  mode: GameMode;
  /** Win condition for open battles (mode 'skirmish'); defaults to points. */
  win?: WinCondition;
  /** [player faction, enemy faction]. */
  factions: readonly [string, string];
  startResources?: Resources;
  /** Replaces the faction's default starting squads when set. */
  playerUnits?: readonly PlacedUnit[];
  enemyUnits?: readonly PlacedUnit[];
  /** Initial point owners by index (unlisted points start neutral). */
  owners?: Readonly<Record<number, Owner>>;
  defense?: DefenseRules;
  offensive?: OffensiveRules;
}
