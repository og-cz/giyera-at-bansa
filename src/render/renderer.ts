import { ABILITIES } from '../data/abilities';
import { BUILDABLES } from '../data/buildables';
import { CAPTURE, TILE } from '../data/balance';
import type { TeamId, WeaponDef } from '../data/types';
import { WEAPONS } from '../data/weapons';
import { add, angleTo, fromAngle, rotate, type Vec2 } from '../core/vec';
import { aliveCount, formationOffset, healthFraction, maxRange, type Squad } from '../sim/entities';
import { coverAt, findCoverSpots } from '../sim/systems/cover';
import { defenseAt } from '../sim/systems/defenses';
import { planBuild } from '../sim/systems/engineering';
import type { World } from '../sim/world';
import type { UIState } from '../input/uiState';
import type { Camera } from './camera';
import { Effects } from './effects';
import { COVER_COLOR, NEUTRAL, TEAM } from './palette';
import { TerrainLayer } from './terrainLayer';

const ROLE_GLYPH: Record<string, string> = { hq: 'HQ', line: 'R', mg: 'MG', mortar: 'M', at: 'AT', tank: 'T', engineer: 'EN' };
const POINT_GLYPH: Record<string, string> = { victory: 'V', munitions: 'M', fuel: 'F', manpower: 'P' };
const ORDER_COLOR: Record<string, string> = {
  move: '#9be29b',
  attackMove: '#ff8a7a',
  attack: '#ff6a5a',
  retreat: '#ffd166',
  ability: '#c9a2ff',
};

/** Draws the world from the player's point of view. Reads the simulation, never writes it. */
export class Renderer {
  readonly effects = new Effects();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly terrain: TerrainLayer;
  private readonly fog: HTMLCanvasElement;
  private readonly fogCtx: CanvasRenderingContext2D;
  private readonly fogData: ImageData;
  private fogVersion = -1;
  private readonly territoryCanvas: HTMLCanvasElement;
  private territoryVersion = -1;
  private readonly borders: Path2D;
  private dpr = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly world: World,
    private readonly camera: Camera,
    private readonly player: TeamId,
    /** Spectator view (menu background): no fog, everything visible. */
    private readonly spectator = false,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.terrain = new TerrainLayer(world.map);
    const { w, h } = world.map;
    this.fog = document.createElement('canvas');
    this.fog.width = w;
    this.fog.height = h;
    this.fogCtx = this.fog.getContext('2d')!;
    this.fogData = this.fogCtx.createImageData(w, h);
    this.territoryCanvas = document.createElement('canvas');
    this.territoryCanvas.width = w;
    this.territoryCanvas.height = h;
    this.borders = this.buildBorders();
  }

  resize(w: number, h: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.camera.resize(w, h);
  }

  visibleToPlayer = (p: Vec2): boolean => this.spectator || this.world.vision.isVisible(this.player, p);

  draw(ui: UIState, dt: number): void {
    const { ctx, world, camera } = this;
    this.effects.consume(world.events, this.visibleToPlayer);
    this.effects.update(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#10140f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    camera.apply(ctx, this.dpr);

    this.terrain.sync();
    this.terrain.draw(ctx);
    this.drawTerritory();
    this.drawPoints();
    this.effects.drawGround(ctx);
    this.drawSelectionUnderlays(ui);

    const visible = world.squads.filter((s) => !s.dead && (this.spectator || world.canSee(this.player, s)));
    for (const sq of visible) if (sq.def.kind === 'structure') this.drawStructure(sq, ui);
    for (const sq of visible) if (sq.def.kind === 'vehicle') this.drawVehicle(sq, ui);
    for (const sq of visible) if (sq.def.kind === 'infantry' || sq.def.kind === 'team') this.drawInfantry(sq, ui);

    this.drawProjectiles();
    this.effects.drawAir(ctx);
    if (!this.spectator) this.drawFog();
    this.drawOrders(ui);
    this.drawFaceDrag(ui);
    this.drawEngineering(ui);
    this.drawCursorPreview(ui);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const sq of visible) this.drawSquadHud(sq, ui);
    this.drawPointLabels();
    this.effects.drawText(ctx, camera);
    this.drawBuildCost(ui);
    if (ui.drag) {
      const { x0, y0, x1, y1 } = ui.drag;
      ctx.strokeStyle = 'rgba(160,255,160,0.9)';
      ctx.fillStyle = 'rgba(160,255,160,0.08)';
      ctx.lineWidth = 1;
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.strokeRect(Math.min(x0, x1) + 0.5, Math.min(y0, y1) + 0.5, Math.abs(x1 - x0), Math.abs(y1 - y0));
    }
  }

  // ─── Map layers ───────────────────────────────────────────────

  private buildBorders(): Path2D {
    const { map, territory } = this.world;
    const path = new Path2D();
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const s = territory.sectorOf[ty * map.w + tx];
        if (tx + 1 < map.w && territory.sectorOf[ty * map.w + tx + 1] !== s) {
          path.moveTo((tx + 1) * TILE, ty * TILE);
          path.lineTo((tx + 1) * TILE, (ty + 1) * TILE);
        }
        if (ty + 1 < map.h && territory.sectorOf[(ty + 1) * map.w + tx] !== s) {
          path.moveTo(tx * TILE, (ty + 1) * TILE);
          path.lineTo((tx + 1) * TILE, (ty + 1) * TILE);
        }
      }
    }
    return path;
  }

  private drawTerritory(): void {
    const { world, ctx } = this;
    const t = world.territory;
    if (t.version !== this.territoryVersion) {
      this.territoryVersion = t.version;
      const tctx = this.territoryCanvas.getContext('2d')!;
      const img = tctx.createImageData(world.map.w, world.map.h);
      const rgb = [
        [79, 148, 232],
        [227, 86, 75],
      ];
      for (let i = 0; i < t.sectorOf.length; i++) {
        const owner = t.ownerOf(t.sectorOf[i], world.points);
        if (owner === -1) continue;
        const supplied = t.isSupplied(owner, t.sectorOf[i]);
        img.data[i * 4] = rgb[owner][0];
        img.data[i * 4 + 1] = rgb[owner][1];
        img.data[i * 4 + 2] = rgb[owner][2];
        img.data[i * 4 + 3] = supplied ? 34 : 14;
      }
      tctx.putImageData(img, 0, 0);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.territoryCanvas, 0, 0, world.map.pixelWidth, world.map.pixelHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5 / this.camera.zoom;
    ctx.setLineDash([6, 6]);
    ctx.stroke(this.borders);
    ctx.setLineDash([]);
  }

  private drawPoints(): void {
    const { ctx, world } = this;
    for (const p of world.points) {
      const color = p.owner === -1 ? NEUTRAL : TEAM[p.owner].main;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, CAPTURE.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 13, 0, Math.PI * 2);
      ctx.fill();
      if (p.control !== 0) {
        ctx.strokeStyle = p.control > 0 ? TEAM[0].main : TEAM[1].main;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 11.5, -Math.PI / 2, -Math.PI / 2 + Math.abs(p.control) * Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POINT_GLYPH[p.kind], p.pos.x, p.pos.y + 0.5);
      ctx.textBaseline = 'alphabetic';

      this.drawObjectiveMarker(p.index, p.pos.x, p.pos.y);
      const cutOff = p.owner !== -1 && !world.territory.isSupplied(p.owner, p.sector);
      if (cutOff) {
        ctx.strokeStyle = '#ffb35c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.pos.x - 16, p.pos.y - 16);
        ctx.lineTo(p.pos.x + 16, p.pos.y + 16);
        ctx.stroke();
      }
    }
  }

  /** Role of a point in the current scenario, if any. */
  private objectiveRole(index: number): 'hold' | 'target' | 'locked' | 'taken' | null {
    const s = this.world.scenario;
    if (s?.defense?.hold.includes(index)) return 'hold';
    const sectors = s?.offensive?.sectors;
    if (!sectors) return null;
    const order = sectors.indexOf(index);
    if (order < 0) return null;
    const current = this.world.objective.sector;
    return order === current ? 'target' : order < current ? 'taken' : 'locked';
  }

  private drawObjectiveMarker(index: number, x: number, y: number): void {
    const role = this.objectiveRole(index);
    if (!role || role === 'taken') return;
    const { ctx } = this;
    const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
    if (role === 'locked') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x + 10, y - 22, 12, 11);
      ctx.strokeStyle = '#cfc9b4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 16, y - 22, 3.5, Math.PI, 0);
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = role === 'hold' ? `rgba(240,200,90,${0.5 + pulse * 0.5})` : `rgba(255,90,60,${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, CAPTURE.radius + 4 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawPointLabels(): void {
    if (this.camera.zoom < 0.7) return;
    const { ctx, world } = this;
    ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const p of world.points) {
      const s = this.camera.worldToScreen(p.pos);
      const cutOff = p.owner !== -1 && !world.territory.isSupplied(p.owner, p.sector);
      const role = this.objectiveRole(p.index);
      const tag = role === 'hold' ? 'HOLD · ' : role === 'target' ? 'OBJECTIVE · ' : '';
      const label = tag + (cutOff ? `${p.name} (cut off)` : p.name);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(label, s.x + 1, s.y + 13 * this.camera.zoom + 15);
      ctx.fillStyle = role === 'hold' ? '#f0c85a' : role === 'target' ? '#ff8a6a' : cutOff ? '#ffcf8a' : '#f2ecd9';
      ctx.fillText(label, s.x, s.y + 13 * this.camera.zoom + 14);
    }
  }

  private drawFog(): void {
    const { world, ctx } = this;
    const v = world.vision;
    if (v.version !== this.fogVersion) {
      this.fogVersion = v.version;
      const vis = v.visible[this.player];
      const d = this.fogData.data;
      for (let i = 0; i < vis.length; i++) {
        d[i * 4] = 8;
        d[i * 4 + 1] = 12;
        d[i * 4 + 2] = 18;
        d[i * 4 + 3] = vis[i] ? 0 : 150;
      }
      this.fogCtx.putImageData(this.fogData, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, 0, 0, world.map.pixelWidth, world.map.pixelHeight);
  }

  // ─── Units ────────────────────────────────────────────────────

  private selectedOwn(ui: UIState): Squad[] {
    const out: Squad[] = [];
    for (const id of ui.selected) {
      const s = this.world.get(id);
      if (s && !s.dead && s.team === this.player) out.push(s);
    }
    return out;
  }

  private drawSelectionUnderlays(ui: UIState): void {
    const { ctx } = this;
    for (const sq of this.selectedOwn(ui)) {
      const range = maxRange(sq);
      if (range > 0 && sq.def.kind !== 'structure') {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sq.pos.x, sq.pos.y, range, 0, Math.PI * 2);
        ctx.stroke();
      }
      const crew = sq.models.flatMap((m) => m.weapons).find((w) => w.def.crew && w.def.arc < 360);
      if (crew && sq.setup !== 'packed') {
        const half = (crew.def.arc * Math.PI) / 360;
        ctx.fillStyle = sq.setup === 'deployed' ? 'rgba(255,230,120,0.12)' : 'rgba(255,230,120,0.05)';
        ctx.beginPath();
        ctx.moveTo(sq.pos.x, sq.pos.y);
        ctx.arc(sq.pos.x, sq.pos.y, crew.def.range, sq.setupFacing - half, sq.setupFacing + half);
        ctx.closePath();
        ctx.fill();
      }
      if (sq.def.kind === 'structure' && sq.rally) {
        ctx.strokeStyle = 'rgba(155,226,155,0.7)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sq.pos.x, sq.pos.y);
        ctx.lineTo(sq.rally.x, sq.rally.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#9be29b';
        ctx.fillRect(sq.rally.x - 1, sq.rally.y - 12, 2, 12);
        ctx.fillRect(sq.rally.x, sq.rally.y - 12, 8, 5);
      }
    }
  }

  private ring(p: Vec2, r: number, color: string): void {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, r, r * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawInfantry(sq: Squad, ui: UIState): void {
    const { ctx } = this;
    const col = TEAM[sq.team];
    const selected = ui.selected.has(sq.id);
    const hovered = ui.hoverId === sq.id;
    const pinned = sq.suppState === 'pinned';
    for (const m of sq.models) {
      if (!m.alive) continue;
      if (selected) this.ring(m.pos, 6.5, '#9dff7a');
      else if (hovered) this.ring(m.pos, 6.5, 'rgba(255,255,255,0.55)');
      const w = m.weapons[0]?.def;
      if (w?.crew) {
        const facing = sq.setup === 'packed' ? m.facing : sq.setupFacing;
        ctx.save();
        ctx.translate(m.pos.x, m.pos.y);
        ctx.rotate(facing);
        ctx.fillStyle = '#2b2b2b';
        if (w.indirect) {
          ctx.fillRect(2, -2.5, 8, 5);
          ctx.beginPath();
          ctx.arc(2, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(1, -1.8, sq.setup === 'packed' ? 8 : 13, 3.6);
          if (sq.setup !== 'packed') ctx.fillRect(-2, -5, 3, 10);
        }
        ctx.restore();
      }
      ctx.fillStyle = col.main;
      ctx.strokeStyle = col.dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (pinned) ctx.ellipse(m.pos.x, m.pos.y, 4.6, 3, m.facing, 0, Math.PI * 2);
      else ctx.arc(m.pos.x, m.pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (w && !w.crew) {
        const tip = add(m.pos, fromAngle(m.facing, w.prefers === 'vehicle' ? 9 : 7));
        ctx.strokeStyle = '#1b1b1b';
        ctx.lineWidth = w.prefers === 'vehicle' ? 2.2 : 1.3;
        ctx.beginPath();
        ctx.moveTo(m.pos.x, m.pos.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
      const hpFrac = m.hp / m.maxHp;
      if (hpFrac < 0.99) {
        ctx.fillStyle = hpFrac > 0.5 ? '#c9f08a' : hpFrac > 0.25 ? '#f2c94c' : '#ff5a4a';
        ctx.fillRect(m.pos.x - 3, m.pos.y + 5.5, 6 * hpFrac, 1.4);
      }
    }
  }

  private drawVehicle(sq: Squad, ui: UIState): void {
    const { ctx } = this;
    const vd = sq.def.vehicle!;
    const col = TEAM[sq.team];
    const L = vd.length;
    const W = vd.width;
    ctx.save();
    ctx.translate(sq.pos.x, sq.pos.y);
    if (ui.selected.has(sq.id) || ui.hoverId === sq.id) {
      ctx.strokeStyle = ui.selected.has(sq.id) ? '#9dff7a' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, L * 0.7, L * 0.55, sq.heading, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(sq.heading);
    ctx.fillStyle = '#1e1e1c';
    ctx.fillRect(-L / 2, -W / 2, L, 4);
    ctx.fillRect(-L / 2, W / 2 - 4, L, 4);
    ctx.fillStyle = col.dark;
    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-L / 2 + 1, -W / 2 + 3, L - 2, W - 6, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col.main;
    ctx.fillRect(L / 2 - 6, -W / 2 + 5, 4, W - 10);
    ctx.rotate(sq.turret - sq.heading);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, -1.6, L * 0.62, 3.2);
    ctx.fillStyle = col.main;
    ctx.strokeStyle = col.dark;
    ctx.beginPath();
    ctx.arc(0, 0, W * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Damaged vehicles trail smoke.
    if (healthFraction(sq) < 0.4 && Math.random() < 0.15) this.effects.puff(sq.pos);
  }

  private drawStructure(sq: Squad, ui: UIState): void {
    const { ctx } = this;
    const col = TEAM[sq.team];
    const r = sq.def.radius;
    const { x, y } = sq.pos;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - r + 4, y - r + 6, r * 2, r * 2);
    ctx.fillStyle = '#4a4238';
    ctx.strokeStyle = ui.selected.has(sq.id) ? '#9dff7a' : col.main;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - r, y - r, r * 2, r * 2, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5c5246';
    ctx.fillRect(x - r + 8, y - r + 8, r * 2 - 16, r * 2 - 16);
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(x - 1, y - r - 22, 2, 26);
    ctx.fillStyle = col.main;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - r - 22);
    ctx.lineTo(x + 18, y - r - 16);
    ctx.lineTo(x + 1, y - r - 10);
    ctx.fill();
    ctx.fillStyle = '#eee';
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HQ', x, y);
    ctx.textBaseline = 'alphabetic';
  }

  private drawProjectiles(): void {
    const { ctx, world } = this;
    for (const p of world.projectiles) {
      const k = p.t / p.flight;
      const x = p.from.x + (p.to.x - p.from.x) * k;
      const y = p.from.y + (p.to.y - p.from.y) * k;
      if (!this.visibleToPlayer({ x, y }) && !this.visibleToPlayer(p.to)) continue;
      const lift = p.arc ? Math.sin(Math.PI * k) * (p.weapon.projectile === 'grenade' ? 18 : 60) : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.weapon.projectile === 'grenade' ? '#3b4a2a' : '#e8e0c8';
      ctx.beginPath();
      ctx.arc(x, y - lift, p.arc ? 2.6 : 2, 0, Math.PI * 2);
      ctx.fill();
      if (p.arc && p.weapon.indirect && k > 0.6 && this.visibleToPlayer(p.to)) {
        ctx.strokeStyle = `rgba(255,90,60,${(k - 0.6) * 1.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.to.x, p.to.y, p.weapon.aoe, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawOrders(ui: UIState): void {
    const { ctx, world } = this;
    ctx.lineWidth = 1.4 / Math.max(0.6, this.camera.zoom);
    for (const sq of this.selectedOwn(ui)) {
      const pts: Vec2[] = [sq.pos, ...sq.path];
      const color = ORDER_COLOR[sq.order.kind];
      if (!color) continue;
      if (sq.order.kind === 'attack') {
        const t = world.get(sq.order.targetId);
        if (t) pts.push(t.pos);
      } else if (sq.order.dest && sq.path.length === 0) {
        pts.push(sq.order.dest);
      }
      for (const q of sq.queue) if (q.dest) pts.push(q.dest);
      if (pts.length < 2) continue;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const end = pts[pts.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** Cover preview: where each soldier would stand and how protected they'd be. */
  private drawCursorPreview(ui: UIState): void {
    const { ctx, world } = this;
    if (!ui.mouse.onCanvas || ui.drag || ui.faceDrag?.preview) return;
    const own = this.selectedOwn(ui);
    const cursor = ui.mouse.world;

    if (ui.mode.kind === 'ability') {
      const ab = ABILITIES[ui.mode.abilityId];
      const caster = own.find((s) => s.def.abilities.includes(ab.id));
      if (caster) {
        ctx.strokeStyle = 'rgba(201,162,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(caster.pos.x, caster.pos.y, ab.range, 0, Math.PI * 2);
        ctx.stroke();
      }
      const w = WEAPONS[ab.weapon];
      ctx.fillStyle = 'rgba(255,80,60,0.15)';
      ctx.strokeStyle = 'rgba(255,80,60,0.8)';
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, w.aoe + w.scatter * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (ui.mode.kind === 'setup') {
      // Live preview of where the gun will cover once it is set up.
      for (const sq of own.filter((s) => s.def.kind === 'team')) {
        const w = crewWeapon(sq);
        if (w) this.drawReach(sq.pos, angleTo(sq.pos, cursor), w, 1);
      }
      return;
    }

    const infantry = own.find((s) => s.def.kind === 'infantry');
    if (!infantry || !world.map.worldPassable(cursor, 'infantry')) return;
    const n = aliveCount(infantry);
    const heading = angleTo(infantry.pos, cursor);
    const slots = Array.from({ length: n }, (_, i) => add(cursor, rotate(formationOffset(i, n), heading)));
    const spots = findCoverSpots(world.map, cursor, heading, slots);
    slots.forEach((slot, i) => {
      const s = spots[i];
      const pos = s ? s.pos : slot;
      const cover = s ? s.cover : coverAt(world.map, slot, null);
      ctx.fillStyle = COVER_COLOR[cover];
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  /**
   * Right-click drag preview: an arrow for the facing, and at each unit's
   * destination the ground its weapon will cover once it arrives.
   */
  private drawFaceDrag(ui: UIState): void {
    const preview = ui.faceDrag?.preview;
    if (!ui.faceDrag || !preview) return;
    const { ctx } = this;
    const from = ui.faceDrag.from;
    const tip = add(from, fromAngle(preview.facing, 60));
    ctx.strokeStyle = '#9be29b';
    ctx.fillStyle = '#9be29b';
    ctx.lineWidth = 2.5 / Math.max(0.6, this.camera.zoom);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    const head = [add(tip, fromAngle(preview.facing + 2.6, 12)), add(tip, fromAngle(preview.facing - 2.6, 12))];
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(head[0].x, head[0].y);
    ctx.lineTo(head[1].x, head[1].y);
    ctx.closePath();
    ctx.fill();

    for (const t of preview.targets) {
      const sq = this.world.get(t.id);
      if (!sq) continue;
      const w = crewWeapon(sq);
      if (w) this.drawReach(t.pos, preview.facing, w, 1);
      else this.drawFacingMarker(t.pos, preview.facing);
    }
  }

  /** Your construction sites and mines (never the enemy's), plus the placement preview. */
  private drawEngineering(ui: UIState): void {
    const { ctx, world } = this;
    const lw = 1.5 / Math.max(0.6, this.camera.zoom);
    for (const c of world.constructions) {
      if (c.team !== this.player && !this.spectator) continue;
      const current = c.tiles.find((t) => !t.done);
      for (const t of c.tiles) {
        if (t.done) continue;
        const x = t.tx * TILE;
        const y = t.ty * TILE;
        ctx.strokeStyle = 'rgba(240,210,120,0.85)';
        ctx.lineWidth = lw;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.setLineDash([]);
        if (t === current && t.progress > 0) {
          ctx.fillStyle = 'rgba(240,210,120,0.45)';
          ctx.fillRect(x + 1, y + TILE - 1 - (TILE - 2) * t.progress, TILE - 2, (TILE - 2) * t.progress);
        }
      }
    }
    this.drawDefenseHealth(ui, lw);
    for (const m of world.mines) {
      if (m.team !== this.player && !this.spectator) continue;
      ctx.fillStyle = 'rgba(20,20,18,0.85)';
      ctx.strokeStyle = TEAM[m.team].main;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(m.pos.x, m.pos.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (ui.mode.kind !== 'build' || !ui.mouse.onCanvas) return;
    const plan = planBuild(world, ui.mode.buildId, ui.buildFrom ?? ui.mouse.world, ui.mouse.world);
    for (const t of plan.tiles) {
      ctx.fillStyle = t.valid ? 'rgba(120,230,120,0.35)' : 'rgba(240,80,60,0.35)';
      ctx.strokeStyle = t.valid ? 'rgba(120,230,120,0.9)' : 'rgba(240,80,60,0.9)';
      ctx.lineWidth = lw;
      ctx.fillRect(t.tx * TILE, t.ty * TILE, TILE, TILE);
      ctx.strokeRect(t.tx * TILE + 0.5, t.ty * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }

  /** Health bars on damaged defenses we can see, and an outline on the one being inspected. */
  private drawDefenseHealth(ui: UIState, lw: number): void {
    const { ctx, world } = this;
    const bar = (tx: number, ty: number, frac: number) => {
      const x = tx * TILE + 1;
      const y = ty * TILE - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x - 0.5, y - 0.5, TILE - 1, 3.5);
      ctx.fillStyle = frac > 0.5 ? '#8fd16a' : frac > 0.25 ? '#e0b640' : '#e0573e';
      ctx.fillRect(x, y, (TILE - 2) * frac, 2.5);
    };
    for (const [idx, hp] of world.defenseHp) {
      const tx = idx % world.map.w;
      const ty = Math.floor(idx / world.map.w);
      const d = defenseAt(world, tx, ty);
      if (!d || (!this.spectator && !world.vision.isVisible(this.player, world.map.tileCenter(tx, ty)))) continue;
      bar(tx, ty, hp / d.maxHp);
    }
    const ins = ui.inspect;
    if (ins?.kind === 'defense') {
      const d = defenseAt(world, ins.tx, ins.ty);
      if (d) {
        ctx.strokeStyle = 'rgba(255,230,140,0.95)';
        ctx.lineWidth = lw * 1.4;
        ctx.strokeRect(ins.tx * TILE + 0.5, ins.ty * TILE + 0.5, TILE - 1, TILE - 1);
        bar(ins.tx, ins.ty, d.hp / d.maxHp);
      }
    }
  }

  /** Cost of the defense being placed, next to the cursor. */
  private drawBuildCost(ui: UIState): void {
    if (ui.mode.kind === 'repair' && ui.mouse.onCanvas) {
      this.cursorLabel(ui, 'Repair · click a damaged tank, HQ or defense', '#cfe8ff');
      return;
    }
    if (ui.mode.kind !== 'build' || !ui.mouse.onCanvas) return;
    const def = BUILDABLES[ui.mode.buildId];
    const plan = planBuild(this.world, ui.mode.buildId, ui.buildFrom ?? ui.mouse.world, ui.mouse.world);
    const n = plan.tiles.filter((t) => t.valid).length;
    const parts = [];
    if (plan.cost.manpower) parts.push(`${plan.cost.manpower} MP`);
    if (plan.cost.munitions) parts.push(`${plan.cost.munitions} MU`);
    const text = `${def.name}${def.shape === 'line' ? ` ×${n}` : ''} · ${parts.join(' ') || 'free'}`;
    const { ctx } = this;
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    const x = ui.mouse.x + 16;
    const y = ui.mouse.y + 26;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 4, y - 13, ctx.measureText(text).width + 8, 18);
    ctx.fillStyle = n > 0 ? '#e9f5d0' : '#ff9a8a';
    ctx.fillText(text, x, y);
  }

  private cursorLabel(ui: UIState, text: string, color: string): void {
    const { ctx } = this;
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    const x = ui.mouse.x + 16;
    const y = ui.mouse.y + 26;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 4, y - 13, ctx.measureText(text).width + 8, 18);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  /** A weapon's coverage: a firing cone for arc-limited guns, a range ring (with dead zone) otherwise. */
  private drawReach(pos: Vec2, facing: number, w: WeaponDef, alpha: number): void {
    const { ctx } = this;
    ctx.lineWidth = 1.5 / Math.max(0.6, this.camera.zoom);
    if (w.arc < 360) {
      const half = (w.arc * Math.PI) / 360;
      ctx.fillStyle = `rgba(255,220,110,${0.16 * alpha})`;
      ctx.strokeStyle = `rgba(255,220,110,${0.85 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, w.range, facing - half, facing + half);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = `rgba(255,220,110,${0.75 * alpha})`;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, w.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (w.minRange > 0) {
      ctx.fillStyle = `rgba(255,90,60,${0.12 * alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, w.minRange, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawFacingMarker(pos, facing);
  }

  private drawFacingMarker(pos: Vec2, facing: number): void {
    const { ctx } = this;
    const tip = add(pos, fromAngle(facing, 16));
    ctx.fillStyle = 'rgba(155,226,155,0.9)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(155,226,155,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }

  // ─── Screen-space unit HUD ────────────────────────────────────

  private drawSquadHud(sq: Squad, ui: UIState): void {
    const { ctx, camera } = this;
    let top = Infinity;
    for (const m of sq.models) if (m.alive) top = Math.min(top, m.pos.y);
    const anchor = camera.worldToScreen({ x: sq.pos.x, y: top - sq.def.radius });
    const x = Math.round(anchor.x);
    const y = Math.round(anchor.y - 12);
    const col = TEAM[sq.team];
    const selected = ui.selected.has(sq.id);

    const glyph = ROLE_GLYPH[sq.def.role] ?? '?';
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    const bw = Math.max(16, ctx.measureText(glyph).width + 8);
    ctx.fillStyle = selected ? col.light : col.main;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - 16, bw, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.fillText(glyph, x, y - 7);
    if (sq.vet > 0) {
      ctx.fillStyle = '#ffd766';
      ctx.textAlign = 'left';
      ctx.fillText('★'.repeat(sq.vet), x + bw / 2 + 2, y - 7);
    }

    const barW = 26;
    if (sq.def.kind === 'infantry' || sq.def.kind === 'team') {
      const n = sq.def.models;
      const alive = aliveCount(sq);
      const pip = Math.min(5, (barW - (n - 1)) / n);
      const total = n * pip + (n - 1);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < alive ? '#e8e8e8' : 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - total / 2 + i * (pip + 1), y - 2, pip, 3);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - barW / 2, y + 2, barW, 2);
      ctx.fillStyle = '#7fd66b';
      ctx.fillRect(x - barW / 2, y + 2, barW * healthFraction(sq), 2);
    } else {
      const f = healthFraction(sq);
      const w = sq.def.kind === 'structure' ? 50 : barW;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - w / 2, y - 2, w, 4);
      ctx.fillStyle = f > 0.5 ? '#7fd66b' : f > 0.25 ? '#f2c94c' : '#ff5a4a';
      ctx.fillRect(x - w / 2, y - 2, w * f, 4);
    }
    if (sq.suppression > 0.03) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - barW / 2, y + 5, barW, 2);
      ctx.fillStyle = sq.suppState === 'pinned' ? '#ff4a3a' : '#ffd23a';
      ctx.fillRect(x - barW / 2, y + 5, barW * sq.suppression, 2);
    }

    if (sq.team !== this.player || this.spectator) return;
    let status = '';
    if (sq.retreating) status = 'RETREATING';
    else if (sq.suppState === 'pinned') status = 'PINNED';
    else if (sq.reinforcing) status = 'REINFORCING';
    else if (sq.setup === 'settingUp') status = 'SETTING UP';
    else if (sq.setup === 'tearingDown') status = 'PACKING UP';
    else if (sq.channel) status = ABILITIES[sq.channel.abilityId].name.toUpperCase();
    else if (sq.production.length > 0) status = `BUILDING ${Math.ceil(sq.production[0].remaining)}s`;
    if (status) {
      ctx.font = 'bold 8px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(status, x + 1, y - 19);
      ctx.fillStyle = sq.retreating || sq.suppState === 'pinned' ? '#ffcf5c' : '#d9e8ff';
      ctx.fillText(status, x, y - 20);
    }
  }
}

/** The crew-served weapon a team fires once set up, if any. */
function crewWeapon(sq: Squad): WeaponDef | null {
  for (const m of sq.models) for (const w of m.weapons) if (w.def.crew) return w.def;
  return null;
}
