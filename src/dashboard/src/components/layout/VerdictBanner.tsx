/**
 * Global verdict banner. Visible on every tab as soon as the verdict
 * LLM returns; closable per-verdict (a new run's headline re-shows the
 * banner even after dismissal). Click the middle strip or the "View
 * Full Verdict" button to open the full breakdown modal; the "Reports"
 * chip jumps to the Reports tab.
 *
 * Renders two shapes:
 * - Pair verdict (mode=`pair`): A-vs-B winner from the 2-actor pair
 *   runner. `winner` is `'A' | 'B' | 'tie'` and the banner color comes
 *   from the side palette.
 * - Cohort verdict (mode=`cohort`): top-ranked actor across an N-actor
 *   cohort run. `winner` is the actor name + `winnerIndex` is the slot,
 *   so the banner color comes from the 8-slot actor palette.
 */
import type { CSSProperties } from 'react';
import type { DashboardTab } from '../../tab-routing';
import { getActorColorVar } from '../../hooks/useGameState';
import styles from './VerdictBanner.module.scss';

interface VerdictBannerProps {
  verdict: Record<string, unknown> | null;
  currentTurn: number;
  maxTurns: number;
  dismissedKey: string | null;
  onOpenModal: () => void;
  onDismiss: (key: string) => void;
  onNavigateTab: (tab: Exclude<DashboardTab, 'about'>) => void;
}

function resolvePairWinColor(winner: 'A' | 'B' | 'tie'): string {
  if (winner === 'A') return 'var(--vis)';
  if (winner === 'B') return 'var(--eng)';
  return 'var(--amber)';
}

// Derived translucent/faint/glow stops from the winner color. Kept as
// CSS custom properties so the SCSS module reads them off the root
// element via fallback chains instead of templating into class names.
function winColorCssVars(winColor: string): CSSProperties {
  return {
    '--win-color': winColor,
    '--win-color-translucent': `color-mix(in srgb, ${winColor} 14%, transparent)`,
    '--win-color-faint': `color-mix(in srgb, ${winColor} 22%, transparent)`,
    '--win-color-border': `color-mix(in srgb, ${winColor} 36%, transparent)`,
    '--win-color-glow': `color-mix(in srgb, ${winColor} 42%, transparent)`,
  } as CSSProperties;
}

export function VerdictBanner({
  verdict,
  currentTurn,
  maxTurns,
  dismissedKey,
  onOpenModal,
  onDismiss,
  onNavigateTab,
}: VerdictBannerProps) {
  if (!verdict) return null;
  // Skipped-verdict branch: server emitted `verdict_skipped` (LLM call
  // failed, cohort too large, or economics profile turned verdicts
  // off). Renders an explanatory chip so the user understands the
  // missing banner is intentional / explainable, not a stuck pipe.
  if (verdict.skipped) {
    const reason = String(verdict.reason || 'unknown');
    const reasonCopy = (() => {
      switch (reason) {
        case 'generation_failed': return "结论模型调用失败，请打开报告查看原始运行指标。";
        case 'cohort_too_large': return `对比组超出结论评估人数上限（${verdict.actorCount}/${verdict.max} 位决策者）。请打开报告查看对比组分析。`;
        case 'economics_skip': return "当前费用配置已关闭结论生成，运行总结可在报告页查看。";
        default: return "暂无结论，请打开报告查看运行分析。";
      }
    })();
    const skippedKey = `skipped|${reason}`;
    if (dismissedKey === skippedKey) return null;
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="暂无结论"
        className={`${styles.banner} ${styles.bannerSkipped}`}
        style={winColorCssVars('var(--text-3)')}
      >
        <div className={styles.winnerLabel}>
          <div className={styles.kicker}>运行完成</div>
          <div className={`${styles.winnerName} ${styles.winnerNameSkipped}`}>暂无评判</div>
        </div>
        <div className={styles.headlineColumn}>
          {/* Static informational text — uses the dedicated info
              variant so screen readers don't announce it as
              interactive and sighted users don't get a
              cursor: pointer hint on non-clickable text. */}
          <p className={styles.headlineStatic}>{reasonCopy}</p>
          <div className={styles.turnLabel}>回合 {currentTurn}/{maxTurns}</div>
        </div>
        <button
          onClick={() => onNavigateTab('reports')}
          className={styles.reportsChip}
          title="打开报告页查看完整运行分析"
        >
          报告
        </button>
        <button
          onClick={() => onDismiss(skippedKey)}
          aria-label="关闭横幅"
          className={styles.dismissButton}
        >
          ×
        </button>
      </div>
    );
  }
  if (!verdict.winner) return null;
  const headline = String(verdict.headline || '');
  const winnerKey = `${verdict.winner}|${headline}`;
  if (dismissedKey === winnerKey) return null;

  // Mode discriminator: pair verdict uses A/B/tie; cohort verdict uses
  // an actor name + winnerIndex. Falls back to pair when unset for
  // back-compat with saved sessions captured before cohort verdicts
  // shipped.
  const mode = verdict.mode === 'cohort' ? 'cohort' : 'pair';

  let winColor: string;
  let winnerLabel: string;
  let kickerLabel: string;
  if (mode === 'cohort') {
    const idx = typeof verdict.winnerIndex === 'number' ? verdict.winnerIndex : 0;
    winColor = getActorColorVar(idx);
    const actorCount = Array.isArray(verdict.actors) ? (verdict.actors as unknown[]).length : 0;
    winnerLabel = `${String(verdict.winner)} leads`;
    kickerLabel = actorCount > 0 ? `★ Cohort of ${actorCount} complete` : "★ 对比组运行完成";
  } else {
    const pairWinner = verdict.winner as 'A' | 'B' | 'tie';
    winColor = resolvePairWinColor(pairWinner);
    winnerLabel = pairWinner === 'tie'
      ? 'Tie'
      : `${String(verdict.winnerName || 'Winner')} wins`;
    kickerLabel = "★ 运行完成";
  }

  const turnLabel = `Turn ${currentTurn}/${maxTurns} · verdict by gpt-4o`;
  return (
    <div
      // role=status + aria-live polite so screen readers announce the
      // verdict the moment the banner mounts. The banner appears
      // mid-stream when the run completes and disappears on dismiss;
      // role=region (the prior value) is for navigation landmarks, not
      // for live announcements.
      role="status"
      aria-live="polite"
      aria-label="仿真结论"
      className={styles.banner}
      style={winColorCssVars(winColor)}
    >
      <div className={styles.winnerLabel}>
        <div className={styles.kicker}>{kickerLabel}</div>
        <div className={styles.winnerName}>{winnerLabel}</div>
      </div>
      <div className={styles.headlineColumn}>
        <button
          onClick={onOpenModal}
          className={styles.headlineButton}
          title="点击查看完整结论分析"
        >
          {headline || "结论已生成，点击查看完整分析。"}
        </button>
        <div className={styles.turnLabel}>{turnLabel}</div>
      </div>
      <button onClick={onOpenModal} className={styles.viewButton}>
        查看完整评判 →
      </button>
      <button
        onClick={() => onNavigateTab('reports')}
        className={styles.reportsChip}
        title="打开报告页查看完整运行分析"
      >
        报告
      </button>
      <button
        onClick={() => onDismiss(winnerKey)}
        aria-label="关闭结论横幅"
        className={styles.dismissButton}
      >
        ×
      </button>
    </div>
  );
}
