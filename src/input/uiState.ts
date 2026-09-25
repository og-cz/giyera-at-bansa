import type { Vec2 } from '../core/vec';

export type Mode = { kind: 'none' } | { kind: 'attackMove' } | { kind: 'ability'; abilityId: string } | { kind: 'setup' };

/** Presentation-side state shared by input, renderer and HUD. Never read by the simulation. */
export interface UIState {
  selected: Set<number>;
  mode: Mode;
  drag: { x0: number; y0: number; x1: number; y1: number } | null;
  mouse: { x: number; y: number; world: Vec2; onCanvas: boolean };
  hoverId: number | null;
  groups: Map<number, number[]>;
}

export function createUIState(): UIState {
  return {
    selected: new Set(),
    mode: { kind: 'none' },
    drag: null,
    mouse: { x: 0, y: 0, world: { x: 0, y: 0 }, onCanvas: false },
    hoverId: null,
    groups: new Map(),
  };
}
