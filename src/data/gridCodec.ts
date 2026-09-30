import { T } from './terrain';

/** One character per tile in `grid` map features (maps converted from Watabou exports). */
export const GRID_LEGEND: Readonly<Record<string, number>> = {
  '.': T.Open,
  '=': T.Road,
  ',': T.Paddy,
  h: T.Hedge,
  j: T.Jungle,
  '~': T.Water,
  '#': T.Building,
  w: T.Wall,
};

/** Expands one run-length encoded row ("12.3=#": twelve open tiles, three road, one building). */
export function decodeGridRow(row: string): string[] {
  const out: string[] = [];
  for (const [, n, c] of row.matchAll(/(\d*)(\D)/g)) {
    for (let i = 0; i < (n ? Number(n) : 1); i++) out.push(c);
  }
  return out;
}
