import { el } from '../dom';
import logoSvg from './tk-logo.svg?raw';

/** The Taga Komando wordmark. It is drawn in `currentColor`, so CSS sets its colour. */
export function gameLogo(tag: 'div' | 'h1', className: string): HTMLElement {
  const node = el(tag, { class: `game-logo ${className}` });
  node.innerHTML = logoSvg;
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', 'Taga Komando');
  return node;
}
