import { useMediaQuery, PHONE_QUERY } from './useMediaQuery.js';

export type GridMode = 'living' | 'mood' | 'forge' | 'ecology' | 'divergence';

/** Hints are scenario-templated. `{people}` = plural population noun,
 *  `{person}` = singular, both lower-case. Resolved at render time. */
const MODES: { key: GridMode; label: string; hint: string }[] = [
  { key: 'living', label: "存活", hint: "完整场景、{person}标记、亲属连线及全部事件" },
  { key: 'mood', label: "情绪", hint: "突出{Person}情绪云，显示出生、死亡与伴侣连线" },
  { key: 'forge', label: "工具创建", hint: "弱化背景，突出工具创建尝试及跨部门复用弧线" },
  { key: 'ecology', label: "生态", hint: "隐藏人员符号，突出指标及危机冲击波" },
  { key: 'divergence', label: "分歧", hint: "仅显示此侧存活、另一侧已故的{people}" },
];

function interpolate(
  template: string,
  labels: { person: string; people: string; Person: string; People: string },
): string {
  return template
    .replace(/\{person\}/g, labels.person)
    .replace(/\{Person\}/g, labels.Person)
    .replace(/\{people\}/g, labels.people)
    .replace(/\{People\}/g, labels.People);
}

export function gridModeHint(
  mode: GridMode,
  labels: { person: string; people: string; Person: string; People: string },
): string {
  const template = MODES.find(m => m.key === mode)?.hint ?? '';
  return interpolate(template, labels);
}

/**
 * Mode pill row rendered above each leader grid. Shared state lifted
 * to SwarmViz so toggling on one leader also toggles the other —
 * panels stay visually comparable across mode switches.
 * Optional counts render as a "· N" suffix — typically used for FORGE
 * (total approved forges across both leaders) and DIVERGENCE (total
 * diverged colonists across both sides).
 */
export function GridModePills({
  mode,
  onChange,
  counts,
  labels,
}: {
  mode: GridMode;
  onChange: (next: GridMode) => void;
  counts?: Partial<Record<GridMode, number>>;
  labels: { person: string; people: string; Person: string; People: string };
}) {
  const isPhone = useMediaQuery(PHONE_QUERY);

  // On phone viewports the 5-pill row was horizontally scrollable but
  // ate ~44px of vertical chrome + always required the user to swipe
  // sideways to see DIVERGENCE / ECOLOGY. Native <select> renders the
  // current mode + a tap target that opens the system picker — cleaner
  // and reclaims the row for actual viz content.
  if (isPhone) {
    return (
      <select
        aria-label="网格可视化模式"
        value={mode}
        onChange={(e) => onChange(e.target.value as GridMode)}
        title={interpolate(MODES.find(m => m.key === mode)?.hint ?? '', labels)}
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: 16,  // iOS Safari zoom-on-focus threshold
          fontFamily: 'var(--mono)',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'var(--bg-card)',
          color: 'var(--text-1)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer',
          minHeight: 44,  // WCAG 2.5.5 target size
        }}
      >
        {MODES.map((m) => {
          const count = counts?.[m.key];
          const countSuffix = typeof count === 'number' && count > 0 ? ` · ${count}` : '';
          return (
            <option key={m.key} value={m.key}>
              {m.label}{countSuffix}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="网格可视化模式"
      style={{
        display: 'flex',
        gap: 0,
        padding: '4px 6px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        // Five labels (LIVING/MOOD/FORGE/ECOLOGY/DIVERGENCE) at
        // whitespace-nowrap don't shrink below their text width, so
        // they overflow on phone viewports and visually slide under
        // the ⋯ + ? Help buttons next to this row. overflow-x:auto
        // clips at the container bound; touch-swipe (or mouse scroll)
        // brings hidden pills into view without them stomping the
        // toolbar buttons.
        overflowX: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      {MODES.map((m, i) => {
        const active = mode === m.key;
        const count = counts?.[m.key];
        const resolvedHint = interpolate(m.hint, labels);
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-grid-mode={m.key}
            onClick={() => onChange(m.key)}
            title={resolvedHint}
            style={{
              // 1 0 auto: grow to fill the row on desktop, but never
              // shrink below the natural label width. With nowrap text
              // this means pills always render legibly; the container's
              // overflow-x:auto absorbs the leftover width on phone
              // viewports rather than squishing pills into letter-stacks.
              flex: '1 0 auto',
              padding: '5px 8px',
              fontSize: 'var(--font-3xs)',
              fontFamily: 'var(--mono)',
              fontWeight: 800,
              letterSpacing: '0.1em',
              border: '1px solid var(--border)',
              borderLeft: i === 0 ? '1px solid var(--border)' : 'none',
              borderRadius:
                i === 0
                  ? '3px 0 0 3px'
                  : i === MODES.length - 1
                  ? '0 3px 3px 0'
                  : 0,
              background: active ? 'var(--amber)' : 'var(--bg-card)',
              color: active ? 'var(--bg-deep)' : 'var(--text-3)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'background 120ms, color 120ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{m.label}</span>
            {typeof count === 'number' && count > 0 && (
              <span
                style={{
                  padding: '0 4px',
                  borderRadius: 2,
                  background: active ? 'rgba(10, 8, 6, 0.25)' : 'var(--bg-deep)',
                  color: active ? 'var(--bg-deep)' : 'var(--amber)',
                  fontSize: 'var(--font-3xs)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  minWidth: 14,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
