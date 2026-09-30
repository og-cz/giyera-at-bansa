import type { StoryPage } from '../../data/types';
import { el } from '../dom';

/** Seconds per character while a line is being written out. */
const TYPE_SPEED = 0.022;

/**
 * Campaign story scenes: one line of narration or dialogue at a time, written
 * out like a typewriter. Next (click, Enter, Space, →) moves on, Back (←) goes
 * back and Skip (Esc) jumps past the whole scene. Pages with a `voice` file
 * play it from audio/story/.
 */
export function showStory(layer: HTMLElement, kicker: string, title: string, pages: readonly StoryPage[], onDone: () => void): void {
  if (pages.length === 0) return onDone();
  let index = 0;
  let shown = 0;
  let timer = 0;
  let voice: HTMLAudioElement | null = null;

  const speaker = el('div', { class: 'story-speaker' });
  const text = el('p', { class: 'story-text' });
  const count = el('span', { class: 'story-count' });
  const back = el('button', { class: 'back-btn', text: '‹ Back' });
  const next = el('button', { class: 'deploy story-next', text: 'Next' });
  const skip = el('button', { class: 'story-skip', text: 'Skip ››' });
  const card = el('div', { class: 'story-card' }, speaker, text);
  const root = el(
    'div',
    { class: 'story' },
    el('div', { class: 'grain' }),
    el(
      'div',
      { class: 'story-box' },
      el('div', { class: 'briefing-kicker', text: kicker }),
      el('h1', { class: 'story-title', text: title }),
      card,
      el('div', { class: 'row story-row' }, back, count, skip, next),
    ),
  );

  const stopVoice = () => {
    voice?.pause();
    voice = null;
  };

  const typing = () => shown < pages[index].text.length;

  const tick = () => {
    const full = pages[index].text;
    shown = Math.min(full.length, shown + 1);
    text.textContent = full.slice(0, shown);
    if (typing()) timer = window.setTimeout(tick, TYPE_SPEED * 1000);
  };

  const render = () => {
    window.clearTimeout(timer);
    stopVoice();
    const page = pages[index];
    card.classList.toggle('narration', !page.speaker);
    speaker.textContent = page.speaker ?? '';
    shown = 0;
    text.textContent = '';
    tick();
    count.textContent = `${index + 1} / ${pages.length}`;
    back.disabled = index === 0;
    next.textContent = index === pages.length - 1 ? 'Continue' : 'Next';
    card.classList.remove('turn');
    void card.offsetWidth;
    card.classList.add('turn');
    if (page.voice) {
      voice = new Audio(`audio/story/${page.voice}`);
      void voice.play().catch(() => {});
    }
  };

  const close = () => {
    window.clearTimeout(timer);
    stopVoice();
    window.removeEventListener('keydown', onKey);
    root.remove();
    onDone();
  };

  const forward = () => {
    // The first press finishes the line being written; the next one moves on.
    if (typing()) {
      window.clearTimeout(timer);
      shown = pages[index].text.length;
      text.textContent = pages[index].text;
      return;
    }
    if (index === pages.length - 1) return close();
    index++;
    render();
  };

  const backward = () => {
    if (index === 0) return;
    index--;
    render();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      forward();
    } else if (e.key === 'ArrowLeft') backward();
  };

  next.addEventListener('click', forward);
  card.addEventListener('click', forward);
  back.addEventListener('click', backward);
  skip.addEventListener('click', close);
  window.addEventListener('keydown', onKey);
  layer.append(root);
  render();
}
