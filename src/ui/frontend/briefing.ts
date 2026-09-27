import type { ScenarioDef } from '../../data/types';
import { ALL_MAPS } from '../../data/theaterMaps';
import { el } from '../dom';

/** Plain-language objectives for a scenario. */
export function objectiveLines(s: ScenarioDef): string[] {
  const map = ALL_MAPS[s.map];
  if (s.defense) {
    const names = s.defense.hold.map((i) => map.points[i].name).join(' and ');
    return [
      `Hold ${names} against ${s.defense.waves.length} enemy waves.`,
      `The first wave arrives after ${s.defense.prepTime} seconds.`,
      'Destroying the enemy headquarters also wins.',
    ];
  }
  if (s.offensive) {
    const names = s.offensive.sectors.map((i) => map.points[i].name).join(' → ');
    return [
      `Capture in order: ${names}.`,
      `${Math.round(s.offensive.timeLimit / 60)} minutes on the clock, +${Math.round(s.offensive.bonusTime / 60)} minutes per sector taken.`,
      'Your reinforcement point moves forward with the front.',
    ];
  }
  if (s.win === 'annihilation') return ['Destroy every enemy unit and the enemy headquarters.', 'Capture points still pay out resources, but they do not decide the battle.'];
  if (s.win === 'none') return ['There is no victory condition. Fight for as long as you like.'];
  return ['Hold more victory points than the enemy to drain their 500 tickets.', 'Destroying the enemy headquarters also wins.'];
}

/** Cinematic pre-mission briefing: date, place, story, objectives. */
export function showBriefing(layer: HTMLElement, s: ScenarioDef, onDeploy: () => void, onBack: () => void): void {
  const deploy = el('button', { class: 'deploy', text: 'Deploy' });
  const back = el('button', { class: 'back-btn', text: '‹ Back' });
  const root = el(
    'div',
    { class: 'briefing' },
    el('div', { class: 'grain' }),
    el(
      'div',
      { class: 'briefing-box' },
      el('div', { class: 'briefing-kicker', text: `${s.date} · ${s.location}` }),
      el('h1', { class: 'briefing-title', text: s.name }),
      el('div', { class: 'title-rule' }),
      ...s.briefing.map((p, i) => {
        const para = el('p', { class: 'briefing-text', text: p });
        para.style.animationDelay = `${0.4 + i * 0.5}s`;
        return para;
      }),
      el('h2', { class: 'briefing-obj-title', text: 'Objectives' }),
      el('ul', { class: 'briefing-obj' }, ...objectiveLines(s).map((t) => el('li', { text: t }))),
      el('div', { class: 'row' }, back, deploy),
    ),
  );
  const close = () => {
    window.removeEventListener('keydown', onKey);
    root.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      onBack();
    } else if (e.key === 'Enter') {
      close();
      onDeploy();
    }
  };
  deploy.addEventListener('click', () => {
    close();
    onDeploy();
  });
  back.addEventListener('click', () => {
    close();
    onBack();
  });
  window.addEventListener('keydown', onKey);
  layer.append(root);
}
