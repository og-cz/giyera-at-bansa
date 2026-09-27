import { FACTIONS } from '../../data/factions';
import { THEATER } from '../../data/scenarios';
import { ALL_MAPS } from '../../data/theaterMaps';
import type { Difficulty, ScenarioDef, WinCondition } from '../../data/types';
import type { MatchSetup } from '../../game';
import { el } from '../dom';
import { objectiveLines } from './briefing';
import { MEDAL_NAME, theaterMedal } from './progress';
import { difficultyPicker, screenShell } from './shell';
import { mapThumbnail } from './thumbnail';

export const setupFor = (s: ScenarioDef, difficulty: Difficulty, win?: WinCondition): MatchSetup => ({
  faction: s.factions[0],
  enemyFaction: s.factions[1],
  map: s.map,
  difficulty,
  scenario: s,
  win: s.mode === 'skirmish' ? (win ?? s.win) : undefined,
});

/** The four kinds of operation, each with its own card. */
const CATEGORY: Record<string, { label: string; icon: string }> = {
  'tow-city': { label: 'City Defense', icon: '⛫' },
  'tow-summit': { label: 'Hill Defense', icon: '⛰' },
  'tow-highway': { label: 'Highway Assault', icon: '➤' },
  'tow-luzon': { label: 'Historical Skirmish', icon: '✦' },
};

const WIN_LABEL: [WinCondition, string][] = [
  ['points', 'Capture Points'],
  ['annihilation', 'Annihilation'],
  ['none', 'None'],
];

function medal(id: string): HTMLElement {
  const m = theaterMedal(id);
  return m ? el('span', { class: `medal medal-${m}`, text: `${MEDAL_NAME[m]} medal` }) : el('span', { class: 'medal none', text: 'No medal yet' });
}

/** Theater of War: four operation cards, CoH-style, and a briefing for the chosen one. */
export function showTheater(layer: HTMLElement, onStart: (setup: MatchSetup) => void, onBack: () => void): void {
  let selected = THEATER[0];
  let difficulty: Difficulty = 'normal';
  let win: WinCondition = 'points';
  const { root, body, close } = screenShell('Theater of War', 'Four operations · Win on Easy, Normal and Hard for Bronze, Silver and Gold', onBack);

  const detail = el('div', { class: 'panel-glass tow-detail' });

  const renderDetail = () => {
    const s = selected;
    win = s.win ?? 'points';
    const deploy = el('button', { class: 'deploy', text: 'Deploy' });
    deploy.addEventListener('click', () => {
      close();
      onStart(setupFor(s, difficulty, win));
    });
    const winRow =
      s.mode === 'skirmish'
        ? [
            el('h3', { class: 'tow-sub', text: 'Victory condition' }),
            (() => {
              const pills = el('div', { class: 'pills' });
              const buttons = WIN_LABEL.map(([id, label]) => {
                const b = el('button', { class: `pill ${id === win ? 'picked' : ''}`, text: label });
                b.addEventListener('click', () => {
                  win = id;
                  buttons.forEach((x) => x.classList.toggle('picked', x === b));
                });
                pills.append(b);
                return b;
              });
              return pills;
            })(),
          ]
        : [];
    detail.replaceChildren(
      el(
        'div',
        { class: 'tow-detail-text' },
        el('div', { class: 'detail-meta' }, el('span', { class: 'detail-loc', text: `${s.date} · ${s.location}` }), medal(s.id)),
        el('h2', { class: 'detail-title', text: s.name }),
        el('div', { class: 'detail-side', text: `Play as ${FACTIONS[s.factions[0]].name} · against ${FACTIONS[s.factions[1]].name}` }),
        ...s.briefing.map((p) => el('p', { class: 'detail-text', text: p })),
      ),
      el(
        'div',
        { class: 'tow-detail-side' },
        el('h3', { class: 'tow-sub', text: 'Objectives' }),
        el('ul', { class: 'briefing-obj' }, ...objectiveLines(s).map((t) => el('li', { text: t }))),
        ...winRow,
        el('h3', { class: 'tow-sub', text: 'Difficulty' }),
        difficultyPicker(difficulty, (d) => (difficulty = d)),
        el('div', { class: 'row' }, deploy),
      ),
    );
  };

  const cards = THEATER.map((s, i) => {
    const cat = CATEGORY[s.id] ?? { label: s.mode, icon: '◆' };
    const card = el(
      'button',
      { class: 'tow-card' },
      el('div', { class: 'tow-ribbon' }, el('span', { class: 'tow-cat', text: cat.label }), medal(s.id)),
      el('div', { class: 'tow-photo' }, mapThumbnail(ALL_MAPS[s.map], s.owners), el('span', { class: 'tow-icon', text: cat.icon })),
      el('div', { class: 'tow-plate', text: s.name }),
      el('p', { class: 'tow-desc', text: s.tagline }),
    );
    card.style.setProperty('--tilt', `${[-1.2, 0.8, -0.6, 1.1][i % 4]}deg`);
    card.style.animationDelay = `${i * 0.08}s`;
    card.addEventListener('click', () => {
      selected = s;
      cards.forEach((c) => c.classList.toggle('picked', c === card));
      renderDetail();
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return card;
  });
  cards[0].classList.add('picked');
  renderDetail();
  body.append(el('div', { class: 'tow-cards' }, ...cards), detail);
  layer.append(root);
}
