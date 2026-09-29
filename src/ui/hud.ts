import { ABILITIES } from '../data/abilities';
import { ECONOMY, LOGISTICS } from '../data/balance';
import type { Resources, TeamId } from '../data/types';
import { UNITS } from '../data/units';
import { cancelProduction, queueProduction } from '../sim/commands';
import { aliveCount, healthFraction, type SimEvent, type Squad, type Tone } from '../sim/entities';
import { canAfford } from '../sim/systems/economy';
import { reinforceCost } from '../sim/systems/logistics';
import { forcesRemaining } from '../sim/systems/victory';
import type { World } from '../sim/world';
import type { Input } from '../input/input';
import type { UIState } from '../input/uiState';
import { el, formatTime } from './dom';
import type { Minimap } from './minimap';

const ROLE_ICON: Record<string, string> = { hq: 'HQ', line: 'R', mg: 'MG', mortar: 'M', at: 'AT', tank: 'T', engineer: 'EN' };

interface Tip {
  title: string;
  body?: string;
  strong?: string;
  weak?: string;
  cost?: Resources;
  key?: string;
  warn?: string;
}

interface GridButton {
  node: HTMLButtonElement;
  refresh(own: Squad[]): void;
}

/**
 * In-game HUD: objective and timer top
 * centre, unit roster top right, minimap / unit portrait / command grid along
 * the bottom, with rich tooltips on every button.
 */
export class Hud {
  readonly root: HTMLElement;
  onMenu: () => void = () => {};
  onHelp: () => void = () => {};

  private readonly res: Record<'manpower' | 'munitions' | 'fuel' | 'pop', HTMLElement>;
  private readonly tickets: [HTMLElement, HTMLElement];
  private readonly ticketBars: [HTMLElement, HTMLElement];
  private readonly pointIcons: HTMLElement;
  private readonly objective: { box: HTMLElement; title: HTMLElement; detail: HTMLElement } | null;
  private readonly clock: HTMLElement;
  private readonly roster: HTMLElement;
  private readonly rosterCards = new Map<number, HTMLElement>();
  private readonly unitPanel: HTMLElement;
  private readonly cardTitle: HTMLElement;
  private readonly orderGrid: HTMLElement;
  private readonly buildGrid: HTMLElement;
  private readonly orders: GridButton[] = [];
  private readonly builds: { id: string; node: HTMLButtonElement }[] = [];
  private readonly jobs: HTMLElement;
  private readonly jobList: HTMLElement;
  private readonly jobRows = new Map<string, HTMLElement>();
  private readonly toasts: HTMLElement;
  private readonly tooltip: HTMLElement;
  private tipSource: { node: HTMLElement; get: () => Tip } | null = null;
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

    // ─── Top centre: objective or VP bar, clock beneath ───
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
    // Ticket bars only make sense for capture-point battles; everything else gets an objective panel.
    if (world.objective.mode === 'skirmish' && world.win === 'points') {
      this.objective = null;
    } else {
      const title = el('div', { class: 'obj-title' });
      const detail = el('div', { class: 'obj-detail' });
      this.objective = { box: el('div', { class: `objective-panel mode-${world.objective.mode}` }, title, detail), title, detail };
    }
    const top = el('div', { class: 'hud-top' }, this.objective ? this.objective.box : el('div', { class: 'score' }, t0, this.pointIcons, t1), this.clock);

    // ─── Top right: menu buttons and unit roster ───
    const menu = el('button', { class: 'corner-btn', text: 'Menu' });
    const help = el('button', { class: 'corner-btn', text: '?' });
    menu.addEventListener('click', () => this.onMenu());
    help.addEventListener('click', () => this.onHelp());
    this.tip(menu, () => ({ title: 'Menu', body: 'Pause the battle, see the controls, or leave.', key: 'Esc' }));
    this.tip(help, () => ({ title: 'Controls', body: 'Show every key binding.', key: 'F1' }));
    this.roster = el('div', { class: 'roster' });
    const corner = el('div', { class: 'hud-corner' }, el('div', { class: 'corner-btns' }, help, menu), this.roster);

    // ─── Bottom: minimap · unit card · resources + command grid ───
    const stat = (cls: string, label: string, icon: string) => {
      const v = el('span', { class: 'val' });
      const node = el('div', { class: `res ${cls}` }, el('span', { class: 'icon', text: icon }), v);
      this.tip(node, () => ({ title: label, body: RESOURCE_HELP[cls] }));
      return [node, v] as const;
    };
    const [mpBox, mp] = stat('mp', 'Manpower', 'MP');
    const [muBox, mu] = stat('mu', 'Munitions', 'MU');
    const [fuBox, fu] = stat('fu', 'Fuel', 'FU');
    const [popBox, pop] = stat('pop', 'Population', 'POP');
    this.res = { manpower: mp, munitions: mu, fuel: fu, pop };

    this.unitPanel = el('div', { class: 'unit-panel' });
    this.orderGrid = el('div', { class: 'cmd-grid' });
    this.buildGrid = el('div', { class: 'cmd-grid build' });
    this.buildOrders();
    for (const id of team.faction.roster) this.buildButton(id);
    this.jobList = el('div', { class: 'job-list' });
    this.jobs = el('div', { class: 'jobs' }, el('div', { class: 'jobs-title', text: 'In progress' }), this.jobList);
    this.cardTitle = el('div', { class: 'panel-title' });

    const bottom = el(
      'div',
      { class: 'bottombar' },
      el('div', { class: 'panel minimap-panel' }, minimap.canvas),
      el('div', { class: 'panel unit-card' }, this.unitPanel),
      el(
        'div',
        { class: 'panel command-card' },
        el('div', { class: 'resources' }, mpBox, muBox, fuBox, popBox),
        this.cardTitle,
        this.orderGrid,
        this.buildGrid,
      ),
    );

    this.toasts = el('div', { class: 'toasts' });
    this.tooltip = el('div', { class: 'tooltip' });
    this.root = el('div', { class: 'hud' }, top, corner, this.toasts, this.jobs, bottom, this.tooltip);
    parent.append(this.root);
    this.update(0, true);
  }

  // ─── Tooltips ──────────────────────────────────────────────────

  /** Attach a rich tooltip; `get` is re-read while shown so cooldowns stay live. */
  private tip(node: HTMLElement, get: () => Tip): void {
    node.addEventListener('mouseenter', () => {
      this.tipSource = { node, get };
      this.renderTip();
    });
    node.addEventListener('mouseleave', () => {
      if (this.tipSource?.node === node) this.tipSource = null;
      this.tooltip.classList.remove('show');
    });
  }

  private renderTip(): void {
    const src = this.tipSource;
    if (!src || !src.node.isConnected) {
      this.tipSource = null;
      this.tooltip.classList.remove('show');
      return;
    }
    const t = src.get();
    const res = this.world.teams[this.player].resources;
    const parts: HTMLElement[] = [el('div', { class: 'tip-head' }, el('span', { class: 'tip-title', text: t.title }), ...(t.key ? [el('span', { class: 'tip-key', text: t.key })] : []))];
    if (t.body) parts.push(el('p', { class: 'tip-body', text: t.body }));
    if (t.cost) {
      const row = el('div', { class: 'tip-cost' });
      for (const [k, label] of [['manpower', 'MP'], ['munitions', 'MU'], ['fuel', 'FU']] as const) {
        if (!t.cost[k]) continue;
        row.append(el('span', { class: `c ${res[k] < t.cost[k] ? 'short' : ''}`, text: `${t.cost[k]} ${label}` }));
      }
      parts.push(row);
    }
    if (t.strong) parts.push(el('div', { class: 'tip-vs strong' }, el('b', { text: 'Strong vs ' }), t.strong));
    if (t.weak) parts.push(el('div', { class: 'tip-vs weak' }, el('b', { text: 'Weak vs ' }), t.weak));
    if (t.warn) parts.push(el('div', { class: 'tip-warn', text: t.warn }));
    this.tooltip.replaceChildren(...parts);
    const r = src.node.getBoundingClientRect();
    const w = this.tooltip.offsetWidth || 260;
    this.tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    this.tooltip.style.bottom = `${window.innerHeight - r.top + 8}px`;
    this.tooltip.classList.add('show');
  }

  // ─── Command grid ──────────────────────────────────────────────

  private gridButton(grid: HTMLElement, icon: string, label: string, key: string, action: () => void): HTMLButtonElement {
    const node = el('button', { class: 'cmd' }, el('span', { class: 'cmd-icon', text: icon }), el('span', { class: 'cmd-label', text: label }), el('span', { class: 'key', text: key }));
    node.addEventListener('click', action);
    grid.append(node);
    return node;
  }

  private buildOrders(): void {
    const units = (own: Squad[]) => own.filter((s) => s.def.kind !== 'structure');
    const add = (icon: string, label: string, key: string, tip: () => Tip, action: () => void, refresh: (b: HTMLButtonElement, own: Squad[]) => void) => {
      const node = this.gridButton(this.orderGrid, icon, label, key, action);
      this.tip(node, tip);
      this.orders.push({ node, refresh: (own) => refresh(node, own) });
    };

    add('⤳', 'Attack-Move', 'A', () => ({ title: 'Attack-Move', body: 'Move and engage anything on the way. Press A, then left-click the destination.', key: 'A' }), () => this.input.attackMoveMode(), (b, own) => {
      b.disabled = units(own).length === 0;
      b.classList.toggle('active', this.ui.mode.kind === 'attackMove');
    });
    add('■', 'Stop', 'S', () => ({ title: 'Stop', body: 'Cancel all orders.', key: 'S' }), () => this.input.stop(), (b, own) => (b.disabled = units(own).length === 0));
    add('↩', 'Retreat', 'R', () => ({ title: 'Retreat', body: 'Fall back to headquarters. Retreating units run faster, take less fire and cannot be pinned, but they take no other orders until they get there.', key: 'R' }), () => this.input.retreat(), (b, own) => {
      b.disabled = units(own).length === 0;
    });
    add('+', 'Reinforce', 'E', () => {
      const soft = this.input.selectedOwn().filter((s) => (s.def.kind === 'infantry' || s.def.kind === 'team') && aliveCount(s) < s.def.models);
      const cost = soft.length === 1 ? { manpower: reinforceCost(soft[0].def), munitions: 0, fuel: 0 } : undefined;
      return { title: 'Reinforce', body: 'Replace casualties one soldier at a time. Must be near headquarters or a supplied friendly point.', key: 'E', cost };
    }, () => this.input.reinforce(), (b, own) => {
      b.disabled = !own.some((s) => (s.def.kind === 'infantry' || s.def.kind === 'team') && aliveCount(s) < s.def.models);
    });
    add('◭', 'Set Up', 'D', () => ({
      title: 'Set Up / Tear Down',
      body: 'Set a weapon team up to fire, aimed at the cursor (the firing cone shows as you aim), or pack it up to move. Tip: right-click drag to move and set up in one order.',
      key: 'D',
    }), () => this.input.setupMode(), (b, own) => {
      const teams = own.filter((s) => s.def.kind === 'team');
      b.disabled = teams.length === 0;
      const deployed = teams.some((s) => s.setup === 'deployed' || s.setup === 'settingUp');
      (b.querySelector('.cmd-label') as HTMLElement).textContent = deployed ? 'Tear Down' : 'Set Up';
      b.classList.toggle('active', this.ui.mode.kind === 'setup');
    });
    for (const hotkey of ['G', 'B']) {
      const holderOf = (own: Squad[]) => own.find((s) => s.def.abilities.some((a) => ABILITIES[a].hotkey === hotkey));
      add(hotkey === 'G' ? '✹' : '☄', '—', hotkey, () => {
        const holder = holderOf(this.input.selectedOwn());
        if (!holder) return { title: '—' };
        const ab = ABILITIES[holder.def.abilities.find((a) => ABILITIES[a].hotkey === hotkey)!];
        const cd = Math.max(0, holder.cooldowns[ab.id] ?? 0);
        return { title: ab.name, body: ab.description, key: hotkey, cost: ab.cost, warn: cd > 0 ? `Recharging: ${Math.ceil(cd)}s` : undefined };
      }, () => this.input.abilityMode(hotkey), (b, own) => {
        const holder = holderOf(own);
        b.style.display = holder ? '' : 'none';
        if (!holder) return;
        const ab = ABILITIES[holder.def.abilities.find((a) => ABILITIES[a].hotkey === hotkey)!];
        const cd = Math.max(0, holder.cooldowns[ab.id] ?? 0);
        (b.querySelector('.cmd-label') as HTMLElement).textContent = cd > 0 ? `${Math.ceil(cd)}s` : ab.name;
        b.disabled = cd > 0 || !canAfford(this.world.teams[this.player].resources, ab.cost);
        b.classList.toggle('active', this.ui.mode.kind === 'ability' && this.ui.mode.abilityId === ab.id);
      });
    }
  }

  private buildButton(id: string): void {
    const def = UNITS[id];
    const node = this.gridButton(this.buildGrid, ROLE_ICON[def.role], def.name, '', () => {
      const r = queueProduction(this.world, this.player, id);
      if (!r.ok) this.toast(r.reason ?? 'Cannot build', 'bad');
    });
    this.tip(node, () => ({ title: def.name, body: `${def.description}\n\nPopulation ${def.pop} · Build time ${def.buildTime}s`, cost: def.cost, strong: def.strongVs, weak: def.weakVs }));
    this.builds.push({ id, node });
  }

  // ─── Notifications ─────────────────────────────────────────────

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

  // ─── Per-tick refresh ──────────────────────────────────────────

  update(dt: number, force = false): void {
    this.timer -= dt;
    if (this.timer > 0 && !force) return;
    this.timer = 0.1;
    const { world } = this;
    const team = world.teams[this.player];
    const r = team.resources;
    const inc = team.income;
    this.res.manpower.textContent = `${Math.floor(r.manpower)} +${Math.round(inc.manpower)}`;
    this.res.munitions.textContent = `${Math.floor(r.munitions)} +${Math.round(inc.munitions)}`;
    this.res.fuel.textContent = `${Math.floor(r.fuel)} +${Math.round(inc.fuel)}`;
    this.res.pop.textContent = `${team.pop}/${ECONOMY.popCap}`;
    for (const t of [0, 1] as const) {
      this.tickets[t].textContent = String(world.teams[t].tickets);
      this.ticketBars[t].style.width = `${(world.teams[t].tickets / 500) * 100}%`;
    }
    this.pointIcons.replaceChildren(
      ...world.points.filter((p) => p.kind === 'victory').map((p) => el('span', { class: `vp o${p.owner}`, title: p.name, text: 'V' })),
    );
    this.clock.textContent = formatTime(world.time);
    if (this.objective) this.renderObjective();

    const own = this.input.selectedOwn();
    const units = own.filter((s) => s.def.kind !== 'structure');
    // Units selected → their orders; HQ or nothing selected → the build menu.
    const building = units.length === 0;
    this.orderGrid.style.display = building ? 'none' : '';
    this.buildGrid.style.display = building ? '' : 'none';
    this.cardTitle.textContent = building ? `${team.faction.name} Headquarters` : 'Orders';
    for (const c of this.orders) c.refresh(own);
    for (const b of this.builds) b.node.disabled = !canAfford(r, UNITS[b.id].cost);
    this.renderJobs();
    this.renderRoster();
    this.renderUnitPanel();
    if (this.tipSource) this.renderTip();
  }

  private renderObjective(): void {
    const { world } = this;
    const o = world.objective;
    const s = world.scenario;
    const { title, detail, box } = this.objective!;
    if (!s?.defense && !s?.offensive) {
      if (world.win === 'annihilation') {
        const [mine, theirs] = forcesRemaining(world);
        title.textContent = 'Annihilation';
        detail.textContent = `Destroy every enemy unit and their HQ · Enemy forces: ${theirs} · Yours: ${mine}`;
      } else {
        title.textContent = 'Free battle';
        detail.textContent = 'No victory condition · Leave from the Menu when you are done';
      }
      return;
    }
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

  // ─── Jobs: production and reinforcement (upgrades later) ──────

  /** Everything the player is waiting on, as uniform progress rows. */
  private collectJobs(): Job[] {
    const jobs: Job[] = [];
    const hq = this.world.hqOf(this.player);
    (hq?.production ?? []).forEach((item, i) => {
      const def = UNITS[item.unitId];
      jobs.push({
        key: `unit:${i}:${item.unitId}`,
        kind: 'unit',
        icon: ROLE_ICON[def.role],
        title: def.name,
        detail: i === 0 ? 'Recruiting' : `Queued (${ordinal(i + 1)})`,
        progress: i === 0 ? 1 - item.remaining / def.buildTime : 0,
        remaining: i === 0 ? item.remaining : null,
        cancel: () => cancelProduction(this.world, this.player, i),
      });
    });
    for (const sq of this.world.squads) {
      if (sq.team !== this.player || sq.dead || !sq.reinforcing) continue;
      jobs.push({
        key: `reinforce:${sq.id}`,
        kind: 'reinforce',
        icon: ROLE_ICON[sq.def.role],
        title: `Reinforcing ${sq.def.name}`,
        detail: `${aliveCount(sq)}/${sq.def.models} men · next soldier arriving`,
        progress: reinforceProgress(sq),
        remaining: Math.max(0, sq.reinforceTimer),
        focus: sq.id,
      });
    }
    return jobs;
  }

  private renderJobs(): void {
    const jobs = this.collectJobs();
    this.jobs.classList.toggle('show', jobs.length > 0);
    const keys = new Set(jobs.map((j) => j.key));
    for (const [key, row] of this.jobRows) {
      if (keys.has(key)) continue;
      row.remove();
      this.jobRows.delete(key);
    }
    jobs.forEach((job, i) => {
      let row = this.jobRows.get(job.key);
      if (!row) {
        row = this.jobRow(job);
        this.jobRows.set(job.key, row);
      }
      if (this.jobList.children[i] !== row) this.jobList.insertBefore(row, this.jobList.children[i] ?? null);
      (row.querySelector('.job-detail') as HTMLElement).textContent = job.detail;
      (row.querySelector('.job-time') as HTMLElement).textContent = job.remaining === null ? '' : `${Math.ceil(job.remaining)}s`;
      (row.querySelector('.job-bar .fill') as HTMLElement).style.width = `${Math.round(job.progress * 100)}%`;
    });
  }

  private jobRow(job: Job): HTMLElement {
    const parts: HTMLElement[] = [
      el('span', { class: 'glyph', text: job.icon }),
      el(
        'div',
        { class: 'job-body' },
        el('div', { class: 'job-head' }, el('span', { class: 'job-title', text: job.title }), el('span', { class: 'job-time' })),
        el('div', { class: 'job-bar' }, el('div', { class: 'fill' })),
        el('div', { class: 'job-detail' }),
      ),
    ];
    if (job.cancel) {
      const cancel = job.cancel;
      const b = el('button', { class: 'job-cancel', text: '✕' });
      // mousedown: rows refresh every tick and a click could fall between two frames.
      b.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        cancel();
      });
      this.tip(b, () => ({ title: 'Cancel', body: 'Stop and get the full cost back.' }));
      parts.push(b);
    }
    const row = el('div', { class: `job ${job.kind}` }, ...parts);
    if (job.focus !== undefined) {
      const id = job.focus;
      row.addEventListener('mousedown', () => {
        this.input.select([id]);
        this.input.centerOnSelection();
      });
      this.tip(row, () => ({ title: job.title, body: 'Click to select the squad and jump to it.' }));
    }
    return row;
  }

  // ─── Unit roster (top right) ───────────────────────────────────

  private renderRoster(): void {
    const squads = this.world.squads.filter((s) => s.team === this.player && !s.dead && s.def.kind !== 'structure');
    const alive = new Set(squads.map((s) => s.id));
    for (const [id, card] of this.rosterCards) {
      if (alive.has(id)) continue;
      card.remove();
      this.rosterCards.delete(id);
    }
    for (const sq of squads) {
      let card = this.rosterCards.get(sq.id);
      if (!card) {
        card = this.rosterCard(sq);
        this.rosterCards.set(sq.id, card);
        this.roster.append(card);
      }
      this.refreshRosterCard(card, sq);
    }
  }

  private rosterCard(sq: Squad): HTMLElement {
    const card = el(
      'button',
      { class: 'roster-card' },
      el('span', { class: 'glyph', text: ROLE_ICON[sq.def.role] }),
      el(
        'div',
        { class: 'rc-body' },
        el('div', { class: 'rc-name', text: sq.def.name }),
        el('div', { class: 'rc-bar' }, el('div', { class: 'fill' })),
        el('div', { class: 'rc-reinforce' }, el('div', { class: 'fill' })),
      ),
      el('div', { class: 'rc-badges' }),
    );
    // mousedown, not click: the card is refreshed often and a click can get lost between frames.
    card.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.input.select([sq.id], e.shiftKey);
    });
    card.addEventListener('dblclick', () => this.input.centerOnSelection());
    this.tip(card, () => ({ title: sq.def.name, body: this.statusLine(sq) }));
    return card;
  }

  private refreshRosterCard(card: HTMLElement, sq: Squad): void {
    card.classList.toggle('selected', this.ui.selected.has(sq.id));
    card.classList.toggle('pinned', sq.suppState === 'pinned');
    card.classList.toggle('retreating', sq.retreating);
    const fill = card.querySelector('.rc-bar .fill') as HTMLElement;
    fill.style.width = `${healthFraction(sq) * 100}%`;
    const group = [...this.ui.groups].find(([, ids]) => ids.includes(sq.id))?.[0];
    const badges: string[] = [];
    if (group !== undefined) badges.push(String(group));
    if (sq.def.kind !== 'vehicle') badges.push(`${aliveCount(sq)}/${sq.def.models}`);
    if (sq.vet > 0) badges.push('★'.repeat(sq.vet));
    if (sq.retreating) badges.push('↩');
    else if (sq.suppState === 'pinned') badges.push('PIN');
    else if (sq.reinforcing) badges.push('+');
    card.classList.toggle('reinforcing', sq.reinforcing);
    (card.querySelector('.rc-reinforce .fill') as HTMLElement).style.width = `${Math.round(reinforceProgress(sq) * 100)}%`;
    (card.querySelector('.rc-badges') as HTMLElement).textContent = badges.join(' ');
  }

  private statusLine(sq: Squad): string {
    const parts = [`${Math.round(healthFraction(sq) * 100)}% health`];
    if (sq.def.kind !== 'vehicle') parts.push(`${aliveCount(sq)} of ${sq.def.models} men`);
    if (sq.retreating) parts.push('retreating');
    else if (sq.suppState !== 'normal') parts.push(sq.suppState);
    if (sq.def.kind === 'team') parts.push(sq.setup === 'deployed' ? 'set up' : 'packed');
    return parts.join(' · ') + '\nClick to select, double-click to jump there.';
  }

  // ─── Unit card (bottom centre) ─────────────────────────────────

  private renderUnitPanel(): void {
    const squads = [...this.ui.selected].map((id) => this.world.get(id)).filter((s): s is Squad => !!s && !s.dead);
    const key = squads.map((s) => s.id).join(',');
    if (squads.length === 0) {
      if (this.selectionKey !== 'none') {
        this.selectionKey = 'none';
        this.unitPanel.replaceChildren(el('div', { class: 'hint', html: 'Select a unit, or pick one from the roster at the top right.<br>Right-click to move · right-click drag to move and face · <b>F1</b> for controls' }));
      }
      return;
    }
    this.selectionKey = key;
    if (squads.length === 1) {
      this.unitPanel.replaceChildren(this.portraitCard(squads[0]));
      return;
    }
    this.unitPanel.replaceChildren(el('div', { class: 'multi' }, ...squads.map((s) => this.miniCard(s))));
  }

  private miniCard(sq: Squad): HTMLElement {
    const fill = el('div', { class: 'fill' });
    fill.style.width = `${healthFraction(sq) * 100}%`;
    const card = el('button', { class: `mini t${sq.team}` }, el('span', { class: 'glyph', text: ROLE_ICON[sq.def.role] }), el('div', { class: 'hp' }, fill));
    if (sq.suppState !== 'normal') card.classList.add(sq.suppState);
    card.addEventListener('mousedown', (e) => this.input.select([sq.id], e.shiftKey));
    this.tip(card, () => ({ title: sq.def.name, body: this.statusLine(sq) }));
    return card;
  }

  private reinforceBar(sq: Squad): HTMLElement {
    const fill = el('div', { class: 'fill' });
    fill.style.width = `${Math.round(reinforceProgress(sq) * 100)}%`;
    return el(
      'div',
      { class: 'portrait-reinforce' },
      el('span', { text: `Reinforcing · ${aliveCount(sq)}/${sq.def.models} men` }),
      el('div', { class: 'job-bar' }, fill),
    );
  }

  private portraitCard(sq: Squad): HTMLElement {
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
    if (sq.def.strongVs) lines.push(['Strong vs', sq.def.strongVs]);
    if (sq.def.weakVs) lines.push(['Weak vs', sq.def.weakVs]);

    const enemy = sq.team !== this.player;
    const fill = el('div', { class: 'fill' });
    fill.style.width = `${hp * 100}%`;
    return el(
      'div',
      { class: `portrait-card t${sq.team}` },
      el(
        'div',
        { class: 'portrait' },
        el('span', { class: 'portrait-glyph', text: ROLE_ICON[sq.def.role] }),
        el('span', { class: 'portrait-vet', text: '★'.repeat(sq.vet) }),
        el('div', { class: 'hpbar' }, fill),
      ),
      el(
        'div',
        { class: 'portrait-text' },
        el('div', { class: 'portrait-faction', text: this.world.teams[sq.team].faction.name + (enemy ? ' · enemy' : '') }),
        el('div', { class: 'portrait-name', text: sq.def.name }),
        el('p', { class: 'portrait-desc', text: sq.def.description }),
        ...(sq.reinforcing ? [this.reinforceBar(sq)] : []),
        el('dl', {}, ...lines.flatMap(([k, v]) => [el('dt', { text: k, class: VS_CLASS[k] ?? '' }), el('dd', { text: v, class: WIDE_ROWS.has(k) ? 'wide' : '' })])),
      ),
    );
  }
}

interface Job {
  key: string;
  /** 'upgrade' is reserved for squad upgrades (e.g. extra bazookas) once they exist. */
  kind: 'unit' | 'reinforce' | 'upgrade';
  icon: string;
  title: string;
  detail: string;
  progress: number;
  remaining: number | null;
  cancel?: () => void;
  focus?: number;
}

const ordinal = (n: number): string => `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

/** How far the next reinforcement is, 0..1. */
const reinforceProgress = (sq: Squad): number =>
  sq.reinforcing ? 1 - Math.max(0, sq.reinforceTimer) / LOGISTICS.reinforceTime : 0;

const VS_CLASS: Record<string, string> = { 'Strong vs': 'strong', 'Weak vs': 'weak' };

/** Unit card rows long enough to need the full width. */
const WIDE_ROWS = new Set(['Weapons', 'Strong vs', 'Weak vs']);

const RESOURCE_HELP: Record<string, string> = {
  mp: 'Recruits and reinforces soldiers. Income comes from your base; a larger army costs more upkeep.',
  mu: 'Pays for grenades, barrages and anti-tank weapons. Earned from munitions points (M).',
  fu: 'Pays for tanks. Earned from fuel points (F).',
  pop: 'Army size. Every unit takes population; you cannot exceed the cap.',
};
