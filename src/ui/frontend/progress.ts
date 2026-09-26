import { CAMPAIGN } from '../../data/scenarios';
import type { Difficulty } from '../../data/types';

/**
 * Campaign unlocks and Theater of War medals. Stored per player in local
 * storage; if storage is unavailable progress simply isn't remembered.
 */
interface Progress {
  campaign: string[];
  theater: Record<string, Difficulty>;
}

const KEY = 'giyera.progress';
const RANK: Record<Difficulty, number> = { easy: 1, normal: 2, hard: 3 };

function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Progress>;
    return { campaign: p.campaign ?? [], theater: p.theater ?? {} };
  } catch {
    return { campaign: [], theater: {} };
  }
}

function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage unavailable: progress is not persisted this session.
  }
}

export function isCampaignComplete(id: string): boolean {
  return load().campaign.includes(id);
}

export function isCampaignUnlocked(index: number): boolean {
  return index === 0 || isCampaignComplete(CAMPAIGN[index - 1].id);
}

export function completeCampaign(id: string): void {
  const p = load();
  if (!p.campaign.includes(id)) p.campaign.push(id);
  save(p);
}

/** Best difficulty the scenario was won on: easy = bronze, normal = silver, hard = gold. */
export function theaterMedal(id: string): Difficulty | null {
  return load().theater[id] ?? null;
}

export function recordTheater(id: string, difficulty: Difficulty): void {
  const p = load();
  const prev = p.theater[id];
  if (!prev || RANK[difficulty] > RANK[prev]) p.theater[id] = difficulty;
  save(p);
}

export const MEDAL_NAME: Record<Difficulty, string> = { easy: 'Bronze', normal: 'Silver', hard: 'Gold' };
