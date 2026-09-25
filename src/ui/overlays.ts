import type { TeamId } from '../data/types';
import type { World } from '../sim/world';
import { el, formatTime } from './dom';
import { controlsTable } from './menu';

export function pauseOverlay(onResume: () => void, onQuit: () => void): HTMLElement {
  const resume = el('button', { class: 'start', text: 'Resume' });
  const quit = el('button', { class: 'secondary', text: 'Surrender & return to menu' });
  resume.addEventListener('click', onResume);
  quit.addEventListener('click', onQuit);
  return el('div', { class: 'overlay dim' }, el('div', { class: 'menu-box small' }, el('h1', { text: 'Paused' }), controlsTable(), el('div', { class: 'row' }, resume, quit)));
}

export function helpOverlay(onClose: () => void): HTMLElement {
  const close = el('button', { class: 'start', text: 'Close' });
  close.addEventListener('click', onClose);
  return el('div', { class: 'overlay dim' }, el('div', { class: 'menu-box small' }, el('h1', { text: 'Controls' }), controlsTable(), close));
}

export function endOverlay(world: World, player: TeamId, onMenu: () => void): HTMLElement {
  const won = world.winner === player;
  const me = world.teams[player];
  const enemy = world.teams[player === 0 ? 1 : 0];
  const back = el('button', { class: 'start', text: 'Return to menu' });
  back.addEventListener('click', onMenu);
  const row = (k: string, a: string | number, b: string | number) => el('tr', {}, el('th', { text: k }), el('td', { text: String(a) }), el('td', { text: String(b) }));
  return el(
    'div',
    { class: 'overlay dim' },
    el(
      'div',
      { class: `menu-box small end ${won ? 'won' : 'lost'}` },
      el('h1', { text: won ? 'Victory' : 'Defeat' }),
      el('div', { class: 'tagline', text: `Battle lasted ${formatTime(world.time)}` }),
      el(
        'table',
        { class: 'stats' },
        el('tr', {}, el('th', {}), el('th', { text: me.faction.name }), el('th', { text: enemy.faction.name })),
        row('Tickets left', me.tickets, enemy.tickets),
        row('Units produced', me.stats.produced, enemy.stats.produced),
        row('Units lost', me.stats.lost, enemy.stats.lost),
        row('Enemy units destroyed', me.stats.killed, enemy.stats.killed),
      ),
      back,
    ),
  );
}
