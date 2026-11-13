import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import * as React from 'react';

import { DiffBadge } from './DiffBadge.js';

test('DiffBadge: same → ✓ 相同 with `same` class and aria-label', () => {
  const html = renderToString(<DiffBadge classification="same" />);
  assert.match(html, /✓ 相同/);
  assert.match(html, /aria-label="相同事件、相同结果"/);
});

test('DiffBadge: different-outcome → ⚠ 结果不同', () => {
  const html = renderToString(<DiffBadge classification="different-outcome" />);
  assert.match(html, /⚠ 结果不同/);
  assert.match(html, /aria-label="相同事件、不同结果"/);
});

test('DiffBadge: different-event → ⚠ 事件不同', () => {
  const html = renderToString(<DiffBadge classification="different-event" />);
  assert.match(html, /⚠ 事件不同/);
});

test('DiffBadge: pending → … 运行中', () => {
  const html = renderToString(<DiffBadge classification="pending" />);
  assert.match(html, /… 运行中/);
});

test('DiffBadge: one-sided → · · · 等待中', () => {
  const html = renderToString(<DiffBadge classification="one-sided" />);
  assert.match(html, /· · · 等待中/);
});
