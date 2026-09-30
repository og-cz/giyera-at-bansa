import { TILE } from '../data/balance';
import { T } from '../data/terrain';
import { hash2 } from '../core/rng';
import type { GameMap } from '../sim/grid';
import { TERRAIN_BASE } from './palette';

const SCALE = 2;
const PX = TILE * SCALE;

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amount * 255)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const SURROUND = 384;

/** One seamless tile of dense canopy with rocky outcrops, for the land outside the map. */
function surroundTile(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SURROUND;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#1f3919';
  c.fillRect(0, 0, SURROUND, SURROUND);
  // Draw each blob at every wrapped position so the tile repeats without seams.
  const wrapped = (x: number, y: number, r: number, paint: (x: number, y: number) => void) => {
    for (const dx of [-SURROUND, 0, SURROUND]) {
      for (const dy of [-SURROUND, 0, SURROUND]) {
        if (x + dx + r < 0 || x + dx - r > SURROUND || y + dy + r < 0 || y + dy - r > SURROUND) continue;
        paint(x + dx, y + dy);
      }
    }
  };
  // Rock outcrops and scree under the trees.
  for (let i = 0; i < 7; i++) {
    const x = hash2(i, 91) * SURROUND;
    const y = hash2(91, i) * SURROUND;
    const r = 22 + hash2(i, i, 5) * 26;
    wrapped(x, y, r, (px, py) => {
      c.fillStyle = shade('#57544a', (hash2(i, 7) - 0.5) * 0.1);
      c.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const rr = r * (0.7 + hash2(i, k, 3) * 0.4);
        if (k === 0) c.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
        else c.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,240,0.08)';
      c.beginPath();
      c.ellipse(px - r * 0.2, py - r * 0.25, r * 0.45, r * 0.25, -0.5, 0, Math.PI * 2);
      c.fill();
    });
  }
  // Layers of canopy, darker underneath.
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 90; i++) {
      const x = hash2(i, layer, 11) * SURROUND;
      const y = hash2(layer, i, 13) * SURROUND;
      const r = 10 + hash2(i, layer, 17) * 16;
      // Leave the rocks showing through in places.
      if (layer === 2 && hash2(i, 29) < 0.35) continue;
      wrapped(x, y, r, (px, py) => {
        c.fillStyle = shade(['#1a3115', '#24421c', '#2d5122'][layer], (hash2(i, layer, 19) - 0.5) * 0.08);
        c.beginPath();
        c.arc(px, py, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.beginPath();
        c.arc(px + r * 0.25, py + r * 0.3, r * 0.8, 0, Math.PI * 2);
        c.fill();
      });
    }
  }
  return canvas;
}

/**
 * Pre-rendered terrain at 2px per world unit. Only tiles that change (craters,
 * crushed hedges) are redrawn, together with their neighbours for edge detail.
 */
export class TerrainLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private surround: CanvasPattern | null = null;

  constructor(private readonly map: GameMap) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = map.w * PX;
    this.canvas.height = map.h * PX;
    this.ctx = this.canvas.getContext('2d')!;
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) this.drawTile(tx, ty);
  }

  sync(): void {
    const changes = this.map.changes;
    if (changes.length === 0) return;
    const redo = new Set<number>();
    for (const i of changes) {
      const tx = i % this.map.w;
      const ty = Math.floor(i / this.map.w);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) if (this.map.inBounds(tx + dx, ty + dy)) redo.add(this.map.idx(tx + dx, ty + dy));
      }
    }
    changes.length = 0;
    for (const i of redo) this.drawTile(i % this.map.w, Math.floor(i / this.map.w));
  }

  /**
   * The land beyond the edge of the battlefield: thick jungle and rock that no
   * one can enter, dimmed so the playable area stands out. Fills the visible
   * world rectangle; call before draw().
   */
  drawSurround(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
    const w = this.map.pixelWidth;
    const h = this.map.pixelHeight;
    if (x0 >= 0 && y0 >= 0 && x1 <= w && y1 <= h) return;
    this.surround ??= ctx.createPattern(surroundTile(), 'repeat');
    ctx.fillStyle = this.surround ?? '#1c2a17';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = 'rgba(6,10,6,0.42)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // A dark rim where the battlefield ends.
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 10;
    ctx.strokeRect(-5, -5, w + 10, h + 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 24;
    ctx.strokeRect(-12, -12, w + 24, h + 24);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, this.map.pixelWidth, this.map.pixelHeight);
  }

  private drawTile(tx: number, ty: number): void {
    const c = this.ctx;
    const t = this.map.get(tx, ty);
    const x = tx * PX;
    const y = ty * PX;
    const h = hash2(tx, ty);
    c.save();
    c.beginPath();
    c.rect(x, y, PX, PX);
    c.clip();

    c.fillStyle = shade(TERRAIN_BASE[t] ?? '#5f7b3c', (h - 0.5) * 0.05);
    c.fillRect(x, y, PX, PX);
    if (t !== T.Water && t !== T.Building && t !== T.Road && t !== T.Rampart) this.grassSpecks(x, y, tx, ty, t);

    const same = (dx: number, dy: number) => this.map.get(tx + dx, ty + dy) === t;
    switch (t) {
      case T.Road:
        c.fillStyle = 'rgba(0,0,0,0.08)';
        for (let i = 0; i < 4; i++) c.fillRect(x + hash2(tx, ty, i) * PX, y + hash2(ty, tx, i) * PX, 3, 2);
        break;
      case T.Paddy:
        c.fillStyle = 'rgba(120,170,190,0.35)';
        c.fillRect(x, y, PX, PX);
        c.strokeStyle = 'rgba(160,210,110,0.55)';
        c.lineWidth = 2;
        for (let i = 4; i < PX; i += 7) {
          c.beginPath();
          c.moveTo(x, y + i);
          c.lineTo(x + PX, y + i);
          c.stroke();
        }
        if (!same(0, -1)) this.edge(x, y, PX, 3, '#5a4a30');
        if (!same(0, 1)) this.edge(x, y + PX - 3, PX, 3, '#5a4a30');
        break;
      case T.Hedge:
        for (let i = 0; i < 4; i++) {
          c.fillStyle = shade('#2f5b24', (hash2(tx, ty, i + 9) - 0.5) * 0.12);
          c.beginPath();
          c.arc(x + 6 + hash2(tx, ty, i) * (PX - 12), y + 6 + hash2(ty, tx, i) * (PX - 12), 8 + hash2(tx, i, ty) * 4, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case T.Crater:
        c.fillStyle = '#4a3b27';
        c.beginPath();
        c.ellipse(x + PX / 2, y + PX / 2, PX * 0.42, PX * 0.36, h * 3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2f2518';
        c.beginPath();
        c.ellipse(x + PX / 2, y + PX / 2, PX * 0.25, PX * 0.2, h * 3, 0, Math.PI * 2);
        c.fill();
        break;
      case T.Sandbag: {
        const horizontal = same(-1, 0) || same(1, 0) || !(same(0, -1) || same(0, 1));
        c.fillStyle = '#b39c6c';
        c.strokeStyle = '#6f5f3e';
        c.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const bx = horizontal ? x + i * (PX / 3) + 1 : x + PX / 2 - 7;
          const by = horizontal ? y + PX / 2 - 7 : y + i * (PX / 3) + 1;
          c.beginPath();
          c.roundRect(bx, by, horizontal ? PX / 3 - 2 : 14, horizontal ? 14 : PX / 3 - 2, 4);
          c.fill();
          c.stroke();
        }
        break;
      }
      case T.Wire: {
        // Coils of wire strung between posts.
        c.strokeStyle = 'rgba(60,60,60,0.9)';
        c.lineWidth = 1.2;
        for (let i = 0; i < 2; i++) {
          c.beginPath();
          for (let k = 0; k <= 8; k++) {
            const px = x + (k / 8) * PX;
            const py = y + PX / 2 + (k % 2 === 0 ? -5 : 5) + (i === 0 ? -2 : 2);
            if (k === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.stroke();
        }
        c.fillStyle = '#4a3a24';
        c.fillRect(x + 2, y + PX / 2 - 8, 3, 16);
        c.fillRect(x + PX - 5, y + PX / 2 - 8, 3, 16);
        break;
      }
      case T.TankTrap: {
        // Steel hedgehogs.
        c.strokeStyle = '#3a3a3a';
        c.lineWidth = 3;
        for (const [ox, oy] of [[0.3, 0.35], [0.72, 0.68]]) {
          const cx = x + ox * PX;
          const cy = y + oy * PX;
          c.beginPath();
          c.moveTo(cx - 7, cy - 7);
          c.lineTo(cx + 7, cy + 7);
          c.moveTo(cx + 7, cy - 7);
          c.lineTo(cx - 7, cy + 7);
          c.moveTo(cx, cy - 8);
          c.lineTo(cx, cy + 8);
          c.stroke();
        }
        break;
      }
      case T.Wall:
        c.fillStyle = '#8d8a84';
        c.fillRect(x + 4, y + 4, PX - 8, PX - 8);
        if (same(-1, 0)) c.fillRect(x, y + 4, 6, PX - 8);
        if (same(1, 0)) c.fillRect(x + PX - 6, y + 4, 6, PX - 8);
        if (same(0, -1)) c.fillRect(x + 4, y, PX - 8, 6);
        if (same(0, 1)) c.fillRect(x + 4, y + PX - 6, PX - 8, 6);
        c.strokeStyle = 'rgba(40,40,40,0.35)';
        c.lineWidth = 1;
        c.strokeRect(x + 8, y + 8, PX - 16, PX - 16);
        break;
      case T.Building:
        // Thatched/tin roofs with a ridge; darker eaves on outer edges.
        c.fillStyle = shade('#7a5236', (hash2(Math.floor(tx / 3), Math.floor(ty / 3)) - 0.5) * 0.12);
        c.fillRect(x, y, PX, PX);
        c.strokeStyle = 'rgba(0,0,0,0.12)';
        c.lineWidth = 1;
        for (let i = 3; i < PX; i += 6) {
          c.beginPath();
          c.moveTo(x, y + i);
          c.lineTo(x + PX, y + i);
          c.stroke();
        }
        if (!same(-1, 0)) this.edge(x, y, 4, PX, '#3b2616');
        if (!same(1, 0)) this.edge(x + PX - 4, y, 4, PX, '#3b2616');
        if (!same(0, -1)) this.edge(x, y, PX, 4, '#3b2616');
        if (!same(0, 1)) this.edge(x, y + PX - 5, PX, 5, '#24170c');
        break;
      case T.Jungle:
        for (let i = 0; i < 5; i++) {
          c.fillStyle = shade('#2f5a23', (hash2(tx, ty, i + 3) - 0.5) * 0.18);
          c.beginPath();
          c.arc(x + hash2(tx, ty, i) * PX, y + hash2(ty, tx, i) * PX, 9 + hash2(i, tx, ty) * 7, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case T.Rampart: {
        // Dressed stone blocks, with a shadowed parapet on outer faces.
        c.strokeStyle = 'rgba(40,36,30,0.45)';
        c.lineWidth = 1;
        for (let row = 0; row < 4; row++) {
          const by = y + row * (PX / 4);
          c.beginPath();
          c.moveTo(x, by);
          c.lineTo(x + PX, by);
          c.stroke();
          const shift = row % 2 === 0 ? 0 : PX / 4;
          for (let bx = x + shift; bx < x + PX; bx += PX / 2) {
            c.beginPath();
            c.moveTo(bx, by);
            c.lineTo(bx, by + PX / 4);
            c.stroke();
          }
        }
        if (!same(-1, 0)) this.edge(x, y, 4, PX, '#4a453c');
        if (!same(1, 0)) this.edge(x + PX - 4, y, 4, PX, '#4a453c');
        if (!same(0, -1)) this.edge(x, y, PX, 4, '#4a453c');
        if (!same(0, 1)) this.edge(x, y + PX - 5, PX, 5, '#2e2a24');
        break;
      }
      case T.Water:
        c.strokeStyle = 'rgba(200,230,255,0.18)';
        c.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          const wy = y + 8 + hash2(tx, ty, i) * (PX - 16);
          c.beginPath();
          c.moveTo(x + 4, wy);
          c.quadraticCurveTo(x + PX / 2, wy - 3, x + PX - 4, wy);
          c.stroke();
        }
        if (!same(0, -1)) this.edge(x, y, PX, 3, 'rgba(220,210,170,0.6)');
        if (!same(0, 1)) this.edge(x, y + PX - 3, PX, 3, 'rgba(220,210,170,0.6)');
        if (!same(-1, 0)) this.edge(x, y, 3, PX, 'rgba(220,210,170,0.6)');
        if (!same(1, 0)) this.edge(x + PX - 3, y, 3, PX, 'rgba(220,210,170,0.6)');
        break;
    }
    c.restore();
  }

  private grassSpecks(x: number, y: number, tx: number, ty: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = t === T.Paddy ? 'rgba(40,70,40,0.25)' : 'rgba(30,50,20,0.22)';
    for (let i = 0; i < 5; i++) c.fillRect(x + hash2(tx, ty, i + 20) * PX, y + hash2(ty, tx, i + 20) * PX, 2, 2);
    c.fillStyle = 'rgba(160,190,90,0.18)';
    for (let i = 0; i < 3; i++) c.fillRect(x + hash2(tx, ty, i + 40) * PX, y + hash2(ty, tx, i + 40) * PX, 2, 2);
  }

  private edge(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
}
