import { audio } from './audio';

/** Things that make a click when pressed: buttons and the clickable cards and menu entries. */
const PRESSABLE = 'button, .menu-item, .choice, .card, .roster-card, .qslot, .mini, .pill';
/** Buttons that start something get a heavier confirm sound. */
const CONFIRM = '.deploy';

/** A click for every press in the menus and the in-battle interface. */
export function installUiSounds(): void {
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0) return;
      const target = (e.target as Element | null)?.closest(PRESSABLE) as HTMLButtonElement | null;
      if (!target || target.disabled) return;
      if (target.matches(CONFIRM)) audio.play('ui_confirm', 0.5, 0, 0.05);
      else audio.play('ui_click', 0.45, 0, 0.04);
    },
    true,
  );
}
