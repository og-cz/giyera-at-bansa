/** Tiny helper for building DOM without a framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; text?: string; title?: string; html?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.html !== undefined) node.innerHTML = props.html;
  if (props.title) node.title = props.title;
  for (const c of children) node.append(c);
  return node;
}

export function formatCost(c: { manpower: number; munitions: number; fuel: number }): string {
  const parts: string[] = [];
  if (c.manpower) parts.push(`${c.manpower} MP`);
  if (c.munitions) parts.push(`${c.munitions} MU`);
  if (c.fuel) parts.push(`${c.fuel} FU`);
  return parts.join(' · ') || 'Free';
}

export function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
