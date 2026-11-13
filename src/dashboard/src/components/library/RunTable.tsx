import * as React from 'react';
import styles from './RunTable.module.scss';
import type { RunRecord } from '../../../../server/services/run-record.js';

export interface RunTableProps {
  runs: RunRecord[];
  onOpen: (runId: string) => void;
  onReplay: (runId: string) => void;
}

export function RunTable(props: RunTableProps): JSX.Element {
  const { runs, onOpen, onReplay } = props;
  return (
    <div className={styles.wrapper} role="region" aria-label="运行列表" tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>场景</th>
            <th>模式</th>
            <th>决策者</th>
            <th>费用</th>
            <th>时间</th>
            <th>开始时间</th>
            <th aria-label="操作"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr
              key={r.runId}
              onClick={() => onOpen(r.runId)}
              tabIndex={0}
              data-run-card
              data-run-id={r.runId}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen(r.runId);
                }
              }}
            >
              <td data-label="场景">{r.scenarioId}</td>
              <td data-label="模式">
                <span data-mode={r.mode ?? 'unknown'} className={styles.modeCell}>{r.mode ?? '-'}</span>
              </td>
              <td data-label="决策者">{r.actorName ?? '-'}</td>
              <td data-label="费用">{r.costUSD != null ? `$${r.costUSD.toFixed(2)}` : '-'}</td>
              <td data-label="时间">{r.durationMs != null ? `${(r.durationMs / 1000).toFixed(0)}s` : '-'}</td>
              <td data-label="开始时间">{r.createdAt.slice(0, 19).replace('T', ' ')}</td>
              <td data-label="操作" className={styles.actionsCell}>
                <button onClick={(e) => { e.stopPropagation(); onOpen(r.runId); }}>打开</button>
                <button onClick={(e) => { e.stopPropagation(); onReplay(r.runId); }} aria-label="回放">回放</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
