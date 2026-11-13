import { useEffect, useMemo, type CSSProperties } from 'react';
import type { TurnSnapshot } from '../viz-types.js';
import { useScenarioLabels } from '../../../hooks/useScenarioLabels.js';
import styles from './RunSummaryDrawer.module.scss';

interface RunSummaryDrawerProps {
  open: boolean;
  onClose: () => void;
  snapsA: TurnSnapshot[];
  snapsB: TurnSnapshot[];
  actorNameA: string;
  actorNameB: string;
  forgeApprovedA: number;
  forgeApprovedB: number;
  reuseCountA: number;
  reuseCountB: number;
  divergedCount: number;
}

interface SideStats {
  turns: number;
  totalBirths: number;
  totalDeaths: number;
  peakPop: number;
  finalPop: number;
  avgMorale: number;
  minMorale: number;
  /** Undefined when no snapshot carries a food reserve. */
  avgFood?: number;
  minFood?: number;
}

function computeSide(snaps: TurnSnapshot[]): SideStats | null {
  if (snaps.length === 0) return null;
  let totalBirths = 0;
  let totalDeaths = 0;
  let peakPop = 0;
  let moraleSum = 0;
  let foodSum = 0;
  let foodTurns = 0;
  let minMorale = Infinity;
  let minFood = Infinity;
  for (const s of snaps) {
    totalBirths += s.births;
    totalDeaths += s.deaths;
    if (s.population > peakPop) peakPop = s.population;
    moraleSum += s.morale;
    if (typeof s.foodReserve === 'number') {
      foodSum += s.foodReserve;
      foodTurns++;
      if (s.foodReserve < minFood) minFood = s.foodReserve;
    }
    if (s.morale < minMorale) minMorale = s.morale;
  }
  return {
    turns: snaps.length,
    totalBirths,
    totalDeaths,
    peakPop,
    finalPop: snaps[snaps.length - 1].population,
    avgMorale: moraleSum / snaps.length,
    minMorale: minMorale === Infinity ? 0 : minMorale,
    avgFood: foodTurns > 0 ? foodSum / foodTurns : undefined,
    minFood: foodTurns > 0 ? minFood : undefined,
  };
}

/**
 * Modal drawer summarizing the full run at-a-glance: per-side totals,
 * forge productivity, reuse count, divergence headline. Useful after a
 * scenario finishes for quick comparison. Dismiss via Esc / backdrop.
 */
export function RunSummaryDrawer(props: RunSummaryDrawerProps) {
  const { open, onClose } = props;
  const labels = useScenarioLabels();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const a = useMemo(() => computeSide(props.snapsA), [props.snapsA]);
  const b = useMemo(() => computeSide(props.snapsB), [props.snapsB]);
  if (!open) return null;

  const cell = (label: string, val: string, valColor?: string) => (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span
        className={styles.cellValue}
        style={valColor ? ({ '--val-color': valColor } as CSSProperties) : undefined}
      >
        {val}
      </span>
    </div>
  );

  const sideBlock = (
    name: string,
    color: string,
    s: SideStats | null,
    forgeCount: number,
    reuseCount: number,
  ) => (
    <div
      className={styles.sideBlock}
      style={{ '--side-color': color } as CSSProperties}
    >
      <div className={styles.sideName}>{name}</div>
      {s ? (
        <div className={styles.statsGrid}>
          {cell("回合数", `${s.turns}`)}
          {cell("最终人口", `${s.finalPop}`, color)}
          {cell("峰值人口", `${s.peakPop}`)}
          {cell("出生总数", `${s.totalBirths}`, 'rgba(106, 173, 72, 0.95)')}
          {cell("死亡总数", `${s.totalDeaths}`, 'rgba(200, 95, 80, 0.95)')}
          {cell("平均士气", `${Math.round(s.avgMorale * 100)}%`)}
          {cell("最低士气", `${Math.round(s.minMorale * 100)}%`, s.minMorale < 0.3 ? 'var(--rust)' : 'var(--text-1)')}
          {s.minFood !== undefined && cell("最低食物储备", `${s.minFood.toFixed(1)}mo`, s.minFood < 3 ? 'var(--rust)' : 'var(--text-1)')}
          {cell("生成工具", `${forgeCount}`, 'var(--amber)')}
          {cell("工具复用次数", `${reuseCount}`, 'var(--amber)')}
        </div>
      ) : (
        <div className={styles.empty}>暂无快照。</div>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="运行总结"
      onClick={onClose}
      className={styles.backdrop}
    >
      <div onClick={e => e.stopPropagation()} className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>

            运行总结 · {props.snapsA.length || props.snapsB.length} 回合
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭运行总结"
            className={styles.closeBtn}
          >
            ×
          </button>
        </div>

        <div className={styles.sidesRow}>
          {sideBlock(props.actorNameA, 'var(--vis)', a, props.forgeApprovedA, props.reuseCountA)}
          {sideBlock(props.actorNameB, 'var(--eng)', b, props.forgeApprovedB, props.reuseCountB)}
        </div>

        <div className={styles.divergenceBox}>
          <div>
            <div className={styles.divergenceLabel}>分歧</div>
            <div className={styles.divergenceCount}>{props.divergedCount}</div>
          </div>
          <div className={styles.divergenceCopy}>
            {labels.People}  在最终快照中仅在一侧存活，用于衡量两位决策者造成的结果差异。
          </div>
        </div>
      </div>
    </div>
  );
}
