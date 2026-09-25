import { AICommander } from './ai/commander';
import { DIFFICULTY, SIM_DT } from './data/balance';
import { MAPS } from './data/maps';
import type { TeamId } from './data/types';
import { Input } from './input/input';
import { createUIState } from './input/uiState';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import type { MatchSetup } from './ui/menu';
import { Minimap } from './ui/minimap';
import { endOverlay, helpOverlay, pauseOverlay } from './ui/overlays';

const PLAYER: TeamId = 0;

/** Wires the simulation to rendering, input and UI and runs the fixed-timestep loop. */
export class Game {
  private readonly world: World;
  private readonly ai: AICommander;
  private readonly camera: Camera;
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly hud: Hud;
  private readonly minimap: Minimap;
  private readonly ui = createUIState();
  private overlay: HTMLElement | null = null;
  private paused = false;
  private ended = false;
  private running = true;
  private acc = 0;
  private last = performance.now();
  private readonly onResize = () => this.resize();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly layer: HTMLElement,
    setup: MatchSetup,
    private readonly onExit: () => void,
  ) {
    this.world = new World({
      map: MAPS[setup.map],
      factions: [setup.faction, setup.enemyFaction],
      seed: (Date.now() & 0xffff) + 1,
      incomeMult: [1, DIFFICULTY[setup.difficulty]],
    });
    this.ai = new AICommander(1);
    this.camera = new Camera(this.world.map.pixelWidth, this.world.map.pixelHeight);
    this.renderer = new Renderer(canvas, this.world, this.camera, PLAYER);
    this.input = new Input(canvas, this.world, this.camera, this.ui, PLAYER, {
      toast: (t) => this.hud.toast(t, 'bad'),
      togglePause: () => this.togglePause(),
      toggleHelp: () => this.toggleHelp(),
    });
    this.minimap = new Minimap(this.world, this.camera, PLAYER);
    this.hud = new Hud(layer, this.world, this.ui, this.input, PLAYER, this.minimap);
    this.hud.onMenu = () => this.togglePause();
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.camera.zoom = 1.1;
    this.camera.centerOn(this.world.teams[PLAYER].spawn);
    this.input.select(this.world.squads.filter((s) => s.team === PLAYER && s.def.kind === 'infantry').map((s) => s.id));
    this.hud.toast('Capture the victory points. Right-click to move your squads.', 'info');
    if (import.meta.env.DEV) Object.assign(window, { game: this });
    requestAnimationFrame(this.frame);
  }

  private resize(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && !this.ended) {
      this.acc += dt;
      while (this.acc >= SIM_DT) {
        this.ai.update(this.world, SIM_DT);
        this.world.step(SIM_DT);
        this.acc -= SIM_DT;
      }
    }
    this.input.update(dt);
    this.renderer.draw(this.ui, this.paused ? 0 : dt);
    this.hud.consume(this.world.events);
    this.world.events.length = 0;
    this.hud.update(dt);
    this.minimap.draw();
    if (!this.ended && this.world.winner !== -1) {
      this.ended = true;
      this.showOverlay(endOverlay(this.world, PLAYER, () => this.exit()));
    }
    requestAnimationFrame(this.frame);
  };

  private showOverlay(node: HTMLElement | null): void {
    this.overlay?.remove();
    this.overlay = node;
    if (node) this.layer.append(node);
  }

  private togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    this.showOverlay(
      this.paused
        ? pauseOverlay(
            () => this.togglePause(),
            () => this.exit(),
          )
        : null,
    );
  }

  private toggleHelp(): void {
    if (this.ended) return;
    if (this.overlay) {
      this.paused = false;
      this.showOverlay(null);
      return;
    }
    this.paused = true;
    this.showOverlay(
      helpOverlay(() => {
        this.paused = false;
        this.showOverlay(null);
      }),
    );
  }

  private exit(): void {
    this.running = false;
    this.input.dispose();
    this.minimap.dispose();
    window.removeEventListener('resize', this.onResize);
    this.showOverlay(null);
    this.hud.root.remove();
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onExit();
  }
}
