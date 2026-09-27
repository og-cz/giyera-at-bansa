import { el } from '../dom';

export interface MenuActions {
  campaign(): void;
  theater(): void;
  skirmish(): void;
  howToPlay(): void;
}

interface Item {
  label: string;
  info: string;
  action: () => void;
  major: boolean;
}

const isDesktopApp = navigator.userAgent.includes('Electron');

/** CoH-style main menu: large mode entries on the left, context on the right. */
export function showMainMenu(layer: HTMLElement, actions: MenuActions): HTMLElement {
  const items: Item[] = [
    { label: 'Campaign', major: true, action: actions.campaign, info: 'Fight through the defence of Luzon in 1941–42 and the return in 1945. Missions unlock in order.' },
    { label: 'Theater of War', major: true, action: actions.theater, info: 'Standalone scenarios: hold a hilltop, defend a barrio, or assault a fortified highway. Earn medals on each difficulty.' },
    { label: 'Skirmish', major: true, action: actions.skirmish, info: 'A classic match against the AI. Capture victory points and drain the enemy’s tickets.' },
    { label: 'How to Play', major: false, action: actions.howToPlay, info: 'Controls, cover, suppression and the other rules of the battlefield.' },
  ];
  if (isDesktopApp) items.push({ label: 'Exit', major: false, action: () => window.close(), info: 'Return to Windows.' });

  const info = el('p', { class: 'menu-info-text' });
  const infoTitle = el('div', { class: 'menu-info-title' });
  const nav = el('nav', { class: 'menu-nav' });
  const buttons = items.map((item, i) => {
    const b = el('button', { class: `menu-item ${item.major ? 'major' : 'minor'}` }, el('span', { class: 'menu-item-label', text: item.label }));
    b.addEventListener('mouseenter', () => focus(i));
    b.addEventListener('focus', () => focus(i));
    b.addEventListener('click', () => {
      cleanup();
      item.action();
    });
    if (i === 3) nav.append(el('div', { class: 'menu-divider' }));
    nav.append(b);
    return b;
  });

  let current = 0;
  const focus = (i: number) => {
    current = i;
    buttons.forEach((b, j) => b.classList.toggle('active', j === i));
    infoTitle.textContent = items[i].label;
    info.textContent = items[i].info;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (current + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      buttons[next].focus();
    } else if (e.key === 'Enter') {
      buttons[current].click();
    }
  };
  window.addEventListener('keydown', onKey);

  const root = el(
    'div',
    { class: 'main-menu screen-in' },
    el('div', { class: 'vignette' }),
    el('div', { class: 'grain' }),
    el(
      'aside',
      { class: 'menu-side' },
      el('div', { class: 'menu-logo' }, el('div', { class: 'menu-logo-main', text: 'Taga Komando' }), el('div', { class: 'menu-logo-sub', text: 'Luzon · 1941 – 1945' })),
      nav,
      el('div', { class: 'menu-version', text: `v${__APP_VERSION__}` }),
    ),
    el('section', { class: 'menu-info' }, infoTitle, el('div', { class: 'menu-info-rule' }), info),
  );
  const cleanup = () => {
    window.removeEventListener('keydown', onKey);
    root.remove();
  };
  layer.append(root);
  focus(0);
  buttons[0].focus();
  return root;
}
