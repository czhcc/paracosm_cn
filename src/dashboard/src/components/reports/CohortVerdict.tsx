/**
 * Cohort-aware verdict surface for 3+ actor runs. The single-winner
 * verdict (HeroScoreboard A vs B) doesn't generalize past two
 * leaders. This component renders three complementary readings:
 *
 * - Quartile rankings: top 25% / bottom 25% pills per metric so the
 *   user can see "highest morale: Maria, Atlas, Reyes" at a glance.
 * - Pareto front: the actors NOT dominated by any other across
 *   morale × population × deaths × tools. These are the cohort's
 *   trade-off candidates — every off-front actor is strictly worse
 *   than someone on it.
 * - Median benchmark deltas: signed per-actor delta-from-median so
 *   the user sees how each actor diverges from the cohort average,
 *   with sign normalized so positive = better than median (lower
 *   deaths, higher morale, both read as positive).
 *
 * Renders nothing for runs with <3 actors — pair runs already have
 * the HeroScoreboard A-vs-B story which is the right shape there.
 *
 * @module paracosm/dashboard/reports/CohortVerdict
 */
import * as React from 'react';
import { useMemo } from 'react';
import type { GameState } from '../../hooks/useGameState';
import { projectActorRows } from '../sim/actor-table.helpers';
import {
  quartileRanking,
  paretoFront,
  medianBenchmark,
  formatDelta,
  type Metric,
} from './cohort-verdict.helpers';
import styles from './CohortVerdict.module.scss';

void React;

export interface CohortVerdictProps {
  state: GameState;
}

const QUARTILE_METRICS: Array<{ metric: Metric; label: string; suffix: string }> = [
  { metric: 'morale',     label: "士气",     suffix: '%' },
  { metric: 'population', label: "人口", suffix: ''  },
  { metric: 'deaths',     label: 'Deaths',     suffix: ''  },
  { metric: 'tools',      label: 'Tools',      suffix: ''  },
];

const PARETO_METRICS: Metric[] = ['morale', 'population', 'deaths', 'tools'];

const MEDIAN_METRICS: Array<{ metric: Metric; label: string; suffix: string; decimals: number }> = [
  { metric: 'morale',     label: "士气",     suffix: '%', decimals: 0 },
  { metric: 'population', label: "人口", suffix: '',  decimals: 0 },
  { metric: 'deaths',     label: 'Deaths',     suffix: '',  decimals: 0 },
];

export function CohortVerdict({ state }: CohortVerdictProps): JSX.Element | null {
  const rows = useMemo(() => projectActorRows(state), [state]);

  if (rows.length < 3) return null;

  const quartiles = useMemo(() => QUARTILE_METRICS.map(({ metric, label, suffix }) => ({
    metric, label, suffix,
    ranking: quartileRanking(rows, metric),
  })), [rows]);

  const pareto = useMemo(() => paretoFront(rows, PARETO_METRICS), [rows]);
  const paretoRows = pareto.frontIds
    .map(id => rows.find(r => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const medians = useMemo(() => MEDIAN_METRICS.map(({ metric, label, suffix, decimals }) => ({
    metric, label, suffix, decimals,
    benchmark: medianBenchmark(rows, metric),
  })), [rows]);

  return (
    <section className={styles.panel} aria-labelledby="cohort-verdict-heading">
      <header className={styles.header}>
        <h3 id="cohort-verdict-heading" className={styles.heading}>对比组结论</h3>
        <p className={styles.subhead}>
          {rows.length}  位决策者 · 按士气、人口、死亡人数和工具数量比较，综合评估多位决策者的表现。
        </p>
      </header>

      {/* QUARTILE RANKINGS */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>四分位排名</h4>
        <div className={styles.quartileGrid}>
          {quartiles.map(({ metric, label, suffix, ranking }) => (
            <div key={metric} className={styles.quartileBlock}>
              <div className={styles.metricHead}>
                <span className={styles.metricLabel}>{label}</span>
                <span className={styles.metricMedian}>中位数 {Math.round(ranking.median)}{suffix}</span>
              </div>
              <div className={styles.quartileRow}>
                <span className={styles.quartileTag}>前 25%</span>
                <ul className={styles.actorList}>
                  {ranking.top.map(r => (
                    <li key={r.id} className={`${styles.actorPill} ${styles.actorPillTop}`}>
                      {r.name}
                    </li>
                  ))}
                  {ranking.top.length === 0 && <li className={styles.actorListEmpty}>—</li>}
                </ul>
              </div>
              <div className={styles.quartileRow}>
                <span className={styles.quartileTag}>后 25%</span>
                <ul className={styles.actorList}>
                  {ranking.bottom.map(r => (
                    <li key={r.id} className={`${styles.actorPill} ${styles.actorPillBottom}`}>
                      {r.name}
                    </li>
                  ))}
                  {ranking.bottom.length === 0 && <li className={styles.actorListEmpty}>—</li>}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PARETO FRONT */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>帕累托前沿 · 权衡候选</h4>
        <p className={styles.sectionHint}>
          {paretoRows.length} 决策者{paretoRows.length === 1 ? '' : 's'}  在全部四项指标上，未被其他决策者同时超过。前沿以外的决策者至少被一位前沿候选支配。
        </p>
        <ul className={styles.paretoList}>
          {paretoRows.map(r => {
            const dominationCount = pareto.dominationCount[r.id] ?? 0;
            return (
              <li key={r.id} className={styles.paretoItem}>
                <span className={styles.paretoName}>{r.name}</span>
                <span className={styles.paretoArchetype}>{r.archetype}</span>
                <span className={styles.paretoDominates}>支配 {dominationCount}  位其他决策者{dominationCount === 1 ? '' : 's'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* MEDIAN BENCHMARK */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>中位数基准 · 各决策者差值</h4>
        <p className={styles.sectionHint}>

          正值统一表示优于中位数；死亡更少和士气更高都会显示为正差值。
        </p>
        <div className={styles.medianTable} role="table" aria-label="各决策者与中位数的差值">
          <div className={styles.medianHeaderRow} role="row">
            <span className={styles.medianActorCol} role="columnheader">决策者</span>
            {medians.map(m => (
              <span key={m.metric} className={styles.medianMetricCol} role="columnheader">{m.label}</span>
            ))}
          </div>
          {rows.map(r => (
            <div key={r.id} className={styles.medianBodyRow} role="row">
              <span className={styles.medianActorCol} role="cell">
                <span className={styles.medianActorName}>{r.name}</span>
                <span className={styles.medianActorArchetype}>{r.archetype}</span>
              </span>
              {medians.map(m => {
                const delta = m.benchmark.deltas[r.id] ?? 0;
                const cls = delta > 0
                  ? styles.deltaPositive
                  : delta < 0
                    ? styles.deltaNegative
                    : styles.deltaNeutral;
                return (
                  <span key={m.metric} className={`${styles.medianMetricCol} ${cls}`} role="cell">
                    {formatDelta(delta, m.decimals)}{m.suffix}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
