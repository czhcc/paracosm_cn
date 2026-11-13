import { departmentLabel, displayLabel } from '../../../template-localization';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CellSnapshot } from '../viz-types.js';
import { useScenarioLabels } from '../../../hooks/useScenarioLabels.js';
import styles from './ColonistSearch.module.scss';

export interface SearchMatch {
  cell: CellSnapshot;
  side: 'a' | 'b';
  actorName: string;
  sideColor: string;
}

interface ColonistSearchProps {
  value: string;
  onChange: (q: string) => void;
  matches: SearchMatch[];
  onPick?: (match: SearchMatch) => void;
}

/**
 * Search input above the leader panels. Types a name fragment → any
 * matching colonists on either side get a bright highlight ring and
 * non-matches dim. Empty string = normal render.
 */
export function ColonistSearch({ value, onChange, matches, onPick }: ColonistSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const matchCount = matches.length;
  const labels = useScenarioLabels();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showDropdown = focused && value.trim().length > 0 && matches.length > 0;

  return (
    <div className={styles.bar}>
      <span aria-hidden="true" className={styles.icon} title="搜索成员">🔍</span>
      <span className={styles.label}>查找</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder={`${labels.person} 姓名、部门、情绪…（空格分隔组合匹配，按 / 聚焦）`}
        aria-label={`搜索${labels.people} 按姓名、部门、角色或情绪查找`}
        className={styles.input}
      />
      {showDropdown && (
        <div role="listbox" className={styles.dropdown}>
          {matches.slice(0, 10).map((m, i) => (
            <button
              key={`${m.side}-${m.cell.agentId}-${i}`}
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={e => {
                e.preventDefault();
                onPick?.(m);
              }}
              className={styles.option}
              style={{ '--result-color': m.sideColor } as CSSProperties}
            >
              <span className={styles.sidePill}>{m.side.toUpperCase()}</span>
              <span className={styles.optionName}>{m.cell.name}</span>
              <span className={styles.optionMeta}>
                {departmentLabel(m.cell.department || '')} · {displayLabel(m.cell.mood)}
                {typeof m.cell.age === 'number' ? ` · age ${m.cell.age}` : ''}
              </span>
              {m.cell.featured && (
                <span className={styles.featuredPill}>重点成员</span>
              )}
            </button>
          ))}
          {matches.length > 10 && (
            <div className={styles.moreNote}>+ {matches.length - 10}  更多…</div>
          )}
        </div>
      )}
      {value && (
        <>
          <span
            className={styles.matchCount}
            style={{ '--count-color': matchCount > 0 ? 'var(--amber)' : 'var(--rust)' } as CSSProperties}
          >
            {matchCount}  匹配{matchCount === 1 ? '' : 'es'}
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="清除搜索"
            className={styles.clearBtn}
          >

            清除
          </button>
        </>
      )}
    </div>
  );
}
