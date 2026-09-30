import type { TeamId } from '../data/types';
import type { Camera } from '../render/camera';
import type { SimEvent } from '../sim/entities';
import type { World } from '../sim/world';
import { audio, type Loop } from './audio';
import { BLAST, DEFAULT_BLAST, ENGINE, FIRE, WRECK, type SoundSpec } from './sounds';

/** Weapons whose throw or launch makes no firing sound of its own (grenades). */
const SILENT_LAUNCH = new Set(['mk2_grenade', 'type97_grenade']);

/**
 * Battle sounds, heard from the camera: loud near the middle of the screen,
 * fading out past its edges, panned left and right, and quieter zoomed out.
 * Only what the player can see (or hear from their own units) plays.
 */
export class BattleAudio {
  private readonly engines = new Map<number, Loop>();

  constructor(
    private readonly world: World,
    private readonly camera: Camera,
    private readonly player: TeamId,
  ) {}

  /** Where a sound at `p` sits for the listener: loudness 0..1 and pan -1..1. */
  private place(p: { x: number; y: number }): { gain: number; pan: number } {
    const c = this.camera;
    const s = c.worldToScreen(p);
    const halfW = c.viewW / 2;
    const halfH = c.viewH / 2;
    const dx = (s.x - halfW) / halfW;
    const dy = (s.y - halfH) / halfH;
    const d = Math.hypot(dx, dy * 0.8);
    const falloff = d <= 0.6 ? 1 : Math.max(0, 1 - (d - 0.6) / 1.2);
    const zoom = Math.min(1.15, Math.max(0.55, c.zoom / 1.4));
    return { gain: falloff * zoom, pan: Math.max(-1, Math.min(1, dx * 0.8)) };
  }

  private heard(p: { x: number; y: number }, team: TeamId): boolean {
    return team === this.player || this.world.vision.isVisible(this.player, p);
  }

  private emit(spec: SoundSpec, p: { x: number; y: number }, scale = 1): void {
    const { gain, pan } = this.place(p);
    audio.play(spec.name, spec.gain * gain * scale, pan, spec.gap);
  }

  consume(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'shot': {
          const spec = FIRE[e.weapon];
          if (spec && this.heard(e.from, e.team)) this.emit(spec, e.from);
          break;
        }
        case 'launch': {
          const spec = FIRE[e.weapon];
          if (spec && !SILENT_LAUNCH.has(e.weapon) && this.heard(e.from, e.team)) this.emit(spec, e.from);
          break;
        }
        case 'explosion':
          this.emit(BLAST[e.weapon] ?? DEFAULT_BLAST, e.pos);
          break;
        case 'death':
          if (e.vehicle) this.emit(WRECK, e.pos);
          break;
        default:
          break;
      }
    }
  }

  /** Engine noise for vehicles on screen: a low idle, louder and higher while moving. */
  update(): void {
    const seen = new Set<number>();
    for (const sq of this.world.squads) {
      if (sq.dead || sq.def.kind !== 'vehicle' || !this.heard(sq.pos, sq.team)) continue;
      const { gain, pan } = this.place(sq.pos);
      if (gain < 0.03) continue;
      seen.add(sq.id);
      let loop = this.engines.get(sq.id);
      if (!loop) {
        const made = audio.loop(ENGINE);
        if (!made) continue;
        loop = made;
        this.engines.set(sq.id, loop);
      }
      const speed = Math.abs(sq.speedNow) / Math.max(1, sq.def.speed);
      loop.set(gain * (0.12 + 0.3 * speed), pan, 0.85 + 0.35 * speed);
    }
    for (const [id, loop] of this.engines) {
      if (seen.has(id)) continue;
      loop.stop();
      this.engines.delete(id);
    }
  }

  dispose(): void {
    for (const loop of this.engines.values()) loop.stop();
    this.engines.clear();
  }
}

