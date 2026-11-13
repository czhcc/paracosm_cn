import test from 'node:test';
import assert from 'node:assert/strict';
import { humanizeOutcome } from './humanize-outcome.js';

test('humanizeOutcome synthesizes decision + death count + cause', () => {
  const str = humanizeOutcome({
    actorName: 'Aria',
    decision: 'Select Arcadia Planitia for the first permanent settlement landfall.',
    outcome: 'conservative_success',
    deaths: 3,
    dominantCause: 'dust lung',
    moraleDelta: -0.04,
  });
  assert.match(str, /Aria 选择了 arcadia planitia/i);
  assert.match(str, /3 人因 dust lung 死亡/);
});

test('humanizeOutcome handles zero deaths cleanly', () => {
  const str = humanizeOutcome({
    actorName: 'Dietrich',
    decision: 'Shelter in place in the reinforced core.',
    outcome: 'conservative_success',
    deaths: 0,
    dominantCause: null,
    moraleDelta: 0,
  });
  assert.match(str, /Dietrich 选择了/i);
  assert.doesNotMatch(str, /死亡/);
});

test('humanizeOutcome marks risky_failure with a distinct phrase', () => {
  const str = humanizeOutcome({
    actorName: 'Aria',
    decision: 'Push exterior maintenance crews into the storm.',
    outcome: 'risky_failure',
    deaths: 5,
    dominantCause: 'radiation exposure',
    moraleDelta: -0.12,
  });
  assert.match(str, /承担风险/);
  assert.match(str, /5 人因 radiation exposure 死亡/);
});

test('humanizeOutcome falls back to neutral template when decision is empty', () => {
  const str = humanizeOutcome({
    actorName: 'Dietrich',
    decision: '',
    outcome: 'conservative_success',
    deaths: 1,
    dominantCause: 'injury',
    moraleDelta: 0,
  });
  assert.match(str, /Dietrich/);
  assert.match(str, /1 人因 injury 死亡/);
});
