import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeTurnHighlight, snapToHighlight, type HighlightInput } from './viz-highlights';
import type { TurnSnapshot } from './viz-types';

const baseInput: HighlightInput = {
  population: 100,
  morale: 0.85,
  deathsThisTurn: 0,
  birthsThisTurn: 0,
  eventCategories: [],
  year: 2035,
};

describe('computeTurnHighlight', () => {
  it('mass deaths on one side win over morale wobble', () => {
    const a: HighlightInput = { ...baseInput, deathsThisTurn: 0, year: 2051 };
    const b: HighlightInput = { ...baseInput, deathsThisTurn: 4, year: 2051 };
    const out = computeTurnHighlight(a, b, 3);
    assert.match(out, /第 3 回合/);
    assert.match(out, /决策者 B/);
    assert.match(out, /4/);
  });

  it('morale crash beats no-deaths/no-events case', () => {
    const a: HighlightInput = { ...baseInput, morale: 0.17, year: 2067 };
    const b: HighlightInput = { ...baseInput, morale: 0.47, year: 2067 };
    const out = computeTurnHighlight(a, b, 5);
    assert.match(out, /士气降至/i);
    assert.match(out, /17%|47%/);
  });

  it('event-category divergence is reported when state matches', () => {
    const a: HighlightInput = { ...baseInput, eventCategories: ['environmental'], year: 2043 };
    const b: HighlightInput = { ...baseInput, eventCategories: ['social'], year: 2043 };
    const out = computeTurnHighlight(a, b, 2);
    assert.match(out, /不同事件/i);
  });

  it('identical first event short-circuits to "identical"', () => {
    const a: HighlightInput = { ...baseInput, eventCategories: ['onboarding'] };
    const b: HighlightInput = { ...baseInput, eventCategories: ['onboarding'] };
    const out = computeTurnHighlight(a, b, 1);
    assert.match(out, /首个事件相同/i);
  });

  it('null snapshots fall through to neutral copy', () => {
    const out = computeTurnHighlight(null, null, 0);
    assert.match(out, /等待首个回合/i);
  });

  it('snapToHighlight takes each turn\'s own deaths and births, never a difference from the turn before', () => {
    // systems_snapshot counts the deaths of its own turn: one death in turn
    // 5 and none in turn 6 is a turn 6 with no deaths, not -1.
    const prev: TurnSnapshot = {
      turn: 5,
      time: 2067,
      cells: [],
      population: 30,
      morale: 0.85,
      deaths: 1,
      births: 2,
    };
    const current: TurnSnapshot = {
      turn: 6,
      time: 2075,
      cells: [],
      population: 31,
      morale: 0.9,
      deaths: 0,
      births: 1,
      eventCategories: ['technological'],
    };
    const input = snapToHighlight(current, prev);
    assert.equal(input.deathsThisTurn, 0);
    assert.equal(input.birthsThisTurn, 1);
    assert.deepEqual(input.eventCategories, ['technological']);
    assert.equal(input.year, 2075);
  });

  it('names who lost how many with the scenario\'s nouns, and none for a side with no deaths', () => {
    const a: HighlightInput = { ...baseInput, deathsThisTurn: 0, year: 2075 };
    const b: HighlightInput = { ...baseInput, deathsThisTurn: 1, year: 2075 };
    const words = { nameA: 'Aria Chen', nameB: 'Dietrich Voss', person: 'crew member', people: 'crew', places: 'habitats' };
    assert.equal(computeTurnHighlight(a, b, 6, words), '第 6 回合，仿真时间 2075：Dietrich Voss 损失 1 crew member，Aria Chen 损失 0 人。');
    assert.equal(
      computeTurnHighlight({ ...a, deathsThisTurn: 3 }, { ...b, deathsThisTurn: 1 }, 6, words),
      '第 6 回合，仿真时间 2075：Aria Chen 损失 3 crew，Dietrich Voss 损失 1 crew member。',
    );
  });

  it('uses the actors\' names and the scenario\'s places in every other branch', () => {
    const words = { nameA: 'Aria Chen', nameB: 'Dietrich Voss', person: 'crew member', people: 'crew', places: 'habitats' };
    assert.equal(
      computeTurnHighlight({ ...baseInput, morale: 0.17, year: 2067 }, { ...baseInput, morale: 0.47, year: 2067 }, 5, words),
      "第 5 回合，仿真时间 2067：Aria Chen 的士气降至 17%，Dietrich Voss 保持在 47%。",
    );
    assert.equal(
      computeTurnHighlight({ ...baseInput, eventCategories: ['environmental'], year: 2043 }, { ...baseInput, eventCategories: ['social'], year: 2043 }, 2, words),
      '第 2 回合，仿真时间 2043：两侧面对不同事件。Aria Chen：environmental，Dietrich Voss：social。',
    );
    assert.match(
      computeTurnHighlight({ ...baseInput, eventCategories: ['onboarding'] }, { ...baseInput, eventCategories: ['onboarding'] }, 1, words),
      /两侧的habitats从相同状态开始。/,
    );
    assert.equal(computeTurnHighlight(baseInput, baseInput, 4, words), '第 4 回合，仿真时间 2035：Aria Chen 与 Dietrich Voss 的变化接近，详见各子页面。');
  });
});
