import type { Difficulty } from '../../data/types';
import { el } from '../dom';

/** Full-screen sub-menu with a title bar and a back button (Esc also goes back). */
export function screenShell(title: string, subtitle: string, onBack: () => void): { root: HTMLElement; body: HTMLElement; close: () => void } {
  const back = el('button', { class: 'back-btn', text: '‹ Back' });
  const body = el('div', { class: 'screen-body' });
  const root = el(
    'div',
    { class: 'screen screen-in' },
    el('div', { class: 'vignette' }),
    el('div', { class: 'grain' }),
    el('header', { class: 'screen-head' }, back, el('div', {}, el('h1', { class: 'screen-title', text: title }), el('div', { class: 'screen-sub', text: subtitle }))),
    body,
  );
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      onBack();
    }
  };
  const close = () => {
    window.removeEventListener('keydown', onKey);
    root.remove();
  };
  back.addEventListener('click', () => {
    close();
    onBack();
  });
  window.addEventListener('keydown', onKey);
  return { root, body, close };
}

export function difficultyPicker(initial: Difficulty, onChange: (d: Difficulty) => void): HTMLElement {
  const levels: Difficulty[] = ['easy', 'normal', 'hard'];
  const wrap = el('div', { class: 'pills' });
  const buttons = levels.map((d) => {
    const b = el('button', { class: 'pill', text: d[0].toUpperCase() + d.slice(1) });
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.classList.toggle('picked', x === b));
      onChange(d);
    });
    b.classList.toggle('picked', d === initial);
    wrap.append(b);
    return b;
  });
  return wrap;
}

const MODE_LABEL = { skirmish: 'Battle', defense: 'Defense', offensive: 'Offensive' } as const;

export function modeBadge(mode: keyof typeof MODE_LABEL): HTMLElement {
  return el('span', { class: `badge mode-${mode}`, text: MODE_LABEL[mode] });
}
