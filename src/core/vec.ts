export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });
export const copy = (a: Vec2): Vec2 => ({ x: a.x, y: a.y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export function normalize(a: Vec2): Vec2 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

export const angleTo = (a: Vec2, b: Vec2): number => Math.atan2(b.y - a.y, b.x - a.x);
export const fromAngle = (angle: number, length = 1): Vec2 => ({
  x: Math.cos(angle) * length,
  y: Math.sin(angle) * length,
});

export function rotate(a: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export function wrapAngle(a: number): number {
  const TAU = Math.PI * 2;
  a = ((a % TAU) + TAU) % TAU;
  return a > Math.PI ? a - TAU : a;
}

/** Signed shortest rotation from `from` to `to`, in (-PI, PI]. */
export const angleDiff = (from: number, to: number): number => wrapAngle(to - from);

export function rotateTowards(current: number, target: number, maxStep: number): number {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxStep) return wrapAngle(target);
  return wrapAngle(current + Math.sign(d) * maxStep);
}

export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export function moveTowards(a: Vec2, b: Vec2, step: number): Vec2 {
  const d = dist(a, b);
  if (d <= step || d < 1e-9) return copy(b);
  return { x: a.x + ((b.x - a.x) / d) * step, y: a.y + ((b.y - a.y) / d) * step };
}

export function approach(current: number, target: number, step: number): number {
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}
