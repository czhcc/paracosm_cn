/**
 * Computes one plain-English sentence per turn describing the largest
 * A-vs-B divergence. Pure function. Deterministic from inputs. The
 * `HighlightStrip` renders the result; SwarmViz wires the inputs from
 * `useVizSnapshots`.
 *
 * Priority order (largest delta wins):
 *   1. Deaths this turn, when the two sides' counts differ (mass mortality
 *      is the most material divergence the kernel reports)
 *   2. Morale collapse (≥0.20 absolute gap between A and B)
 *   3. Event-category divergence (different categories on the same turn)
 *   4. "Identical first event" if turn === 1 and categories match
 *   5. Neutral fallback
 *
 * Wording is templated, never LLM-generated; tests pin the substrings
 * each branch produces so a refactor that breaks copy fails loudly.
 *
 * @module viz/viz-highlights
 */
import type { TurnSnapshot } from './viz-types';

/**
 * Per-turn input to {@link computeTurnHighlight}, built from a
 * `TurnSnapshot` via {@link snapToHighlight}.
 */
export interface HighlightInput {
  population: number;
  morale: number;
  deathsThisTurn: number;
  birthsThisTurn: number;
  eventCategories: ReadonlyArray<string>;
  year: number;
}

const MORALE_GAP_THRESHOLD = 0.2;

/**
 * Convert a `TurnSnapshot` into the {@link HighlightInput} shape. The
 * engine's `systems_snapshot` counts each turn's own births and deaths
 * (the kernel's events of that turn), so they pass through as they are;
 * `prev` is kept for callers that pass the turn before.
 */
export function snapToHighlight(current: TurnSnapshot, prev?: TurnSnapshot): HighlightInput {
  void prev;
  return {
    population: current.population,
    morale: current.morale,
    deathsThisTurn: current.deaths,
    birthsThisTurn: current.births,
    eventCategories: current.eventCategories ?? [],
    year: current.time,
  };
}

/** The names and nouns a highlight's words use. */
export interface HighlightWords {
  /** Name of the actor on panel A. */
  nameA: string;
  /** Name of the actor on panel B. */
  nameB: string;
  /** The scenario's singular population noun ("colonist"). */
  person: string;
  /** The scenario's plural population noun ("colonists"). */
  people: string;
  /** The scenario's plural settlement noun ("colonies"). */
  places: string;
}

const DEFAULT_WORDS: HighlightWords = { nameA: '决策者 A', nameB: '决策者 B', person: '位居民', people: '位居民', places: '定居点' };

export function computeTurnHighlight(
  a: HighlightInput | null,
  b: HighlightInput | null,
  turn: number,
  words: HighlightWords = DEFAULT_WORDS,
): string {
  if (!a || !b) return "等待首个回合快照。";
  // `??` instead of `||` so a legitimate year of 0 (synthetic test
  // fixtures, year-zero scenarios) isn't silently overridden by the
  // other side's year.
  const year = a.year ?? b.year;

  // 1. Mass deaths on one side
  if (a.deathsThisTurn !== b.deathsThisTurn) {
    const aHeavier = a.deathsThisTurn > b.deathsThisTurn;
    const heavyName = aHeavier ? words.nameA : words.nameB;
    const lightName = aHeavier ? words.nameB : words.nameA;
    const heavyCount = Math.max(a.deathsThisTurn, b.deathsThisTurn);
    const lightCount = Math.min(a.deathsThisTurn, b.deathsThisTurn);
    const lost = (n: number) => (n === 0 ? '0 人' : `${n} ${n === 1 ? words.person : words.people}`);
    return `第 ${turn} 回合，仿真时间 ${year}：${heavyName} 损失 ${lost(heavyCount)}，${lightName} 损失 ${lost(lightCount)}。`;
  }

  // 2. Morale collapse
  const moraleGap = Math.abs(a.morale - b.morale);
  if (moraleGap >= MORALE_GAP_THRESHOLD) {
    const aLower = a.morale < b.morale;
    const lowerName = aLower ? words.nameA : words.nameB;
    const higherName = aLower ? words.nameB : words.nameA;
    const lowerVal = aLower ? a.morale : b.morale;
    const higherVal = aLower ? b.morale : a.morale;
    return `第 ${turn} 回合，仿真时间 ${year}：${lowerName} 的士气降至 ${pct(lowerVal)}，${higherName} 保持在 ${pct(higherVal)}。`;
  }

  // 3. Event-category divergence
  const aCats = a.eventCategories.join('|');
  const bCats = b.eventCategories.join('|');
  if (aCats && bCats && aCats !== bCats) {
    return `第 ${turn} 回合，仿真时间 ${year}：两侧面对不同事件。${words.nameA}：${a.eventCategories.join('、')}，${words.nameB}：${b.eventCategories.join('、')}。`;
  }

  // 4. Identical first event
  if (turn === 1 && aCats && aCats === bCats) {
    return `第 1 回合，仿真时间 ${year}：首个事件相同（${a.eventCategories.join(', ')}）。两侧的${words.places}从相同状态开始。`;
  }

  // 5. Fallback
  return `第 ${turn} 回合，仿真时间 ${year}：${words.nameA} 与 ${words.nameB} 的变化接近，详见各子页面。`;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
