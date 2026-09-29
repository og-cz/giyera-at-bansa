import type { Vec2 } from '../core/vec';

export type Mode =
  | { kind: 'none' }
  | { kind: 'attackMove' }
  | { kind: 'ability'; abilityId: string }
  | { kind: 'setup' }
  | { kind: 'build'; buildId: string };

/** Presentation-side state shared by input, renderer and HUD. Never read by the simulation. */
export interface UIState {
  selected: Set<number>;
  mode: Mode;
  drag: { x0: number; y0: number; x1: number; y1: number } | null;
  mouse: { x: number; y: number; world: Vec2; onCanvas: boolean };
  hoverId: number | null;
  groups: Map<number, number[]>;
  /** Right mouse held down: a short click moves, a drag moves and faces. */
  faceDrag: FaceDrag | null;
  /** Start of a defense line being dragged out in build mode (world point). */
  buildFrom: Vec2 | null;
}

export interface FaceDrag {
  /** World point where the right button went down (the destination). */
  from: Vec2;
  /** Screen point, to tell a click from a drag. */
  sx: number;
  sy: number;
  shift: boolean;
  /** Set once the mouse has moved far enough to count as a drag. */
  preview: { facing: number; targets: { id: number; pos: Vec2 }[] } | null;
}

export function createUIState(): UIState {
  return {
    selected: new Set(),
    mode: { kind: 'none' },
    drag: null,
    mouse: { x: 0, y: 0, world: { x: 0, y: 0 }, onCanvas: false },
    hoverId: null,
    groups: new Map(),
    faceDrag: null,
    buildFrom: null,
  };
}
