import { TILE } from '../../data/balance';
import { DEFENSE_BY_TERRAIN } from '../../data/buildables';
import { T } from '../../data/terrain';
import type { BuildableDef, WeaponDef } from '../../data/types';
import { clamp, dist, type Vec2 } from '../../core/vec';
import type { World } from '../world';

export interface DefenseInfo {
  def: BuildableDef;
  tx: number;
  ty: number;
  hp: number;
  maxHp: number;
}

/** The defense on a tile (sandbags, wire or tank traps), with its health. */
export function defenseAt(world: World, tx: number, ty: number): DefenseInfo | null {
  if (!world.map.inBounds(tx, ty)) return null;
  const def = DEFENSE_BY_TERRAIN.get(world.map.get(tx, ty));
  if (!def) return null;
  const hp = world.defenseHp.get(world.map.idx(tx, ty)) ?? def.hp;
  return { def, tx, ty, hp, maxHp: def.hp };
}

/** A freshly built (or rebuilt) tile starts at full health. */
export function resetDefense(world: World, tx: number, ty: number): void {
  world.defenseHp.delete(world.map.idx(tx, ty));
}

/**
 * Explosions wear down defenses in the blast. Bullets never do, so a sandbag
 * wall takes a real bombardment (or a satchel of grenades) to break.
 */
export function damageDefenses(world: World, pos: Vec2, w: WeaponDef): void {
  if (w.aoe <= 0) return;
  const reach = w.aoe + TILE * 0.5;
  const x0 = Math.floor((pos.x - reach) / TILE);
  const x1 = Math.floor((pos.x + reach) / TILE);
  const y0 = Math.floor((pos.y - reach) / TILE);
  const y1 = Math.floor((pos.y + reach) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const d = defenseAt(world, tx, ty);
      if (!d) continue;
      const gap = dist(world.map.tileCenter(tx, ty), pos);
      if (gap > reach) continue;
      const falloff = 1 - 0.65 * clamp(gap / reach, 0, 1);
      const dmg = w.damage * falloff * (w.vs.structure ?? 1) * d.def.blastResist;
      const left = d.hp - dmg;
      if (left > 0) {
        world.defenseHp.set(world.map.idx(tx, ty), left);
        continue;
      }
      world.defenseHp.delete(world.map.idx(tx, ty));
      world.map.set(tx, ty, T.Crater);
      world.emit({ type: 'float', pos: world.map.tileCenter(tx, ty), text: `${d.def.name} destroyed`, tone: 'bad' });
    }
  }
}

/** Patch up a damaged defense tile. Returns true once it is back to full health. */
export function repairDefense(world: World, tx: number, ty: number, amount: number): boolean {
  const d = defenseAt(world, tx, ty);
  if (!d) return true;
  const hp = Math.min(d.maxHp, d.hp + amount);
  if (hp >= d.maxHp) {
    resetDefense(world, tx, ty);
    return true;
  }
  world.defenseHp.set(world.map.idx(tx, ty), hp);
  return false;
}
