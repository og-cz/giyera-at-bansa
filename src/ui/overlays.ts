import { audio, type Channel } from '../audio/audio';
import type { TeamId } from '../data/types';
import type { World } from '../sim/world';
import { el, formatTime } from './dom';
import { controlsTable } from './menu';

/** Master, music and effects volume, saved between sessions. */
export function volumeControls(): HTMLElement {
  const row = (channel: Channel, label: string) => {
    const input = el('input');
    Object.assign(input, { type: 'range', min: '0', max: '100', step: '1' });
    input.value = String(Math.round(audio.getVolume(channel) * 100));
    const value = el('span', { class: 'volume-value', text: `${input.value}%` });
    input.addEventListener('input', () => {
      audio.setVolume(channel, Number(input.value) / 100);
      value.textContent = `${input.value}%`;
    });
    return el('label', { class: 'volume-row' }, el('span', { text: label }), input, value);
  };
  return el('div', { class: 'volume' }, el('h2', { text: 'Sound' }), row('master', 'Master'), row('music', 'Music'), row('effects', 'Effects'));
}

export function pauseOverlay(onResume: () => void, onQuit: () => void): HTMLElement {
  const resume = el('button', { class: 'deploy', text: 'Resume' });
  const quit = el('button', { class: 'secondary', text: 'Surrender' });
  resume.addEventListener('click', onResume);
  quit.addEventListener('click', onQuit);
  return el(
    'div',
    { class: 'overlay dim' },
    el('div', { class: 'menu-box small' }, el('h1', { text: 'Paused' }), volumeControls(), controlsTable(), el('div', { class: 'row' }, quit, resume)),
  );
}

export function helpOverlay(onClose: () => void): HTMLElement {
  const close = el('button', { class: 'deploy', text: 'Close' });
  close.addEventListener('click', onClose);
  return el('div', { class: 'overlay dim' }, el('div', { class: 'menu-box small' }, el('h1', { text: 'Controls' }), controlsTable(), close));
}

export interface EndActions {
  /** Shown on victory, e.g. next campaign mission or back to the mode screen. */
  continueLabel: string;
  onContinue(): void;
  onRetry(): void;
  onMenu(): void;
}

/**
 * Full-screen result. Defeat: black with red lettering. Victory: white with gold.
 */
export function endOverlay(world: World, player: TeamId, title: string, actions: EndActions): HTMLElement {
  const won = world.winner === player;
  const me = world.teams[player];
  const enemy = world.teams[player === 0 ? 1 : 0];
  const row = (k: string, a: string | number, b: string | number) =>
    el('tr', {}, el('th', { text: k }), el('td', { text: String(a) }), el('td', { text: String(b) }));

  const stats = el(
    'table',
    { class: 'end-stats' },
    el('tr', {}, el('th', {}), el('th', { text: me.faction.name }), el('th', { text: enemy.faction.name })),
    ...(world.objective.mode === 'skirmish' && world.win === 'points' ? [row('Tickets remaining', me.tickets, enemy.tickets)] : []),
    row('Units produced', me.stats.produced, enemy.stats.produced),
    row('Units lost', me.stats.lost, enemy.stats.lost),
    row('Enemy units destroyed', me.stats.killed, enemy.stats.killed),
  );

  const o = world.objective;
  const progress =
    o.mode === 'defense' ? ` · Wave ${o.wave} of ${o.totalWaves}` : o.mode === 'offensive' ? ` · ${o.sector} of ${o.totalSectors} sectors taken` : '';

  const buttons: HTMLButtonElement[] = [];
  const button = (label: string, cls: string, fn: () => void) => {
    const b = el('button', { class: cls, text: label });
    b.addEventListener('click', fn);
    buttons.push(b);
    return b;
  };
  if (won) {
    button('Return to menu', 'end-btn ghost', actions.onMenu);
    button(actions.continueLabel, 'end-btn primary', actions.onContinue);
  } else {
    button('Return to menu', 'end-btn ghost', actions.onMenu);
    button('Retry mission', 'end-btn primary', actions.onRetry);
  }

  return el(
    'div',
    { class: `end-screen ${won ? 'victory' : 'defeat'}` },
    el('div', { class: 'grain' }),
    el(
      'div',
      { class: 'end-box' },
      el('div', { class: 'end-kicker', text: title }),
      el('h1', { class: 'end-title', text: won ? 'Victory' : 'Defeat' }),
      el('div', { class: 'end-rule' }),
      el('div', { class: 'end-reason', text: world.endReason || (won ? 'The enemy has been defeated' : 'Your forces have been defeated') }),
      el('div', { class: 'end-time', text: `Battle lasted ${formatTime(world.time)}${progress}` }),
      stats,
      el('div', { class: 'end-actions' }, ...buttons),
    ),
  );
}
