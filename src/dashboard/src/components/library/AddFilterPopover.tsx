import * as React from 'react';
import styles from './AddFilterPopover.module.scss';
import type { RunsListFilters } from './hooks/useRunsList.js';

export interface AddFilterPopoverProps {
  currentFilters: RunsListFilters;
  onAdd: (next: Partial<RunsListFilters>) => void;
  scenarioOptions: Array<{ id: string; name: string }>;
  leaderOptions: Array<{ hash: string; label: string }>;
}

export function AddFilterPopover(props: AddFilterPopoverProps): JSX.Element {
  const { currentFilters, onAdd, scenarioOptions, leaderOptions } = props;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={styles.addBtn} aria-expanded={open}>＋ 筛选</button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="添加筛选">
          {!currentFilters.mode && (
            <fieldset className={styles.section}>
              <legend>模式</legend>
              <button onClick={() => { onAdd({ mode: 'turn-loop' }); setOpen(false); }}>逐回合</button>
              <button onClick={() => { onAdd({ mode: 'batch-trajectory' }); setOpen(false); }}>批量轨迹</button>
              <button onClick={() => { onAdd({ mode: 'batch-point' }); setOpen(false); }}>单点预测</button>
            </fieldset>
          )}
          {!currentFilters.scenarioId && scenarioOptions.length > 0 && (
            <fieldset className={styles.section}>
              <legend>场景</legend>
              {scenarioOptions.map(s => (
                <button key={s.id} onClick={() => { onAdd({ scenarioId: s.id }); setOpen(false); }}>{s.name}</button>
              ))}
            </fieldset>
          )}
          {!currentFilters.actorConfigHash && leaderOptions.length > 0 && (
            <fieldset className={styles.section}>
              <legend>决策者</legend>
              {leaderOptions.map(l => (
                <button key={l.hash} onClick={() => { onAdd({ actorConfigHash: l.hash }); setOpen(false); }}>{l.label}</button>
              ))}
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
