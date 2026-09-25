import { FACTIONS, FACTION_IDS } from '../data/factions';
import { MAPS, MAP_IDS } from '../data/maps';
import type { Difficulty } from '../data/types';
import { el } from './dom';

export interface MatchSetup {
  faction: string;
  enemyFaction: string;
  map: string;
  difficulty: Difficulty;
}

const STORAGE_KEY = 'giyera.setup';

function loadLast(): Partial<MatchSetup> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<MatchSetup>;
  } catch {
    return {};
  }
}

export const CONTROLS: [string, string][] = [
  ['Left-click / drag', 'Select units (Shift adds, double-click selects same type)'],
  ['Right-click', 'Move, or attack the enemy under the cursor (Shift queues)'],
  ['A', 'Attack-move'],
  ['S', 'Stop'],
  ['R', 'Retreat to HQ'],
  ['E', 'Reinforce (near HQ or a supplied point)'],
  ['D', 'Set up / tear down weapon teams'],
  ['G / B', 'Grenade / mortar barrage'],
  ['H', 'Select headquarters'],
  ['Ctrl+1–9 / 1–9', 'Assign / recall control group (double-tap to jump)'],
  ['Space', 'Centre camera on selection'],
  ['Arrows, screen edge, middle-drag', 'Pan camera · Mouse wheel zooms'],
  ['Esc / P', 'Pause'],
];

export function controlsTable(): HTMLElement {
  return el(
    'table',
    { class: 'controls' },
    ...CONTROLS.map(([k, v]) => el('tr', {}, el('th', { text: k }), el('td', { text: v }))),
  );
}

/** Skirmish setup screen: pick a faction, map and AI difficulty. */
export function showMainMenu(parent: HTMLElement, onStart: (setup: MatchSetup) => void): HTMLElement {
  const last = loadLast();
  let faction = last.faction && FACTIONS[last.faction] ? last.faction : FACTION_IDS[0];
  let map = last.map && MAPS[last.map] ? last.map : MAP_IDS[0];
  let difficulty: Difficulty = last.difficulty ?? 'normal';

  const choice = <T extends string>(
    items: readonly T[],
    current: () => T,
    set: (v: T) => void,
    render: (v: T) => HTMLElement,
  ): HTMLElement => {
    const wrap = el('div', { class: 'choices' });
    const refresh = () => wrap.querySelectorAll('.choice').forEach((n, i) => n.classList.toggle('picked', items[i] === current()));
    for (const item of items) {
      const node = render(item);
      node.classList.add('choice');
      node.addEventListener('click', () => {
        set(item);
        refresh();
      });
      wrap.append(node);
    }
    refresh();
    return wrap;
  };

  const factions = choice(
    FACTION_IDS,
    () => faction,
    (v) => (faction = v),
    (id) => {
      const f = FACTIONS[id];
      return el('button', { class: 'card' }, el('h3', { text: f.name }), el('div', { class: 'sub', text: f.longName }), el('p', { text: f.description }));
    },
  );
  const maps = choice(
    MAP_IDS,
    () => map,
    (v) => (map = v),
    (id) => {
      const m = MAPS[id];
      return el('button', { class: 'card' }, el('h3', { text: m.name }), el('p', { text: m.description }));
    },
  );
  const levels: Difficulty[] = ['easy', 'normal', 'hard'];
  const diff = choice(
    levels,
    () => difficulty,
    (v) => (difficulty = v),
    (d) => el('button', { class: 'pill', text: d[0].toUpperCase() + d.slice(1) }),
  );

  const start = el('button', { class: 'start', text: 'Deploy' });
  const root = el(
    'div',
    { class: 'overlay menu' },
    el(
      'div',
      { class: 'menu-box' },
      el('h1', { text: 'Giyera at Bansa' }),
      el('div', { class: 'tagline', text: 'Luzon, 1941–42 · Squad tactics real-time strategy' }),
      el('h2', { text: 'Faction' }),
      factions,
      el('h2', { text: 'Battlefield' }),
      maps,
      el('div', { class: 'row' }, el('h2', { text: 'Enemy AI' }), diff, start),
      el('details', {}, el('summary', { text: 'Controls & how to win' }), controlsTable(), el('p', {
        class: 'rules',
        text:
          'Capture victory points (V) to drain the enemy’s 500 tickets. Munitions (M) and fuel (F) points pay out only while connected to your HQ by friendly territory. ' +
          'Use cover (green = heavy, yellow = light, red = exposed), flank tanks for rear-armour hits, and retreat broken squads to save them.',
      })),
    ),
  );
  start.addEventListener('click', () => {
    const enemyFaction = FACTION_IDS.find((f) => f !== faction) ?? faction;
    const setup: MatchSetup = { faction, enemyFaction, map, difficulty };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    } catch {
      // Storage unavailable (private mode); settings just won't persist.
    }
    root.remove();
    onStart(setup);
  });
  parent.append(root);
  return root;
}
