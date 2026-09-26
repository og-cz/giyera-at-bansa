import { el } from '../dom';
import { controlsTable } from '../menu';
import { screenShell } from './shell';

const RULES: [string, string][] = [
  ['Victory points', 'In skirmish each side has 500 tickets. Holding more victory points (V) than the enemy drains theirs.'],
  ['Supply', 'Munitions (M) and fuel (F) points only pay out while connected to your HQ through territory you own. A struck-through point is cut off.'],
  ['Cover', 'Green dots are heavy cover (sandbags, walls, buildings), yellow is light (hedges, craters, jungle), red is exposed (rice paddies). Cover only protects from the far side.'],
  ['Suppression', 'Machine guns suppress and then pin infantry. Pinned squads can only crawl or retreat. Flank the gun or throw a grenade.'],
  ['Weapon teams', 'Machine guns and mortars must set up to fire and tear down to move. Mortars need a friendly unit to see the target.'],
  ['Armour', 'Tanks have thick front plates and thin rear plates. Hit them from behind. Rifles barely scratch them.'],
  ['Retreat & reinforce', 'Retreat (R) saves a broken squad: it runs home and takes less fire. Reinforce (E) near the HQ or a supplied point.'],
  ['Theater of War', 'Defense: hold the marked point against every wave. Offensive: take the sectors in order before the clock runs out.'],
];

export function showHowToPlay(layer: HTMLElement, onBack: () => void): void {
  const { root, body } = screenShell('How to Play', 'The rules of the battlefield', onBack);
  body.append(
    el(
      'div',
      { class: 'split' },
      el('div', { class: 'panel-glass' }, el('h2', { text: 'Rules' }), el('dl', { class: 'rules-list' }, ...RULES.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]))),
      el('div', { class: 'panel-glass' }, el('h2', { text: 'Controls' }), controlsTable()),
    ),
  );
  layer.append(root);
}
