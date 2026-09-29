import { el } from '../dom';
import { controlsTable } from '../menu';
import { screenShell } from './shell';

const RULES: [string, string][] = [
  ['Victory conditions', 'Capture Points: each side has 500 tickets, and holding more victory points (V) than the enemy drains theirs. Annihilation: destroy every enemy unit and their HQ. None: no victory condition, fight as long as you like.'],
  ['Supply', 'Munitions (M) and fuel (F) points only pay out while connected to your HQ through territory you own. A struck-through point is cut off.'],
  ['Cover', 'Green dots are heavy cover (sandbags, walls, buildings), yellow is light (hedges, craters, jungle), red is exposed (rice paddies). Cover only protects from the far side.'],
  ['Suppression', 'Machine guns suppress and then pin infantry. Pinned squads can only crawl or retreat. Flank the gun or throw a grenade.'],
  ['Weapon teams', 'Machine guns and mortars must set up to fire and tear down to move. Mortars need a friendly unit to see the target.'],
  ['Armour', 'Tanks have thick front plates and thin rear plates. Hit them from behind. Rifles barely scratch them.'],
  ['Retreat & reinforce', 'Retreat (R) saves a broken squad: it runs home and takes less fire, and it cannot be given other orders until it arrives. Reinforce (E) near the HQ or a supplied point.'],
  ['Engineers', 'Engineers build sandbags (cover), barbed wire (stops infantry, tanks crush it), tank traps (stop tanks) and mines. They also repair tanks and the HQ: right-click the damaged one. A job is refunded if the engineers leave it.'],
  ['Upgrades', 'Rifle squads can buy one weapon upgrade (T / Y), such as a bazooka or a light machine gun, near the HQ or a supplied point. Reinforcements replace the upgraded weapon first.'],
  ['Theater of War', 'Defense: hold the marked point against every wave. Offensive: take the sectors in order before the clock runs out.'],
  ['Counters', 'No unit is simply the strongest. Machine guns beat infantry from the front but turn slowly, so flank them. Mortars break set-up guns but cannot hit close targets. Anti-tank squads kill tanks but lose to infantry. Check Strong vs / Weak vs on each unit.'],
  ['About the factions', 'Factions are dramatized. The battles and places are inspired by real events on Luzon, 1941–45.'],
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
