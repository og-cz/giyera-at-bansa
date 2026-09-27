import { el } from './dom';

export const CONTROLS: [string, string][] = [
  ['Left-click / drag', 'Select units (Shift adds, double-click selects same type)'],
  ['Right-click', 'Move, or attack the enemy under the cursor (Shift queues)'],
  ['Right-click + drag', 'Move there and face the drag direction; weapon teams set up aimed that way'],
  ['A', 'Attack-move'],
  ['S', 'Stop'],
  ['R', 'Retreat to HQ'],
  ['E', 'Reinforce (near HQ or a supplied point)'],
  ['D', 'Set up / tear down weapon teams (shows the firing cone; click to aim)'],
  ['G / B', 'Grenade / mortar barrage'],
  ['H', 'Select headquarters'],
  ['Ctrl+1–9 / 1–9', 'Assign / recall control group (double-tap to jump)'],
  ['Space', 'Centre camera on selection'],
  ['Arrows, screen edge, middle-drag', 'Pan camera · Mouse wheel zooms'],
  ['F11 / Alt+Enter', 'Fullscreen (desktop app)'],
  ['Esc / P', 'Pause'],
];

export function controlsTable(): HTMLElement {
  return el(
    'table',
    { class: 'controls' },
    ...CONTROLS.map(([k, v]) => el('tr', {}, el('th', { text: k }), el('td', { text: v }))),
  );
}
