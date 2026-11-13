/**
 * Sim header toggle between Side-by-side and Constellation layouts.
 * Both options work for any actor count: side-by-side is the default
 * surface and renders feature parity for N>=3 via `MultiActorTurnGrid`
 * (a horizontally scrolling track of per-actor cells); constellation
 * is the radial cohort view.
 *
 * @module paracosm/dashboard/sim/SimLayoutToggle
 */
import * as React from 'react';

export type SimLayout = 'side-by-side' | 'constellation';

export interface SimLayoutToggleProps {
  layout: SimLayout;
  /** Surfaced for analytics + future actor-aware copy; currently both
   *  toggle options are enabled at every count. */
  actorCount: number;
  onChange: (next: SimLayout) => void;
}

const buttonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 'var(--font-xs)',
  fontFamily: 'var(--mono)',
  fontWeight: 600,
  background: 'transparent',
  color: 'var(--text-3)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const activeStyle: React.CSSProperties = {
  ...buttonStyle,
  color: 'var(--amber)',
  background: 'var(--bg-card)',
  borderColor: 'var(--amber)',
};

export function SimLayoutToggle({ layout, actorCount, onChange }: SimLayoutToggleProps): JSX.Element {
  void actorCount;
  return (
    <div role="group" aria-label="仿真布局" style={{ display: 'inline-flex', gap: 0 }}>
      <button
        type="button"
        data-layout="side-by-side"
        aria-pressed={layout === 'side-by-side'}
        onClick={() => onChange('side-by-side')}
        style={{
          ...(layout === 'side-by-side' ? activeStyle : buttonStyle),
          borderRadius: '3px 0 0 3px',
        }}
        title="并排视图：每位决策者一列，超过两位时可横向滚动"
      >
        并排对比
      </button>
      <button
        type="button"
        data-layout="constellation"
        aria-pressed={layout === 'constellation'}
        onClick={() => onChange('constellation')}
        style={{
          ...(layout === 'constellation' ? activeStyle : buttonStyle),
          borderRadius: '0 3px 3px 0',
          borderLeft: 'none',
        }}
        title="星座视图：放射状对比组布局"
      >
        关系星图
      </button>
    </div>
  );
}

