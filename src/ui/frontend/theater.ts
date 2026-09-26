import { FACTIONS } from '../../data/factions';
import { THEATER } from '../../data/scenarios';
import { ALL_MAPS } from '../../data/theaterMaps';
import type { Difficulty, ScenarioDef } from '../../data/types';
import type { MatchSetup } from '../../game';
import { el } from '../dom';
import { objectiveLines } from './briefing';
import { MEDAL_NAME, theaterMedal } from './progress';
import { difficultyPicker, modeBadge, screenShell } from './shell';
import { mapThumbnail } from './thumbnail';

export const setupFor = (s: ScenarioDef, difficulty: Difficulty): MatchSetup => ({
  faction: s.factions[0],
  enemyFaction: s.factions[1],
  map: s.map,
  difficulty,
  scenario: s,
});

function medal(id: string): HTMLElement {
  const m = theaterMedal(id);
  return m ? el('span', { class: `medal medal-${m}`, text: `${MEDAL_NAME[m]} medal` }) : el('span', { class: 'medal none', text: 'No medal yet' });
}

/** Theater of War: pick a standalone scenario and a difficulty. */
export function showTheater(layer: HTMLElement, onStart: (setup: MatchSetup) => void, onBack: () => void): void {
  let selected = THEATER[0];
  let difficulty: Difficulty = 'normal';
  const { root, body, close } = screenShell('Theater of War', 'Standalone operations · Win on Easy, Normal and Hard for Bronze, Silver and Gold', onBack);

  const detail = el('div', { class: 'panel-glass detail-pane' });
  const list = el('div', { class: 'op-list' });

  const renderDetail = () => {
    const s = selected;
    const deploy = el('button', { class: 'deploy', text: 'Deploy' });
    deploy.addEventListener('click', () => {
      close();
      onStart(setupFor(s, difficulty));
    });
    detail.replaceChildren(
      el('div', { class: 'detail-thumb' }, mapThumbnail(ALL_MAPS[s.map], s.owners)),
      el('div', { class: 'detail-meta' }, modeBadge(s.mode), el('span', { class: 'detail-loc', text: s.location }), medal(s.id)),
      el('h2', { class: 'detail-title', text: s.name }),
      el('div', { class: 'detail-side', text: `Play as ${FACTIONS[s.factions[0]].name} · against ${FACTIONS[s.factions[1]].name}` }),
      ...s.briefing.map((p) => el('p', { class: 'detail-text', text: p })),
      el('ul', { class: 'briefing-obj' }, ...objectiveLines(s).map((t) => el('li', { text: t }))),
      el('div', { class: 'row' }, el('h3', { text: 'Difficulty' }), difficultyPicker(difficulty, (d) => (difficulty = d)), deploy),
    );
  };

  const entries = THEATER.map((s) => {
    const card = el(
      'button',
      { class: 'op-card' },
      mapThumbnail(ALL_MAPS[s.map], s.owners),
      el('div', { class: 'op-text' }, el('div', { class: 'op-top' }, modeBadge(s.mode), medal(s.id)), el('h3', { text: s.name }), el('p', { text: s.tagline })),
    );
    card.addEventListener('click', () => {
      selected = s;
      entries.forEach((e) => e.classList.toggle('picked', e === card));
      renderDetail();
    });
    list.append(card);
    return card;
  });
  entries[0].classList.add('picked');
  renderDetail();
  body.append(el('div', { class: 'split' }, list, detail));
  layer.append(root);
}
