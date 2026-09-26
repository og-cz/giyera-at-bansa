import { ABILITIES } from '../data/abilities';
import { ECONOMY } from '../data/balance';
import type { TeamId } from '../data/types';
import { UNITS } from '../data/units';
import { cancelProduction, queueProduction } from '../sim/commands';
import { aliveCount, healthFraction, type SimEvent, type Squad, type Tone } from '../sim/entities';
import { canAfford } from '../sim/systems/economy';
import { reinforceCost } from '../sim/systems/logistics';
import type { World } from '../sim/world';
import type { Input } from '../input/input';
import type { UIState } from '../input/uiState';
import { el, formatCost, formatTime } from './dom';
import type { Minimap } from './minimap';

const ROLE_ICON: Record<string, string> = { hq: 'HQ', line: 'R', mg: 'MG', mortar: 'M', at: 'AT', tank: 'T' };

interface CommandButton {
  node: HTMLButtonElement;
  refresh(own: Squad[]): void;
}

/** DOM heads-up display: resources, victory points, selection, commands and production. */
export class Hud {
  readonly root: HTMLElement;
  private readonly res: Record<'manpower' | 'munitions' | 'fuel' | 'pop', HTMLElement>;
  private readonly tickets: [HTMLElement, HTMLElement];
  private readonly ticketBars: [HTMLElement, HTMLElement];
  private readonly pointIcons: HTMLElement;
  private readonly objective: { box: HTMLElement; title: HTMLElement; detail: HTMLElement } | null;
  private readonly clock: HTMLElement;
  private readonly selection: HTMLElement;
  private readonly commands: CommandButton[] = [];
  private readonly prodButtons: { id: string; node: HTMLButtonElement }[] = [];
  private readonly queue: HTMLElement;
  private readonly toasts: HTMLElement;
  private selectionKey = '';
  private timer = 0;

  constructor(
    parent: HTMLElement,
    private readonly world: World,
    private readonly ui: UIState,
    private readonly input: Input,
    private readonly player: TeamId,
    minimap: Minimap,
  ) {
    const team = world.teams[player];
    const stat = (cls: string, label: string) => {
      const v = el('span', { class: 'val' });
      return [el('div', { class: `res ${cls}`, title: label }, el('span', { class: 'icon', text: label.slice(0, 2).toUpperCase() }), v), v] as const;
    };
    const [mpBox, mp] = stat('mp', 'Manpower');
    const [muBox, mu] = stat('mu', 'Munitions');
    const [fuBox, fu] = stat('fu', 'Fuel');
    const [popBox, pop] = stat('pop', 'Population');
    this.res = { manpower: mp, munitions: mu, fuel: fu, pop };

    const ticketBox = (t: TeamId) => {
      const bar = el('div', { class: 'fill' });
      const num = el('span', { class: 'num' });
      return [el('div', { class: `tickets t${t}` }, el('div', { class: 'bar' }, bar), num), num, bar] as const;
    };
    const [t0, n0, b0] = ticketBox(0);
    const [t1, n1, b1] = ticketBox(1);
    this.tickets = [n0, n1];
    this.ticketBars = [b0, b1];
    this.pointIcons = el('div', { class: 'vp-icons' });
    this.clock = el('div', { class: 'clock' });
    if (world.objective.mode === 'skirmish') {
      this.objective = null;
    } else {
      const title = el('div', { class: 'obj-title' });
      const detail = el('div', { class: 'obj-detail' });
      this.objective = { box: el('div', { class: `objective-panel mode-${world.objective.mode}` }, title, detail), title, detail };
    }

    const top = el(
      'div',
      { class: 'topbar' },
      el('div', { class: 'resources' }, mpBox, muBox, fuBox, popBox),
      this.objective ? this.objective.box : el('div', { class: 'score' }, t0, this.pointIcons, t1),
      el('div', { class: 'meta' }, this.clock, this.menuButton()),
    );

    this.selection = el('div', { class: 'selection' });
    const cmdGrid = el('div', { class: 'cmd-grid' });
    this.buildCommands(cmdGrid);

    const prodGrid = el('div', { class: 'prod-grid' });
    for (const id of team.faction.roster) {
      const def = UNITS[id];
      const node = el(
        'button',
        { class: 'prod', title: `${def.name}\n${def.description}\n\nCost: ${formatCost(def.cost)} · Pop ${def.pop} · ${def.buildTime}s` },
        el('span', { class: 'glyph', text: ROLE_ICON[def.role] }),
        el('span', { class: 'name', text: def.name }),
        el('span', { class: 'cost', text: formatCost(def.cost) }),
      );
      node.addEventListener('click', () => {
        const r = queueProduction(world, player, id);
        if (!r.ok) this.toast(r.reason ?? 'Cannot build', 'bad');
      });
      prodGrid.append(node);
      this.prodButtons.push({ id, node });
    }
    this.queue = el('div', { class: 'queue' });

    const bottom = el(
      'div',
      { class: 'bottombar' },
      el('div', { class: 'panel minimap-panel' }, minimap.canvas),
      el('div', { class: 'panel selection-panel' }, this.selection),
      el('div', { class: 'panel command-panel' }, el('div', { class: 'panel-title', text: 'Orders' }), cmdGrid),
      el(
        'div',
        { class: 'panel production-panel' },
        el('div', { class: 'panel-title', text: `${team.faction.name} Headquarters` }),
        prodGrid,
        this.queue,
      ),
    );
    this.toasts = el('div', { class: 'toasts' });
    this.root = el('div', { class: 'hud' }, top, this.toasts, bottom);
    parent.append(this.root);
    this.update(0, true);
  }

  onMenu: () => void = () => {};

  private menuButton(): HTMLButtonElement {
    const b = el('button', { class: 'menu-btn', text: 'Menu', title: 'Pause menu (Esc / P)' });
    b.addEventListener('click', () => this.onMenu());
    return b;
  }

  private buildCommands(grid: HTMLElement): void {
    const add = (label: string, key: string, tip: string, action: () => void, refresh: (b: HTMLButtonElement, own: Squad[]) => void) => {
      const node = el('button', { class: 'cmd', title: tip }, el('span', { class: 'key', text: key }), el('span', { text: label }));
      node.addEventListener('click', action);
      grid.append(node);
      this.commands.push({ node, refresh: (own) => refresh(node, own) });
    };
    const units = (own: Squad[]) => own.filter((s) => s.def.kind !== 'structure');

    add('Attack-Move', 'A', 'Move and engage anything on the way (A, then left-click)', () => this.input.attackMoveMode(), (b, own) => {
      b.disabled = units(own).length === 0;
      b.classList.toggle('active', this.ui.mode.kind === 'attackMove');
    });
    add('Stop', 'S', 'Cancel all orders', () => this.input.stop(), (b, own) => (b.disabled = units(own).length === 0));
    add('Retreat', 'R', 'Fall back to HQ. Retreating units take less damage and cannot be pinned.', () => this.input.retreat(), (b, own) => {
      b.disabled = units(own).length === 0;
    });
    add('Reinforce', 'E', 'Replace casualties. Must be near HQ or a supplied friendly point.', () => this.input.reinforce(), (b, own) => {
      const soft = own.filter((s) => (s.def.kind === 'infantry' || s.def.kind === 'team') && aliveCount(s) < s.def.models);
      b.disabled = soft.length === 0;
      const label = b.lastElementChild as HTMLElement;
      label.textContent = soft.length === 1 ? `Reinforce (${reinforceCost(soft[0].def)} MP)` : 'Reinforce';
    });
    add('Set Up', 'D', 'Set up a weapon team facing the cursor, or tear it down', () => this.input.setupMode(), (b, own) => {
      const teams = own.filter((s) => s.def.kind === 'team');
      b.disabled = teams.length === 0;
      const deployed = teams.some((s) => s.setup === 'deployed' || s.setup === 'settingUp');
      (b.lastElementChild as HTMLElement).textContent = deployed ? 'Tear Down' : 'Set Up';
      b.classList.toggle('active', this.ui.mode.kind === 'setup');
    });
    for (const hotkey of ['G', 'B']) {
      add('—', hotkey, '', () => this.input.abilityMode(hotkey), (b, own) => {
        const holder = own.find((s) => s.def.abilities.some((a) => ABILITIES[a].hotkey === hotkey));
        b.style.display = holder ? '' : 'none';
        if (!holder) return;
        const id = holder.def.abilities.find((a) => ABILITIES[a].hotkey === hotkey)!;
        const ab = ABILITIES[id];
        const cd = Math.max(0, holder.cooldowns[id] ?? 0);
        (b.lastElementChild as HTMLElement).textContent = cd > 0 ? `${ab.name} (${Math.ceil(cd)}s)` : `${ab.name} · ${formatCost(ab.cost)}`;
        b.title = ab.description;
        b.disabled = cd > 0 || !canAfford(this.world.teams[this.player].resources, ab.cost);
        b.classList.toggle('active', this.ui.mode.kind === 'ability' && this.ui.mode.abilityId === id);
      });
    }
  }

  toast(text: string, tone: Tone = 'info'): void {
    const t = el('div', { class: `toast ${tone}`, text });
    this.toasts.prepend(t);
    while (this.toasts.childElementCount > 6) this.toasts.lastElementChild!.remove();
    setTimeout(() => t.classList.add('fade'), 3500);
    setTimeout(() => t.remove(), 4200);
  }

  consume(events: readonly SimEvent[]): void {
    for (const e of events) {
      if (e.type === 'notify' && (e.team === this.player || e.team === -1)) this.toast(e.text, e.tone);
    }
  }

  update(dt: number, force = false): void {
    this.timer -= dt;
    if (this.timer > 0 && !force) return;
    this.timer = 0.1;
    const { world } = this;
    const team = world.teams[this.player];
    const r = team.resources;
    const inc = team.income;
    this.res.manpower.textContent = `${Math.floor(r.manpower)} (+${Math.round(inc.manpower)})`;
    this.res.munitions.textContent = `${Math.floor(r.munitions)} (+${Math.round(inc.munitions)})`;
    this.res.fuel.textContent = `${Math.floor(r.fuel)} (+${Math.round(inc.fuel)})`;
    this.res.pop.textContent = `${team.pop}/${ECONOMY.popCap}`;
    for (const t of [0, 1] as const) {
      this.tickets[t].textContent = String(world.teams[t].tickets);
      this.ticketBars[t].style.width = `${(world.teams[t].tickets / 500) * 100}%`;
    }
    this.pointIcons.replaceChildren(
      ...world.points
        .filter((p) => p.kind === 'victory')
        .map((p) => el('span', { class: `vp o${p.owner}`, title: p.name, text: 'V' })),
    );
    this.clock.textContent = formatTime(world.time);
    if (this.objective) this.renderObjective();

    const own = this.input.selectedOwn();
    for (const c of this.commands) c.refresh(own);
    for (const b of this.prodButtons) b.node.disabled = !canAfford(r, UNITS[b.id].cost);
    this.renderQueue();
    this.renderSelection();
  }

  private renderObjective(): void {
    const { world } = this;
    const o = world.objective;
    const s = world.scenario!;
    const { title, detail, box } = this.objective!;
    if (s.defense) {
      const hold = s.defense.hold.map((i) => world.points[i]);
      const threatened = hold.some((p) => p.contested || p.control < 1);
      title.textContent = o.wave === 0 ? 'Prepare your defences' : `Wave ${o.wave} / ${o.totalWaves}`;
      if (o.wave < o.totalWaves) detail.textContent = `Next wave in ${formatTime(Math.max(0, o.nextWaveIn))}`;
      else detail.textContent = `Final wave · ${o.waveSquads.length} enemy units remaining`;
      detail.textContent += ` · Hold ${hold.map((p) => p.name).join(', ')}${threatened ? ' — UNDER ATTACK' : ''}`;
      box.classList.toggle('alert', threatened);
    } else if (s.offensive) {
      const next = world.points[s.offensive.sectors[Math.min(o.sector, o.totalSectors - 1)]];
      title.textContent = `Sector ${Math.min(o.sector + 1, o.totalSectors)} / ${o.totalSectors} · ${next.name}`;
      detail.textContent = `Time remaining ${formatTime(Math.max(0, o.timeLeft))}`;
      box.classList.toggle('alert', o.timeLeft < 60);
    }
  }

  private renderQueue(): void {
    const hq = this.world.hqOf(this.player);
    const items = hq?.production ?? [];
    this.queue.replaceChildren(
      ...items.map((item, i) => {
        const def = UNITS[item.unitId];
        const pct = i === 0 ? (1 - item.remaining / def.buildTime) * 100 : 0;
        const chip = el(
          'button',
          { class: 'chip', title: `${def.name} — click to cancel (refund)` },
          el('span', { text: ROLE_ICON[def.role] }),
          el('div', { class: 'progress' }, el('div', { class: 'fill' })),
        );
        (chip.querySelector('.fill') as HTMLElement).style.width = `${pct}%`;
        chip.addEventListener('mousedown', () => cancelProduction(this.world, this.player, i));
        return chip;
      }),
    );
  }

  private renderSelection(): void {
    const squads = [...this.ui.selected].map((id) => this.world.get(id)).filter((s): s is Squad => !!s && !s.dead);
    const key = squads.map((s) => s.id).join(',');
    if (squads.length === 0) {
      if (this.selectionKey !== '') {
        this.selectionKey = '';
        this.selection.replaceChildren(el('div', { class: 'hint', html: 'Drag to select units · Right-click to move or attack · <b>F1</b> for controls' }));
      } else if (!this.selection.firstChild) {
        this.selection.replaceChildren(el('div', { class: 'hint', html: 'Drag to select units · Right-click to move or attack · <b>F1</b> for controls' }));
      }
      return;
    }
    if (squads.length === 1) {
      this.selectionKey = key;
      this.selection.replaceChildren(this.detailCard(squads[0]));
      return;
    }
    this.selectionKey = key;
    this.selection.replaceChildren(
      el('div', { class: 'multi' }, ...squads.map((s) => this.miniCard(s))),
    );
  }

  private miniCard(sq: Squad): HTMLElement {
    const card = el(
      'button',
      { class: `mini t${sq.team}`, title: sq.def.name },
      el('span', { class: 'glyph', text: ROLE_ICON[sq.def.role] }),
      el('div', { class: 'hp' }, el('div', { class: 'fill' })),
    );
    (card.querySelector('.fill') as HTMLElement).style.width = `${healthFraction(sq) * 100}%`;
    if (sq.suppState !== 'normal') card.classList.add(sq.suppState);
    card.addEventListener('mousedown', (e) => this.input.select([sq.id], e.shiftKey));
    return card;
  }

  private detailCard(sq: Squad): HTMLElement {
    const weapons = new Map<string, number>();
    for (const m of sq.models) if (m.alive) for (const w of m.weapons) weapons.set(w.def.name, (weapons.get(w.def.name) ?? 0) + 1);
    const lines: [string, string][] = [];
    if (sq.def.kind === 'infantry' || sq.def.kind === 'team') lines.push(['Squad', `${aliveCount(sq)} / ${sq.def.models}`]);
    const hp = healthFraction(sq);
    lines.push(['Health', `${Math.round(hp * 100)}%`]);
    if (sq.def.armor) lines.push(['Armour', sq.def.vehicle ? `${sq.def.armor.front} front / ${sq.def.armor.rear} rear` : `${sq.def.armor.front}`]);
    if (sq.def.kind === 'infantry' || sq.def.kind === 'team') {
      lines.push(['Morale', sq.suppState === 'normal' ? 'Steady' : sq.suppState === 'suppressed' ? 'Suppressed' : 'PINNED']);
    }
    if (sq.def.kind === 'team') lines.push(['Weapon', { packed: 'Packed', settingUp: 'Setting up…', deployed: 'Deployed', tearingDown: 'Packing up…' }[sq.setup]]);
    if (sq.def.vetXp.length) lines.push(['Veterancy', sq.vet > 0 ? '★'.repeat(sq.vet) : `${Math.floor(sq.xp)} / ${sq.def.vetXp[0]} xp`]);
    lines.push(['Weapons', [...weapons].map(([n, c]) => (c > 1 ? `${c}× ${n}` : n)).join(', ') || '—']);

    const owner = sq.team === this.player ? '' : ' (enemy)';
    const fill = el('div', { class: 'fill' });
    fill.style.width = `${hp * 100}%`;
    return el(
      'div',
      { class: `detail t${sq.team}` },
      el('div', { class: 'title' }, el('span', { class: 'glyph', text: ROLE_ICON[sq.def.role] }), el('span', { text: sq.def.name + owner })),
      el('div', { class: 'hpbar' }, fill),
      el('dl', {}, ...lines.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])),
    );
  }
}
