import { ABILITIES } from '../data/abilities';
import type { TeamId } from '../data/types';
import { add, angleTo, dist, scale, type Vec2 } from '../core/vec';
import {
  issueAbility,
  issueAttack,
  issueAttackMove,
  issueMove,
  issueReinforce,
  issueRetreat,
  issueSetup,
  issueStop,
  type CommandResult,
} from '../sim/commands';
import type { Squad } from '../sim/entities';
import type { World } from '../sim/world';
import type { Camera } from '../render/camera';
import type { UIState } from './uiState';

export interface InputCallbacks {
  toast(text: string): void;
  togglePause(): void;
  toggleHelp(): void;
}

const EDGE = 14;
const PAN_SPEED = 900;

/** Translates mouse/keyboard into selection changes and simulation commands. */
export class Input {
  private readonly keys = new Set<string>();
  private middleDrag: { x: number; y: number } | null = null;
  private lastClick = { time: 0, id: -1 };
  private lastGroupTap = { time: 0, group: -1 };
  private readonly off: (() => void)[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly world: World,
    private readonly camera: Camera,
    private readonly ui: UIState,
    private readonly player: TeamId,
    private readonly cb: InputCallbacks,
  ) {
    const on = <K extends keyof WindowEventMap>(target: Window | HTMLElement, type: K, fn: (e: WindowEventMap[K]) => void) => {
      target.addEventListener(type, fn as EventListener);
      this.off.push(() => target.removeEventListener(type, fn as EventListener));
    };
    on(canvas, 'mousedown', (e) => this.onMouseDown(e));
    on(window, 'mousemove', (e) => this.onMouseMove(e));
    on(window, 'mouseup', (e) => this.onMouseUp(e));
    on(canvas, 'wheel', (e) => this.onWheel(e));
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(canvas, 'mouseleave', () => (this.ui.mouse.onCanvas = false));
    on(canvas, 'mouseenter', () => (this.ui.mouse.onCanvas = true));
    on(window, 'keydown', (e) => this.onKeyDown(e));
    on(window, 'keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());
  }

  dispose(): void {
    for (const f of this.off) f();
  }

  update(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('arrowright')) dx += 1;
    if (this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('arrowdown')) dy += 1;
    const m = this.ui.mouse;
    if (m.onCanvas && !this.middleDrag && document.hasFocus()) {
      if (m.x < EDGE) dx -= 1;
      if (m.x > this.camera.viewW - EDGE) dx += 1;
      if (m.y < EDGE) dy -= 1;
      if (m.y > this.camera.viewH - EDGE) dy += 1;
    }
    if (dx || dy) this.camera.pan(dx * PAN_SPEED * dt, dy * PAN_SPEED * dt);
    m.world = this.camera.screenToWorld(m.x, m.y);
    const hover = this.pick(m.world);
    this.ui.hoverId = hover?.id ?? null;
  }

  // ─── Queries ───────────────────────────────────────────────────

  selectedOwn(): Squad[] {
    const out: Squad[] = [];
    for (const id of this.ui.selected) {
      const s = this.world.get(id);
      if (s && !s.dead && s.team === this.player) out.push(s);
      else if (!s || s.dead) this.ui.selected.delete(id);
    }
    return out;
  }

  private pick(p: Vec2): Squad | undefined {
    let best: Squad | undefined;
    let bestD = Infinity;
    for (const sq of this.world.squads) {
      if (sq.dead || !this.world.canSee(this.player, sq)) continue;
      const reach = Math.max(9, sq.def.radius + 4) + 3 / this.camera.zoom;
      for (const m of sq.models) {
        if (!m.alive) continue;
        const d = dist(m.pos, p);
        const score = d + (sq.team === this.player ? 0 : 2);
        if (d <= reach && score < bestD) {
          bestD = score;
          best = sq;
        }
      }
    }
    return best;
  }

  // ─── Actions (also used by HUD buttons) ────────────────────────

  private report(results: CommandResult[]): void {
    if (results.length > 0 && results.every((r) => !r.ok)) this.cb.toast(results[0].reason ?? 'Cannot do that');
  }

  select(ids: number[], additive = false): void {
    if (!additive) this.ui.selected.clear();
    for (const id of ids) this.ui.selected.add(id);
    this.ui.mode = { kind: 'none' };
  }

  selectHq(): void {
    const hq = this.world.hqOf(this.player);
    if (!hq) return;
    this.select([hq.id]);
    this.camera.centerOn(hq.pos);
  }

  stop(): void {
    this.report(this.selectedOwn().filter(notStructure).map((s) => issueStop(this.world, s)));
  }

  retreat(): void {
    this.report(this.selectedOwn().filter(notStructure).map((s) => issueRetreat(this.world, s)));
  }

  reinforce(): void {
    this.report(this.selectedOwn().filter((s) => s.def.kind === 'infantry' || s.def.kind === 'team').map((s) => issueReinforce(this.world, s)));
  }

  setupMode(): void {
    const teams = this.selectedOwn().filter((s) => s.def.kind === 'team');
    if (teams.length === 0) return;
    const deployed = teams.filter((s) => s.setup === 'deployed' || s.setup === 'settingUp');
    if (deployed.length > 0) {
      this.report(deployed.map((s) => issueSetup(this.world, s)));
      return;
    }
    this.ui.mode = { kind: 'setup' };
  }

  attackMoveMode(): void {
    if (this.selectedOwn().some(notStructure)) this.ui.mode = { kind: 'attackMove' };
  }

  abilityMode(hotkey: string): void {
    const own = this.selectedOwn();
    for (const sq of own) {
      const id = sq.def.abilities.find((a) => ABILITIES[a].hotkey === hotkey.toUpperCase());
      if (id) {
        this.ui.mode = { kind: 'ability', abilityId: id };
        return;
      }
    }
  }

  private castAbility(abilityId: string, target: Vec2): void {
    const casters = this.selectedOwn().filter((s) => s.def.abilities.includes(abilityId));
    if (casters.length === 0) return;
    const ready = casters.filter((s) => (s.cooldowns[abilityId] ?? 0) <= 0 && !s.channel && s.order.kind !== 'ability');
    const pool = ready.length > 0 ? ready : casters;
    pool.sort((a, b) => dist(a.pos, target) - dist(b.pos, target));
    this.report([issueAbility(this.world, pool[0], abilityId, target)]);
  }

  /** Spread multiple squads across a line perpendicular to the move direction. */
  private formationTargets(squads: Squad[], dest: Vec2): Map<number, Vec2> {
    const out = new Map<number, Vec2>();
    if (squads.length === 1) {
      out.set(squads[0].id, dest);
      return out;
    }
    const c = scale(squads.reduce((acc, s) => add(acc, s.pos), { x: 0, y: 0 }), 1 / squads.length);
    const a = angleTo(c, dest);
    const perp = { x: -Math.sin(a), y: Math.cos(a) };
    const proj = (p: Vec2) => (p.x - c.x) * perp.x + (p.y - c.y) * perp.y;
    const sorted = [...squads].sort((s1, s2) => proj(s1.pos) - proj(s2.pos));
    sorted.forEach((s, i) => {
      const off = (i - (sorted.length - 1) / 2) * 42;
      const mover = s.def.vehicle ? 'vehicle' : 'infantry';
      out.set(s.id, this.world.map.nearestPassable(add(dest, scale(perp, off)), mover));
    });
    return out;
  }

  private commandAt(p: Vec2, shift: boolean): void {
    const own = this.selectedOwn();
    if (own.length === 0) return;
    const target = this.pick(p);
    if (target && target.team !== this.player) {
      this.report(own.filter(notStructure).map((s) => issueAttack(this.world, s, target)));
      return;
    }
    const units = own.filter(notStructure);
    const targets = this.formationTargets(units, p);
    this.report(units.map((s) => issueMove(this.world, s, targets.get(s.id)!, shift)));
    for (const hq of own.filter((s) => !notStructure(s))) issueMove(this.world, hq, p);
  }

  // ─── Event handlers ────────────────────────────────────────────

  private onMouseDown(e: MouseEvent): void {
    const p = this.camera.screenToWorld(e.offsetX, e.offsetY);
    if (e.button === 1) {
      e.preventDefault();
      this.middleDrag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button === 2) {
      if (this.ui.mode.kind !== 'none') this.ui.mode = { kind: 'none' };
      else this.commandAt(p, e.shiftKey);
      return;
    }
    if (e.button !== 0) return;
    const mode = this.ui.mode;
    if (mode.kind === 'attackMove') {
      const units = this.selectedOwn().filter(notStructure);
      const targets = this.formationTargets(units, p);
      this.report(units.map((s) => issueAttackMove(this.world, s, targets.get(s.id)!, e.shiftKey)));
      if (!e.shiftKey) this.ui.mode = { kind: 'none' };
      return;
    }
    if (mode.kind === 'ability') {
      this.castAbility(mode.abilityId, p);
      if (!e.shiftKey) this.ui.mode = { kind: 'none' };
      return;
    }
    if (mode.kind === 'setup') {
      this.report(this.selectedOwn().filter((s) => s.def.kind === 'team').map((s) => issueSetup(this.world, s, p)));
      this.ui.mode = { kind: 'none' };
      return;
    }
    this.ui.drag = { x0: e.offsetX, y0: e.offsetY, x1: e.offsetX, y1: e.offsetY };
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ui.mouse.x = e.clientX - rect.left;
    this.ui.mouse.y = e.clientY - rect.top;
    if (this.middleDrag) {
      this.camera.pan(this.middleDrag.x - e.clientX, this.middleDrag.y - e.clientY);
      this.middleDrag = { x: e.clientX, y: e.clientY };
    }
    if (this.ui.drag) {
      this.ui.drag.x1 = this.ui.mouse.x;
      this.ui.drag.y1 = this.ui.mouse.y;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 1) {
      this.middleDrag = null;
      return;
    }
    if (e.button !== 0 || !this.ui.drag) return;
    const d = this.ui.drag;
    this.ui.drag = null;
    if (Math.abs(d.x1 - d.x0) < 5 && Math.abs(d.y1 - d.y0) < 5) {
      this.clickSelect(this.camera.screenToWorld(d.x0, d.y0), e.shiftKey);
      return;
    }
    const a = this.camera.screenToWorld(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1));
    const b = this.camera.screenToWorld(Math.max(d.x0, d.x1), Math.max(d.y0, d.y1));
    const inBox = this.world.squads.filter(
      (s) =>
        !s.dead &&
        s.team === this.player &&
        s.models.some((m) => m.alive && m.pos.x >= a.x && m.pos.x <= b.x && m.pos.y >= a.y && m.pos.y <= b.y),
    );
    const units = inBox.filter(notStructure);
    this.select((units.length > 0 ? units : inBox).map((s) => s.id), e.shiftKey);
  }

  private clickSelect(p: Vec2, shift: boolean): void {
    const sq = this.pick(p);
    const now = performance.now();
    if (!sq) {
      if (!shift) this.select([]);
      return;
    }
    if (sq.team === this.player && now - this.lastClick.time < 350 && this.lastClick.id === sq.id) {
      const { x0, y0, x1, y1 } = this.camera.visibleBounds();
      const same = this.world.squads.filter(
        (s) => !s.dead && s.team === this.player && s.def.id === sq.def.id && s.pos.x >= x0 && s.pos.x <= x1 && s.pos.y >= y0 && s.pos.y <= y1,
      );
      this.select(same.map((s) => s.id));
    } else if (shift && sq.team === this.player) {
      if (this.ui.selected.has(sq.id)) this.ui.selected.delete(sq.id);
      else this.ui.selected.add(sq.id);
    } else {
      this.select([sq.id]);
    }
    this.lastClick = { time: now, id: sq.id };
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.camera.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX, e.offsetY);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    this.keys.add(key);

    if (/^[0-9]$/.test(key)) {
      const g = Number(key);
      if (e.ctrlKey) {
        e.preventDefault();
        this.ui.groups.set(g, this.selectedOwn().map((s) => s.id));
        this.cb.toast(`Group ${g} assigned`);
      } else {
        const ids = (this.ui.groups.get(g) ?? []).filter((id) => this.world.get(id) && !this.world.get(id)!.dead);
        this.select(ids);
        const now = performance.now();
        if (this.lastGroupTap.group === g && now - this.lastGroupTap.time < 350) this.centerOnSelection();
        this.lastGroupTap = { time: now, group: g };
      }
      return;
    }

    switch (key) {
      case 'escape':
        if (this.ui.mode.kind !== 'none') this.ui.mode = { kind: 'none' };
        else if (this.ui.selected.size > 0) this.select([]);
        else this.cb.togglePause();
        break;
      case 'a':
        this.attackMoveMode();
        break;
      case 's':
        this.stop();
        break;
      case 'r':
        this.retreat();
        break;
      case 'e':
        this.reinforce();
        break;
      case 'd':
        this.setupMode();
        break;
      case 'g':
      case 'b':
        this.abilityMode(key);
        break;
      case 'h':
        this.selectHq();
        break;
      case ' ':
        e.preventDefault();
        this.centerOnSelection();
        break;
      case 'p':
        this.cb.togglePause();
        break;
      case 'f1':
      case '?':
        e.preventDefault();
        this.cb.toggleHelp();
        break;
      case '=':
      case '+':
        this.camera.zoomAt(1.15, this.camera.viewW / 2, this.camera.viewH / 2);
        break;
      case '-':
        this.camera.zoomAt(1 / 1.15, this.camera.viewW / 2, this.camera.viewH / 2);
        break;
    }
  }

  centerOnSelection(): void {
    const own = this.selectedOwn();
    if (own.length === 0) return;
    this.camera.centerOn(scale(own.reduce((acc, s) => add(acc, s.pos), { x: 0, y: 0 }), 1 / own.length));
  }
}

const notStructure = (s: Squad): boolean => s.def.kind !== 'structure';
