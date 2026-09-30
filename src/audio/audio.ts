/**
 * Sound effects and music. Effects are small clips bundled into the game and
 * played through Web Audio; music streams from audio/*.ogg. Browsers only allow
 * sound after the first key press or click, so everything starts silent and
 * wakes up then.
 */

const CLIPS = import.meta.glob<string>('./sfx/*.ogg', { query: '?inline', import: 'default', eager: true });

export type Track = 'menu' | 'battle';
export type Channel = 'master' | 'music' | 'effects';

/** Most effects that may sound at once; quieter new ones are dropped beyond this. */
const MAX_VOICES = 32;
const STORAGE_KEY = 'tagakomando.volume';
const FADE_SECONDS = 1.5;

export interface Loop {
  set(gain: number, pan: number, rate: number): void;
  stop(): void;
}

class AudioSystem {
  private ctx: AudioContext | null = null;
  private effects: GainNode | null = null;
  private readonly clips = new Map<string, AudioBuffer[]>();
  private readonly lastPlayed = new Map<string, number>();
  private voices = 0;
  /** Clips started so far (for checking in development). */
  played = 0;
  private readonly volume: Record<Channel, number> = { master: 0.8, music: 0.5, effects: 0.8 };
  private readonly music = new Map<Track, HTMLAudioElement>();
  private wanted: Track | null = null;
  private fadeTimer = 0;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<Channel, number>>;
      for (const k of ['master', 'music', 'effects'] as const) if (typeof saved[k] === 'number') this.volume[k] = Math.min(1, Math.max(0, saved[k]!));
    } catch {
      // Settings unavailable: keep the defaults.
    }
    const wake = () => {
      this.unlock();
      window.removeEventListener('keydown', wake);
      window.removeEventListener('mousedown', wake);
    };
    window.addEventListener('keydown', wake);
    window.addEventListener('mousedown', wake);
  }

  /** Start the audio engine (after a user gesture) and decode the clips. */
  unlock(): void {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.effects = ctx.createGain();
    this.effects.connect(ctx.destination);
    this.applyVolume();
    void ctx.resume();
    for (const [path, url] of Object.entries(CLIPS)) {
      const file = path.split('/').pop()!.replace('.ogg', '');
      const name = file.replace(/_\d+$/, '');
      void fetch(url)
        .then((r) => r.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          const list = this.clips.get(name) ?? [];
          list.push(buffer);
          this.clips.set(name, list);
        })
        .catch(() => {
          // A clip that fails to decode is simply silent.
        });
    }
    if (this.wanted) this.playMusic(this.wanted);
  }

  getVolume(channel: Channel): number {
    return this.volume[channel];
  }

  setVolume(channel: Channel, value: number): void {
    this.volume[channel] = Math.min(1, Math.max(0, value));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.volume));
    } catch {
      // Not saved; it still applies for this session.
    }
    this.applyVolume();
  }

  private applyVolume(): void {
    if (this.effects) this.effects.gain.value = this.volume.master * this.volume.effects;
    for (const [track, el] of this.music) if (track === this.wanted) el.volume = this.musicLevel();
  }

  private musicLevel(): number {
    return this.volume.master * this.volume.music;
  }

  /**
   * Play one variation of a clip. `gain` 0..1, `pan` -1 (left) .. 1 (right).
   * Plays closer together than `gap` seconds are skipped.
   */
  play(name: string, gain: number, pan = 0, gap = 0, rate = 1): void {
    const ctx = this.ctx;
    const list = this.clips.get(name);
    if (!ctx || !this.effects || !list || gain < 0.02) return;
    const now = ctx.currentTime;
    if (gap > 0 && now - (this.lastPlayed.get(name) ?? -1) < gap) return;
    if (this.voices >= MAX_VOICES && gain < 0.5) return;
    this.lastPlayed.set(name, now);
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = ctx.createGain();
    g.gain.value = gain;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(g).connect(p).connect(this.effects);
    this.voices++;
    this.played++;
    src.onended = () => this.voices--;
    src.start();
  }

  /** A looping clip whose loudness, pan and pitch can be changed while it plays. */
  loop(name: string): Loop | null {
    const ctx = this.ctx;
    const buffer = this.clips.get(name)?.[0];
    if (!ctx || !this.effects || !buffer) return null;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    const p = ctx.createStereoPanner();
    src.connect(g).connect(p).connect(this.effects);
    src.start(0, Math.random() * buffer.duration);
    return {
      set: (gain, pan, rate) => {
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(gain, t, 0.15);
        p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.15);
        src.playbackRate.setTargetAtTime(rate, t, 0.3);
      },
      stop: () => {
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        src.stop(ctx.currentTime + 0.5);
      },
    };
  }

  /** Switch music, fading the old track out and the new one in. `null` fades to silence. */
  playMusic(track: Track | null): void {
    this.wanted = track;
    if (!this.ctx) return;
    if (track && !this.music.has(track)) {
      const el = new Audio(`audio/${track}.ogg`);
      el.loop = true;
      el.volume = 0;
      this.music.set(track, el);
    }
    const target = track ? this.music.get(track)! : null;
    if (target && target.paused) void target.play().catch(() => {});
    window.clearInterval(this.fadeTimer);
    const step = 0.05 / FADE_SECONDS;
    this.fadeTimer = window.setInterval(() => {
      let busy = false;
      for (const [t, el] of this.music) {
        const goal = t === this.wanted ? this.musicLevel() : 0;
        const next = el.volume + Math.sign(goal - el.volume) * Math.min(step, Math.abs(goal - el.volume));
        el.volume = Math.min(1, Math.max(0, next));
        if (Math.abs(el.volume - goal) > 0.001) busy = true;
        else if (goal === 0 && !el.paused) el.pause();
      }
      if (!busy) window.clearInterval(this.fadeTimer);
    }, 50);
  }
}

export const audio = new AudioSystem();
if (import.meta.env.DEV) Object.assign(window, { audio });
