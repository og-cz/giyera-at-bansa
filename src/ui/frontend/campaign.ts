import { CAMPAIGN } from '../../data/scenarios';
import { ALL_MAPS } from '../../data/theaterMaps';
import type { Difficulty } from '../../data/types';
import type { MatchSetup } from '../../game';
import { el } from '../dom';
import { objectiveLines } from './briefing';
import { isCampaignComplete, isCampaignUnlocked } from './progress';
import { difficultyPicker, modeBadge, screenShell } from './shell';
import { setupFor } from './theater';
import { mapThumbnail } from './thumbnail';

/** Campaign: a chronological chain of missions that unlock one by one. */
export function showCampaign(
  layer: HTMLElement,
  onStart: (setup: MatchSetup, index: number) => void,
  onBack: () => void,
  focusIndex?: number,
): void {
  const firstOpen = CAMPAIGN.findIndex((m, i) => isCampaignUnlocked(i) && !isCampaignComplete(m.id));
  let index = focusIndex ?? (firstOpen >= 0 ? firstOpen : 0);
  let difficulty: Difficulty = 'normal';
  const { root, body, close } = screenShell('Campaign', 'The Defence and Liberation of Luzon · 1941 – 1945', onBack);

  const detail = el('div', { class: 'panel-glass detail-pane' });
  const timeline = el('ol', { class: 'timeline' });

  const renderDetail = () => {
    const s = CAMPAIGN[index];
    const unlocked = isCampaignUnlocked(index);
    const begin = el('button', { class: 'deploy', text: unlocked ? 'Begin mission' : 'Locked' });
    begin.disabled = !unlocked;
    begin.addEventListener('click', () => {
      close();
      onStart(setupFor(s, difficulty), index);
    });
    detail.replaceChildren(
      el('div', { class: 'detail-thumb' }, mapThumbnail(ALL_MAPS[s.map], s.owners)),
      el('div', { class: 'detail-meta' }, el('span', { class: 'chapter-no', text: `Mission ${index + 1}` }), modeBadge(s.mode), el('span', { class: 'detail-loc', text: `${s.date} · ${s.location}` })),
      el('h2', { class: 'detail-title', text: s.name }),
      ...(unlocked
        ? [
            ...s.briefing.map((p) => el('p', { class: 'detail-text', text: p })),
            el('ul', { class: 'briefing-obj' }, ...objectiveLines(s).map((t) => el('li', { text: t }))),
          ]
        : [el('p', { class: 'detail-text locked-note', text: `Complete “${CAMPAIGN[index - 1].name}” to unlock this mission.` })]),
      el('div', { class: 'row' }, el('h3', { text: 'Difficulty' }), difficultyPicker(difficulty, (d) => (difficulty = d)), begin),
    );
  };

  const items = CAMPAIGN.map((s, i) => {
    const done = isCampaignComplete(s.id);
    const open = isCampaignUnlocked(i);
    const item = el(
      'li',
      { class: `tl-item ${done ? 'done' : open ? 'open' : 'locked'}` },
      el('div', { class: 'tl-dot', text: done ? '✓' : open ? String(i + 1) : '🔒' }),
      el('div', { class: 'tl-text' }, el('div', { class: 'tl-date', text: s.date }), el('div', { class: 'tl-name', text: s.name }), el('div', { class: 'tl-tag', text: s.tagline })),
    );
    item.addEventListener('click', () => {
      index = i;
      items.forEach((x, j) => x.classList.toggle('picked', j === i));
      renderDetail();
    });
    timeline.append(item);
    return item;
  });
  items[index].classList.add('picked');
  renderDetail();
  body.append(el('div', { class: 'split' }, timeline, detail));
  layer.append(root);
}
