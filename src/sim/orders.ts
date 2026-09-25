import type { Order, Squad } from './entities';

/** Drops any in-progress path and cover positions so the squad re-plans. */
export function resetMovement(sq: Squad): void {
  sq.path = [];
  sq.pathGoal = null;
  sq.repathTimer = 0;
  for (const m of sq.models) m.coverSlot = null;
}

export function setOrder(sq: Squad, order: Order, queue = false): void {
  if (queue && sq.order.kind !== 'idle') {
    sq.queue.push(order);
    return;
  }
  sq.queue.length = 0;
  sq.order = order;
  resetMovement(sq);
}

/** Current order is complete: continue with the next queued order or go idle. */
export function finishOrder(sq: Squad): void {
  const next = sq.queue.shift();
  sq.order = next ?? { kind: 'idle' };
  if (next) resetMovement(sq);
  else {
    sq.path = [];
    sq.pathGoal = null;
  }
}
