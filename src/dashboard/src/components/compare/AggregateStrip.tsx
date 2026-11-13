import * as React from 'react';
import styles from './AggregateStrip.module.scss';
import type { BundleAggregate } from './hooks/useBundleAggregate.js';
import type { RunRecord } from '../../../../server/services/run-record.js';

export interface AggregateStripProps {
  aggregate: BundleAggregate;
  members: RunRecord[];
}

export function AggregateStrip({ aggregate, members }: AggregateStripProps): JSX.Element {
  return (
    <section className={styles.strip} aria-label="运行组汇总指标">
      <Tile label="位决策者" value={`${aggregate.count}`} />
      <Tile
        label="总费用"
        value={aggregate.costTotalUSD > 0 ? `$${aggregate.costTotalUSD.toFixed(2)}` : '—'}
      />
      <Tile label="平均运行时间" value={formatDuration(aggregate.meanDurationMs)} />
      <TrajectoryOverlay members={members} />
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>{value}</div>
    </div>
  );
}

function TrajectoryOverlay({ members }: { members: RunRecord[] }): JSX.Element {
  const series = members
    .map((m) => m.summaryTrajectory ?? [])
    .filter((s) => s.length > 0);
  if (series.length === 0) {
    return (
      <div className={styles.overlayTile}>
        <div className={styles.tileLabel}>演变曲线叠加</div>
        <div className={styles.tileEmpty}>暂无趋势数据</div>
      </div>
    );
  }
  const W = 320;
  const H = 60;
  const pad = 4;
  const allValues = series.flat();
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = Math.max(1e-6, maxV - minV);
  const maxLen = Math.max(...series.map((s) => s.length));
  const stepX = (W - pad * 2) / Math.max(1, maxLen - 1);
  return (
    <div className={styles.overlayTile}>
      <div className={styles.tileLabel}>演变曲线叠加（全部决策者）</div>
      <svg
        className={styles.overlay}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="全部决策者轨迹叠加"
      >
        {series.map((s, i) => {
          const points = s
            .map((v, x) => `${pad + x * stepX},${pad + (H - pad * 2) * (1 - (v - minV) / range)}`)
            .join(' ');
          return (
            <polyline
              key={i}
              points={points}
              fill="none"
              stroke="var(--amber)"
              strokeWidth={1}
              opacity={0.45}
            />
          );
        })}
      </svg>
      <div className={styles.overlayCaption}>
        代表性指标（优先人口，其次士气，再取首个可用指标），在对比组内归一化。横轴为回合。
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}
