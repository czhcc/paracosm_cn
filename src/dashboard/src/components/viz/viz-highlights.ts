/**
 * Computes one plain-English sentence per turn describing the largest
 * A-vs-B divergence. Pure function. Deterministic from inputs. The
 * `HighlightStrip` renders the result; SwarmViz wires the inputs from
 * `useVizSnapshots`.
 *
 * Priority order (largest delta wins):
 *   1. Population deaths this turn (mass mortality is the most material
 *      divergence the kernel reports)
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
 * Per-turn delta input to {@link computeTurnHighlight}. Built from a
 * `(current, prev)` `TurnSnapshot` pair via {@link snapToHighlight}
 * so cumulative `deaths` / `births` fields convert into per-turn
 * counts the highlight templates can read directly.
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
 * Convert a `TurnSnapshot` (cumulative counters, scenario time-unit) into
 * the {@link HighlightInput} shape (per-turn deltas, surfaced year). When
 * `prev` is undefined the deltas equal the absolute counts on the first
 * turn; the highlight templates handle that case by falling back to the
 * neutral / identical-first-event branches.
 */
export function snapToHighlight(current: TurnSnapshot, prev?: TurnSnapshot): HighlightInput {
  return {
    population: current.population,
    morale: current.morale,
    deathsThisTurn: current.deaths - (prev?.deaths ?? 0),
    birthsThisTurn: current.births - (prev?.births ?? 0),
    eventCategories: current.eventCategories ?? [],
    year: current.time,
  };
}

export function computeTurnHighlight(
  a: HighlightInput | null,
  b: HighlightInput | null,
  turn: number,
): string {
  if (!a || !b) return "等待首个回合快照。";
  // `??` instead of `||` so a legitimate year of 0 (synthetic test
  // fixtures, year-zero scenarios) isn't silently overridden by the
  // other side's year.
  const year = a.year ?? b.year;

  // 1. Mass deaths on one side
  if (a.deathsThisTurn !== b.deathsThisTurn) {
    const heavier = a.deathsThisTurn > b.deathsThisTurn ? 'A' : 'B';
    const heavyCount = Math.max(a.deathsThisTurn, b.deathsThisTurn);
    const lightCount = Math.min(a.deathsThisTurn, b.deathsThisTurn);
    return `第 ${turn} 回合，仿真时间 ${year}：决策者 ${heavier} 一侧有 ${heavyCount} 位居民死亡，另一侧有 ${lightCount} 位。`;
  }

  // 2. Morale collapse
  const moraleGap = Math.abs(a.morale - b.morale);
  if (moraleGap >= MORALE_GAP_THRESHOLD) {
    const lower = a.morale < b.morale ? 'A' : 'B';
    const lowerVal = a.morale < b.morale ? a.morale : b.morale;
    const higherVal = a.morale < b.morale ? b.morale : a.morale;
    return `第 ${turn} 回合，仿真时间 ${year}：决策者 ${lower} 的士气降至 ${pct(lowerVal)}，另一侧保持在 ${pct(higherVal)}。`;
  }

  // 3. Event-category divergence
  const aCats = a.eventCategories.join('|');
  const bCats = b.eventCategories.join('|');
  if (aCats && bCats && aCats !== bCats) {
    return `第 ${turn} 回合，仿真时间 ${year}：两位决策者面对不同事件 — A： ${a.eventCategories.join(', ')}; B: ${b.eventCategories.join(', ')}.`;
  }

  // 4. Identical first event
  if (turn === 1 && aCats && aCats === bCats) {
    return `第 1 回合，仿真时间 ${year}：首个事件相同（${a.eventCategories.join(', ')}）。两侧从相同状态开始。`;
  }

  // 5. Fallback
  return `第 ${turn} 回合，仿真时间 ${year}：两侧变化接近，详见各子页面。`;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
