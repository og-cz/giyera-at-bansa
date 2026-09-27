import { CAPTURE, TILE } from '../../data/balance';
import type { Owner, TeamId } from '../../data/types';
import { dist, type Vec2 } from '../../core/vec';
import type { CapturePoint } from '../entities';
import type { GameMap } from '../grid';
import type { World } from '../world';

export interface Sector {
  id: number;
  /** Index into world.points, or -1 for a base sector. */
  pointIndex: number;
  baseTeam: Owner;
  neighbors: number[];
}

/**
 * Territory: the map is split into sectors (one per base and capture point).
 * A point only pays out while it is connected to its owner's base through a
 * chain of owned sectors — cut the supply line and the income stops.
 */
export class Territory {
  readonly sectorOf: Int16Array;
  readonly sectors: Sector[] = [];
  readonly supplied: [Set<number>, Set<number>] = [new Set(), new Set()];
  /** Bumped whenever ownership or supply changes. */
  version = 0;
  private signature = '';

  constructor(
    private readonly map: GameMap,
    points: readonly CapturePoint[],
    bases: readonly [Vec2, Vec2],
  ) {
    const sources: Vec2[] = [bases[0], bases[1], ...points.map((p) => p.pos)];
    sources.forEach((_, i) => {
      this.sectors.push({ id: i, pointIndex: i >= 2 ? i - 2 : -1, baseTeam: i < 2 ? (i as TeamId) : -1, neighbors: [] });
    });
    points.forEach((p, i) => (p.sector = i + 2));

    this.sectorOf = new Int16Array(map.w * map.h);
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const c = map.tileCenter(tx, ty);
        let best = 0;
        let bestD = Infinity;
        sources.forEach((s, i) => {
          const d = dist(c, s);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        this.sectorOf[ty * map.w + tx] = best;
      }
    }

    const adj = sources.map(() => new Set<number>());
    const link = (a: number, b: number): void => {
      adj[a].add(b);
      adj[b].add(a);
    };
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const a = this.sectorOf[ty * map.w + tx];
        if (tx + 1 < map.w) {
          const b = this.sectorOf[ty * map.w + tx + 1];
          if (a !== b) link(a, b);
        }
        if (ty + 1 < map.h) {
          const b = this.sectorOf[(ty + 1) * map.w + tx];
          if (a !== b) link(a, b);
        }
      }
    }
    adj.forEach((set, i) => (this.sectors[i].neighbors = [...set]));
    this.recomputeSupply(points);
  }

  sectorAt(p: Vec2): number {
    const tx = Math.min(this.map.w - 1, Math.max(0, Math.floor(p.x / TILE)));
    const ty = Math.min(this.map.h - 1, Math.max(0, Math.floor(p.y / TILE)));
    return this.sectorOf[ty * this.map.w + tx];
  }

  ownerOf(sector: number, points: readonly CapturePoint[]): Owner {
    const s = this.sectors[sector];
    return s.pointIndex < 0 ? s.baseTeam : points[s.pointIndex].owner;
  }

  isSupplied(team: TeamId, sector: number): boolean {
    return this.supplied[team].has(sector);
  }

  recomputeSupply(points: readonly CapturePoint[]): void {
    for (const team of [0, 1] as const) {
      const seen = this.supplied[team];
      seen.clear();
      const stack = [team as number];
      seen.add(team);
      while (stack.length) {
        const s = stack.pop()!;
        for (const n of this.sectors[s].neighbors) {
          if (seen.has(n) || this.ownerOf(n, points) !== team) continue;
          seen.add(n);
          stack.push(n);
        }
      }
    }
    const sig = points.map((p) => p.owner).join(',') + '|' + [...this.supplied[0]].sort().join(',') + '|' + [...this.supplied[1]].sort().join(',');
    if (sig !== this.signature) {
      this.signature = sig;
      this.version++;
    }
  }
}

/** Only non-retreating infantry and teams can capture; vehicles cannot. */
export function updateCapture(world: World, dt: number): void {
  let changed = false;
  for (const p of world.points) {
    if (p.locked) {
      p.contested = false;
      continue;
    }
    const present = [0, 0];
    for (const sq of world.squads) {
      if (sq.dead || sq.retreating || !sq.def.canCapture) continue;
      if (sq.models.some((m) => m.alive && dist(m.pos, p.pos) <= CAPTURE.radius)) present[sq.team]++;
    }
    p.contested = present[0] > 0 && present[1] > 0;
    if (p.contested || (present[0] === 0 && present[1] === 0)) continue;
    const team: TeamId = present[0] > 0 ? 0 : 1;
    const squads = present[team];
    const rate = Math.min(CAPTURE.maxBonus, 1 + (squads - 1) * CAPTURE.extraSquadBonus) / CAPTURE.time;
    const before = p.owner;
    p.control = Math.max(-1, Math.min(1, p.control + (team === 0 ? rate : -rate) * dt));
    if (p.owner === 0 && p.control <= 0) p.owner = -1;
    if (p.owner === 1 && p.control >= 0) p.owner = -1;
    if (p.control >= 1) p.owner = 0;
    if (p.control <= -1) p.owner = 1;
    if (p.owner !== before) {
      changed = true;
      if (p.owner === -1) {
        world.emit({ type: 'notify', team: before as TeamId, text: `${p.name} neutralized`, tone: 'bad', pos: { ...p.pos } });
      } else {
        world.emit({ type: 'notify', team: p.owner, text: `${p.name} captured`, tone: 'good', pos: { ...p.pos } });
        world.emit({ type: 'notify', team: p.owner === 0 ? 1 : 0, text: `${p.name} lost to the enemy`, tone: 'bad', pos: { ...p.pos } });
      }
    }
  }
  if (changed) world.territory.recomputeSupply(world.points);
}
