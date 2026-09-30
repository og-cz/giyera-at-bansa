import { ABILITIES } from '../data/abilities';
import { TILE } from '../data/balance';
import { BUILDABLES } from '../data/buildables';
import type { TeamId } from '../data/types';
import { UPGRADES } from '../data/upgrades';
import { add, angleTo, dist, scale, type Vec2 } from '../core/vec';
import {
  issueAbility,
  issueAttack,
  issueAttackMove,
  issueBuild,
  issueHelpBuild,
  issueMove,
  issueReinforce,
  issueRepair,
  issueRepairDefense,
  issueRetreat,
  issueSetup,
  issueStop,
  issueUpgrade,
  type CommandResult,
} from '../sim/commands';
import type { Squad } from '../sim/entities';
import { defenseAt } from '../sim/systems/defenses';
import { constructionAt } from '../sim/systems/engineering';
import type { World } from '../sim/world';
import type { Camera } from '../render/camera';
import type { Inspect, UIState } from './uiState';

export interface InputCallbacks {
  toast(text: string): void;
  togglePause(): void;
  toggleHelp(): void;
}

const EDGE = 14;
/** Screen pixels the right button must travel before a click becomes a drag-to-face. */
const FACE_DRAG_MIN = 14;
const PAN_SPEED = 900;

/** Translates mouse/keyboard into selection changes and simulation commands. */
export class Input {
  private readonly keys = new Set<string>();
  /** Grabbing the map: middle button, or left button while Space is held. */
  private middleDrag: { x: number; y: number; button: number } | null = null;
  /** Space was used to grab the map this press, so releasing it should not centre the camera. */
  private spaceGrabbed = false;
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
    on(window, 'keyup', (e) => this.onKeyUp(e));
    on(window, 'blur', () => {
      this.keys.clear();
      this.ui.faceDrag = null;
      this.middleDrag = null;
      this.canvas.style.cursor = '';
    });
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
    this.updateFaceDrag();
  }

  /** While the right button is held, work out where each unit will stand and face. */
  private updateFaceDrag(): void {
    const fd = this.ui.faceDrag;
    if (!fd) return;
    const m = this.ui.mouse;
    if (Math.hypot(m.x - fd.sx, m.y - fd.sy) < FACE_DRAG_MIN) {
      fd.preview = null;
      return;
    }
    const facing = angleTo(fd.from, m.world);
    const units = this.selectedOwn().filter(notStructure);
    const targets = this.formationTargets(units, fd.from, facing);
    fd.preview = { facing, targets: units.map((s) => ({ id: s.id, pos: targets.get(s.id)! })) };
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
    this.ui.inspect = null;
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

  /** Buy the upgrade on `hotkey` (T or Y) for every selected squad that can still take it. */
  upgrade(hotkey: string): void {
    const results: CommandResult[] = [];
    for (const sq of this.selectedOwn()) {
      const id = sq.def.upgrades.find((u) => UPGRADES[u].hotkey === hotkey.toUpperCase());
      if (id && sq.upgrades.length === 0 && !sq.upgrading) results.push(issueUpgrade(this.world, sq, id));
    }
    this.report(results);
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

  /** Enter placement mode for a defense, if an engineer that can build it is selected. */
  buildMode(buildId: string): void {
    if (!this.selectedOwn().some((s) => s.def.builds.includes(buildId))) return;
    this.ui.mode = { kind: 'build', buildId };
    this.ui.buildFrom = null;
  }

  private buildHotkey(key: string): boolean {
    for (const sq of this.selectedOwn()) {
      const id = sq.def.builds.find((b) => BUILDABLES[b].hotkey.toLowerCase() === key);
      if (id) {
        this.buildMode(id);
        return true;
      }
    }
    return false;
  }

  /** Give the job to the selected engineer nearest the start of the line. */
  private placeBuild(buildId: string, from: Vec2, to: Vec2): void {
    const builders = this.selectedOwn().filter((s) => s.def.builds.includes(buildId));
    if (builders.length === 0) return;
    builders.sort((a, b) => dist(a.pos, from) - dist(b.pos, from));
    // Shift-placing a series hands each job to a squad that is still free; otherwise every selected squad pitches in.
    const queueing = this.keys.has('shift');
    const lead = (queueing && builders.find((s) => s.order.kind !== 'build')) || builders[0];
    const result = issueBuild(this.world, lead, buildId, from, to);
    this.report([result]);
    if (!result.ok || queueing || lead.order.kind !== 'build') return;
    for (const s of builders) if (s !== lead) issueHelpBuild(this.world, s, lead.order.targetId!);
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
  /** Line squads up across the move direction, or across the facing for drag orders. */
  private formationTargets(squads: Squad[], dest: Vec2, facing?: number): Map<number, Vec2> {
    const out = new Map<number, Vec2>();
    if (squads.length === 1) {
      out.set(squads[0].id, dest);
      return out;
    }
    const c = scale(squads.reduce((acc, s) => add(acc, s.pos), { x: 0, y: 0 }), 1 / squads.length);
    const a = facing ?? angleTo(c, dest);
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

  private commandFacing(p: Vec2, facing: number, shift: boolean): void {
    const own = this.selectedOwn();
    const units = own.filter(notStructure);
    const targets = this.formationTargets(units, p, facing);
    this.report(units.map((s) => issueMove(this.world, s, targets.get(s.id)!, shift, facing)));
    for (const hq of own.filter((s) => !notStructure(s))) issueMove(this.world, hq, p);
  }

  private commandAt(p: Vec2, shift: boolean): void {
    const own = this.selectedOwn();
    if (own.length === 0) return;
    const target = this.pick(p);
    if (target && target.team !== this.player) {
      this.report(own.filter(notStructure).map((s) => issueAttack(this.world, s, target)));
      return;
    }
    // Right-click one of our unfinished constructions: engineers join the work.
    const job = target ? undefined : constructionAt(this.world, this.player, p);
    const helpers = job ? own.filter((s) => s.def.builds.includes(job.buildId)) : [];
    if (job && helpers.length > 0) {
      this.report(helpers.map((s) => issueHelpBuild(this.world, s, job.id)));
      const others = own.filter((s) => notStructure(s) && !helpers.includes(s));
      const spots = this.formationTargets(others, p);
      for (const s of others) issueMove(this.world, s, spots.get(s.id)!, shift);
      return;
    }
    const hull = target?.models.find((m) => m.alive);
    const repairers = own.filter((s) => s.def.canRepair);
    // Right-click a damaged defense: engineers patch it up.
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    const defense = target ? null : defenseAt(this.world, tx, ty);
    if (defense && defense.hp < defense.maxHp && repairers.length > 0) {
      this.report(repairers.map((s) => issueRepairDefense(this.world, s, tx, ty)));
      const others = own.filter((s) => notStructure(s) && !s.def.canRepair);
      const spots = this.formationTargets(others, p);
      for (const s of others) issueMove(this.world, s, spots.get(s.id)!, shift);
      return;
    }
    if (target && target.def.armor && hull && hull.hp < hull.maxHp && repairers.length > 0) {
      this.report(repairers.map((s) => issueRepair(this.world, s, target)));
      const others = own.filter((s) => notStructure(s) && !s.def.canRepair);
      const spots = this.formationTargets(others, p);
      for (const s of others) issueMove(this.world, s, spots.get(s.id)!, shift);
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
    if (e.button === 1 || (e.button === 0 && this.keys.has(' '))) {
      e.preventDefault();
      this.middleDrag = { x: e.clientX, y: e.clientY, button: e.button };
      if (e.button === 0) {
        this.spaceGrabbed = true;
        this.canvas.style.cursor = 'grabbing';
      }
      return;
    }
    if (e.button === 2) {
      if (this.ui.mode.kind !== 'none') this.ui.mode = { kind: 'none' };
      else this.ui.faceDrag = { from: p, sx: e.offsetX, sy: e.offsetY, shift: e.shiftKey, preview: null };
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
    if (mode.kind === 'build') {
      this.ui.buildFrom = p;
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
      this.middleDrag = { ...this.middleDrag, x: e.clientX, y: e.clientY };
    }
    if (this.ui.drag) {
      this.ui.drag.x1 = this.ui.mouse.x;
      this.ui.drag.y1 = this.ui.mouse.y;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.middleDrag && e.button === this.middleDrag.button) {
      this.middleDrag = null;
      if (e.button === 0) this.canvas.style.cursor = this.keys.has(' ') ? 'grab' : '';
      return;
    }
    if (e.button === 2) {
      const fd = this.ui.faceDrag;
      if (!fd) return;
      // Use the exact release point, not the last frame's.
      this.ui.mouse.world = this.camera.screenToWorld(this.ui.mouse.x, this.ui.mouse.y);
      this.updateFaceDrag();
      this.ui.faceDrag = null;
      if (fd.preview) this.commandFacing(fd.from, fd.preview.facing, fd.shift);
      else this.commandAt(fd.from, fd.shift);
      return;
    }
    if (e.button === 0 && this.ui.mode.kind === 'build' && this.ui.buildFrom) {
      const buildId = this.ui.mode.buildId;
      const from = this.ui.buildFrom;
      this.ui.buildFrom = null;
      this.placeBuild(buildId, from, this.camera.screenToWorld(this.ui.mouse.x, this.ui.mouse.y));
      if (!e.shiftKey) this.ui.mode = { kind: 'none' };
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
      if (!shift) {
        this.select([]);
        this.ui.inspect = this.inspectAt(p);
      }
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

  /** What a click on empty ground shows: our construction job, our mine, or a defense tile. */
  private inspectAt(p: Vec2): Inspect | null {
    const job = constructionAt(this.world, this.player, p);
    if (job) return { kind: 'construction', id: job.id };
    const mine = this.world.mines.find((m) => m.team === this.player && dist(m.pos, p) < 9);
    if (mine) return { kind: 'mine', id: mine.id };
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (defenseAt(this.world, tx, ty) && this.world.vision.isVisible(this.player, p)) return { kind: 'defense', tx, ty };
    return null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.camera.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX, e.offsetY);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
    if (key !== ' ') return;
    if (!this.middleDrag) this.canvas.style.cursor = '';
    if (!this.spaceGrabbed) this.centerOnSelection();
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
      case 'z':
      case 'x':
      case 'c':
      case 'v':
        this.buildHotkey(key);
        break;
      case 't':
      case 'y':
        this.upgrade(key);
        break;
      case 'h':
        this.selectHq();
        break;
      case ' ':
        // Tap to centre on the selection (on release); hold and left-drag to grab the map.
        e.preventDefault();
        if (!e.repeat) {
          this.spaceGrabbed = false;
          if (!this.middleDrag) this.canvas.style.cursor = 'grab';
        }
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
