/**
 * Call names for squads and tanks. Every new squad takes the next name on its
 * side's list, so the army reads like a real company. Add names to the lists to
 * give more squads their own name before they start repeating (numbered II, III…).
 */

export interface NameList {
  /** Infantry squads and weapon teams. */
  squad: readonly string[];
  /** Tanks. */
  tank: readonly string[];
  /** Full name from a short one, e.g. "Luna" → "Pangkat Luna". */
  squadName: (short: string) => string;
  tankName: (short: string) => string;
}

export const SQUAD_NAMES: Readonly<Record<string, NameList>> = {
  // Hukbong Maharlika: squads named after the heroes of the Revolution and before.
  usaffe: {
    squad: [
      'Luna', 'Bonifacio', 'Rizal', 'del Pilar', 'Mabini', 'Silang', 'Malvar', 'Sakay', 'Jacinto',
      'Lapu-Lapu', 'Dagohoy', 'Soliman', 'Gabriela', 'Tandang Sora', 'Llanera', 'Aguinaldo', 'Tinio', 'Mascardo',
    ],
    tank: ['Kidlat', 'Agila', 'Bagwis', 'Haribon', 'Tamaraw', 'Kalasag'],
    squadName: (short) => `Pangkat ${short}`,
    tankName: (short) => `Tangke ${short}`,
  },
  // Imperial Army: numbered sections (buntai) and named tanks.
  ija: {
    squad: ['Dai-ichi', 'Dai-ni', 'Dai-san', 'Dai-yon', 'Dai-go', 'Dai-roku', 'Dai-nana', 'Dai-hachi', 'Dai-kyū', 'Dai-jū'],
    tank: ['Hayate', 'Raiden', 'Tora', 'Kaze', 'Ikazuchi', 'Arashi'],
    squadName: (short) => `${short} Buntai`,
    tankName: (short) => `Sensha ${short}`,
  },
};

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

/** The `n`th name (0-based) from a list: after the list runs out, names repeat as II, III… */
export function pickName(list: readonly string[], n: number): string {
  if (list.length === 0) return '';
  const round = Math.floor(n / list.length);
  return list[n % list.length] + (ROMAN[round] ?? ` ${round + 1}`);
}
