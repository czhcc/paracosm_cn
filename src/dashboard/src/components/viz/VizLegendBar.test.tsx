import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { VizLegendBar } from './VizLegendBar';

void React;

const fakeDepts = [
  { id: 'medical', label: 'Medical', color: '#dc2626' },
  { id: 'engineering', label: 'Engineering', color: '#f97316' },
];

describe('VizLegendBar', () => {
  it('renders the four glyphs + 显示完整图例 trigger', () => {
    const html = renderToString(<VizLegendBar departments={fakeDepts} />);
    assert.match(html, /部门色带/);
    assert.match(html, /成员/);
    assert.match(html, /重点成员/);
    assert.match(html, /回合标记/);
    assert.match(html, /显示完整图例/);
  });

  it('does not render the popover until clicked (initial state)', () => {
    const html = renderToString(<VizLegendBar departments={fakeDepts} />);
    assert.ok(!/role="dialog"/.test(html), 'popover should be closed by default');
  });
});
