import { COVER, TILE } from '../../data/balance';
import { TERRAIN, T } from '../../data/terrain';
import type { CoverType } from '../../data/types';
import { dot, fromAngle, type Vec2 } from '../../core/vec';
import type { GameMap } from '../grid';

const better = (a: CoverType, b: CoverType): CoverType => (COVER[b].rank > COVER[a].rank ? b : a);

/** Cover a tile gives to someone standing next to it (walls, hedges, buildings). */
function edgeCover(terrain: number): CoverType {
  if (terrain === T.Building) return 'heavy';
  const c = TERRAIN[terrain].cover;
  return c === 'negative' ? 'none' : c;
}

/**
 * Directional cover: a soldier's own tile always counts (crater, jungle, paddy),
 * and a cover tile between them and the attacker counts too. A wall only helps
 * against fire coming from the other side of it.
 */
export function coverAt(map: GameMap, pos: Vec2, from: Vec2 | null): CoverType {
  const tx = Math.floor(pos.x / TILE);
  const ty = Math.floor(pos.y / TILE);
  let best: CoverType = map.def(tx, ty).cover;
  if (!from) return best;
  const dx = from.x - pos.x;
  const dy = from.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return best;
  for (const step of [8, 16]) {
    const sx = Math.floor((pos.x + (dx / d) * step) / TILE);
    const sy = Math.floor((pos.y + (dy / d) * step) / TILE);
    if (sx === tx && sy === ty) continue;
    const edge = edgeCover(map.get(sx, sy));
    // Open ground ahead must not cancel the negative cover of standing in a paddy.
    if (edge !== 'none') best = better(best, edge);
  }
  return best;
}

export interface CoverSpot {
  pos: Vec2;
  cover: CoverType;
}

const NEIGHBORS: readonly [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function spotValue(map: GameMap, tx: number, ty: number, facing: Vec2): { cover: CoverType; lean: Vec2 } {
  let cover = map.def(tx, ty).cover;
  if (cover === 'negative') cover = 'none';
  let lean = { x: 0, y: 0 };
  for (const [dx, dy] of NEIGHBORS) {
    const c = edgeCover(map.get(tx + dx, ty + dy));
    if (c === 'none') continue;
    const len = Math.hypot(dx, dy);
    // Only cover that sits between us and the expected enemy direction.
    if (dot({ x: dx / len, y: dy / len }, facing) < 0.3) continue;
    if (COVER[c].rank > COVER[cover].rank) {
      cover = c;
      lean = { x: (dx / len) * 4, y: (dy / len) * 4 };
    }
  }
  return { cover, lean };
}

/**
 * Cover snapping: when a squad stops, each soldier takes the best
 * nearby cover facing the direction of travel. Returns one position per
 * soldier, or null for soldiers who should stay in formation.
 */
export function findCoverSpots(
  map: GameMap,
  dest: Vec2,
  heading: number,
  formation: readonly Vec2[],
  radiusTiles = 4,
): (CoverSpot | null)[] {
  const facing = fromAngle(heading);
  const cx = Math.floor(dest.x / TILE);
  const cy = Math.floor(dest.y / TILE);
  const candidates: { pos: Vec2; cover: CoverType; rank: number }[] = [];
  for (let ty = cy - radiusTiles; ty <= cy + radiusTiles; ty++) {
    for (let tx = cx - radiusTiles; tx <= cx + radiusTiles; tx++) {
      if (!map.passable(tx, ty, 'infantry')) continue;
      const c = map.tileCenter(tx, ty);
      if (Math.hypot(c.x - dest.x, c.y - dest.y) > radiusTiles * TILE) continue;
      const v = spotValue(map, tx, ty, facing);
      if (COVER[v.cover].rank <= 0) continue;
      candidates.push({ pos: { x: c.x + v.lean.x, y: c.y + v.lean.y }, cover: v.cover, rank: COVER[v.cover].rank });
    }
  }
  const used = new Set<number>();
  return formation.map((slot) => {
    let bestI = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      const c = candidates[i];
      const score = c.rank * 3 - Math.hypot(c.pos.x - slot.x, c.pos.y - slot.y) / TILE;
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
      }
    }
    if (bestI < 0) return null;
    used.add(bestI);
    return { pos: candidates[bestI].pos, cover: candidates[bestI].cover };
  });
}
