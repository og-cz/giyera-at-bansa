import type { TeamId } from '../data/types';
import type { World } from '../sim/world';
import type { Camera } from '../render/camera';
import { NEUTRAL, TEAM, TERRAIN_BASE } from '../render/palette';

/** Overview of the whole battlefield; click or drag to move the camera. */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement;
  private baseVersion = -1;
  private readonly scale: number;
  private dragging = false;

  constructor(
    private readonly world: World,
    private readonly camera: Camera,
    private readonly player: TeamId,
    width = 210,
  ) {
    const { w, h } = world.map;
    this.scale = width / w;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap';
    this.canvas.width = width;
    this.canvas.height = Math.round(h * this.scale);
    this.ctx = this.canvas.getContext('2d')!;
    this.base = document.createElement('canvas');
    this.base.width = w;
    this.base.height = h;

    const move = (e: MouseEvent) => {
      const r = this.canvas.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      this.camera.centerOn({ x: fx * world.map.pixelWidth, y: fy * world.map.pixelHeight });
    };
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      move(e);
    });
    const onMove = (e: MouseEvent) => this.dragging && move(e);
    const onUp = () => (this.dragging = false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.dispose = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  readonly dispose: () => void;

  draw(): void {
    const { ctx, world } = this;
    const map = world.map;
    if (this.baseVersion !== map.version) {
      this.baseVersion = map.version;
      const bctx = this.base.getContext('2d')!;
      const img = bctx.createImageData(map.w, map.h);
      for (let i = 0; i < map.tiles.length; i++) {
        const hex = TERRAIN_BASE[map.tiles[i]] ?? '#5f7b3c';
        const n = parseInt(hex.slice(1), 16);
        img.data[i * 4] = (n >> 16) & 255;
        img.data[i * 4 + 1] = (n >> 8) & 255;
        img.data[i * 4 + 2] = n & 255;
        img.data[i * 4 + 3] = 255;
      }
      bctx.putImageData(img, 0, 0);
    }
    const s = this.scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, 0, 0, this.canvas.width, this.canvas.height);

    const vis = world.vision.visible[this.player];
    ctx.fillStyle = 'rgba(5,8,12,0.45)';
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) if (!vis[ty * map.w + tx]) ctx.fillRect(tx * s, ty * s, s + 0.5, s + 0.5);
    }

    const k = s / 16;
    for (const p of world.points) {
      ctx.fillStyle = p.owner === -1 ? NEUTRAL : TEAM[p.owner].main;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.pos.x * k, p.pos.y * k, p.kind === 'victory' ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    for (const sq of world.squads) {
      if (sq.dead || !world.canSee(this.player, sq)) continue;
      ctx.fillStyle = TEAM[sq.team].light;
      const size = sq.def.kind === 'structure' ? 7 : sq.def.kind === 'vehicle' ? 4 : 3;
      ctx.fillRect(sq.pos.x * k - size / 2, sq.pos.y * k - size / 2, size, size);
    }

    const b = this.camera.visibleBounds();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x0 * k + 0.5, b.y0 * k + 0.5, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k);
  }
}
