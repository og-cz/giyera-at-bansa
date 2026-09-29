import { FACTIONS, FACTION_IDS } from '../../data/factions';
import { MAPS, MAP_IDS } from '../../data/maps';
import type { Difficulty, WinCondition } from '../../data/types';
import type { MatchSetup } from '../../game';
import { el } from '../dom';
import { difficultyPicker, screenShell } from './shell';
import { mapThumbnail } from './thumbnail';

const STORAGE_KEY = 'giyera.setup';

function loadLast(): Partial<MatchSetup> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<MatchSetup>;
  } catch {
    return {};
  }
}

const WIN_OPTIONS: [WinCondition, string, string][] = [
  ['points', 'Capture Points', 'Hold victory points to drain the enemy’s 500 tickets.'],
  ['annihilation', 'Annihilation', 'Wipe out the enemy army.'],
  ['none', 'None', 'No tickets, no time limit.'],
];

/** Skirmish setup: faction, battlefield, win condition and AI difficulty. */
export function showSkirmish(layer: HTMLElement, onStart: (setup: MatchSetup) => void, onBack: () => void): void {
  const last = loadLast();
  let faction = last.faction && FACTIONS[last.faction] ? last.faction : FACTION_IDS[0];
  let map = last.map && MAPS[last.map] ? last.map : MAP_IDS[0];
  let difficulty: Difficulty = last.difficulty ?? 'normal';
  let win: WinCondition = last.win ?? 'points';

  const { root, body, close } = screenShell('Skirmish', 'Battle the AI on your own terms', onBack);

  const pick = <T extends string>(items: readonly T[], get: () => T, set: (v: T) => void, render: (v: T) => HTMLElement) => {
    const wrap = el('div', { class: 'choices' });
    const nodes = items.map((item) => {
      const n = render(item);
      n.classList.add('choice');
      n.addEventListener('click', () => {
        set(item);
        nodes.forEach((x, i) => x.classList.toggle('picked', items[i] === get()));
      });
      n.classList.toggle('picked', item === get());
      wrap.append(n);
      return n;
    });
    return wrap;
  };

  const factions = pick(FACTION_IDS, () => faction, (v) => (faction = v), (id) => {
    const f = FACTIONS[id];
    return el('button', { class: 'card' }, el('h3', { text: f.name }), el('div', { class: 'sub', text: f.longName }), el('p', { text: f.description }));
  });
  const maps = pick(MAP_IDS, () => map, (v) => (map = v), (id) => {
    const m = MAPS[id];
    return el('button', { class: 'card map-card' }, mapThumbnail(m), el('div', {}, el('h3', { text: m.name }), el('p', { text: m.description })));
  });

  const start = el('button', { class: 'deploy', text: 'Deploy' });
  start.addEventListener('click', () => {
    const setup: MatchSetup = { faction, enemyFaction: FACTION_IDS.find((f) => f !== faction) ?? faction, map, difficulty, win };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    } catch {
      // Storage unavailable: the choice just isn't remembered.
    }
    close();
    onStart(setup);
  });

  body.append(
    el(
      'div',
      { class: 'panel-glass skirmish' },
      el('h2', { text: 'Faction' }),
      factions,
      el('h2', { text: 'Battlefield' }),
      maps,
      el('h2', { text: 'Victory condition' }),
      pick(
        WIN_OPTIONS.map(([id]) => id),
        () => win,
        (v) => (win = v),
        (id) => {
          const [, label, text] = WIN_OPTIONS.find(([w]) => w === id)!;
          return el('button', { class: 'card win-card' }, el('h3', { text: label }), el('p', { text }));
        },
      ),
      el('div', { class: 'row' }, el('h2', { text: 'Enemy AI' }), difficultyPicker(difficulty, (d) => (difficulty = d)), start),
    ),
  );
  layer.append(root);
}
