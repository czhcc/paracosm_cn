import * as React from 'react';
import { localizeTemplate } from '../../template-localization';
import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { CohortVerdictDetails } from '../layout/VerdictModal';
import { getActorColorVar } from '../../hooks/useGameState';
import styles from './VerdictCard.module.scss';
import { finalStatsTitle, formatScenarioStat, scenarioStatLabel, scenarioStatRows, statLeader, type ScenarioStatRow } from './verdict-stats';

void React;

interface VerdictData {
  winner: 'A' | 'B' | 'tie';
  winnerName: string;
  headline: string;
  summary: string;
  keyDivergence: string;
  scores: {
    a: { survival: number; prosperity: number; morale: number; innovation: number };
    b: { survival: number; prosperity: number; morale: number; innovation: number };
  };
  leaderA: { name: string; archetype: string; unit: string };
  leaderB: { name: string; archetype: string; unit: string };
  /** The scenario's word for the settlement (lab, colony, station). */
  settlementNoun?: string;
  finalStats: {
    a: { population: number; morale: number; food: number; power: number; modules: number; science: number; tools: number };
    b: { population: number; morale: number; food: number; power: number; modules: number; science: number; tools: number };
    /** The scenario's header scores; absent on verdicts saved before they were sent. */
    metrics?: ScenarioStatRow[];
  };
}

interface VerdictCardProps {
  verdict: Record<string, unknown>;
}

function ScoreBar({ label, a, b }: { label: string; a: number; b: number }) {
  // VerdictScoresSchema clamps to 0-10. Using the score-ceiling (10)
  // as the bar denominator means equal scores render equal-length bars
  // proportional to the absolute scale: 9 vs 9 fills 90%, 5 vs 5 fills
  // 50%. Previously max=Math.max(a,b,1) made every tied row render
  // both bars at 100% regardless of absolute score, which read as a
  // visual bug whenever both colonies hit similar numbers.
  const SCORE_CEILING = 10;
  const aPct = `${Math.min(100, (a / SCORE_CEILING) * 100)}%`;
  const bPct = `${Math.min(100, (b / SCORE_CEILING) * 100)}%`;
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarLegend}>
        <span>{a.toFixed(0)}</span>
        <span className={styles.scoreBarLabel}>{label}</span>
        <span>{b.toFixed(0)}</span>
      </div>
      <div className={styles.scoreBarTrack}>
        <div className={styles.scoreBarLeftCol}>
          <div
            className={styles.scoreBarFillLeft}
            style={{
              '--bar-pct': aPct,
              '--bar-color': a >= b ? 'var(--vis)' : 'var(--border-hl)',
            } as CSSProperties}
          />
        </div>
        <div className={styles.scoreBarRightCol}>
          <div
            className={styles.scoreBarFillRight}
            style={{
              '--bar-pct': bPct,
              '--bar-color': b >= a ? 'var(--eng)' : 'var(--border-hl)',
            } as CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, a, b, format, scenarioFormat, currency, direction }: {
  label: string;
  /** Undefined only for a scenario score a run does not hold; it reads n/a. */
  a: number | undefined;
  b: number | undefined;
  format?: 'percent' | 'decimal' | 'number';
  /** A scenario score's own format; takes over from `format` when set. */
  scenarioFormat?: ScenarioStatRow['format'];
  /** The scenario's currency, on a `currency` score. */
  currency?: string;
  /** Which way is better for a scenario score (higher by default). */
  direction?: 'higher' | 'lower';
}) {
  const fmt = (v: number | undefined) => {
    if (scenarioFormat) return formatScenarioStat(v, scenarioFormat, currency);
    const n = v ?? 0;
    if (format === 'percent') return `${Math.round(n * 100)}%`;
    if (format === 'decimal') return n.toFixed(1);
    return String(Math.round(n));
  };
  const better = statLeader(a, b, direction);
  return (
    <div className={styles.statRow}>
      <span
        className={styles.statValueA}
        style={{
          '--stat-color': better === 'a' ? 'var(--vis)' : 'var(--text-2)',
          '--stat-weight': better === 'a' ? '700' : '400',
        } as CSSProperties}
      >
        {fmt(a)}
      </span>
      <span className={styles.statLabel}>{label}</span>
      <span
        className={styles.statValueB}
        style={{
          '--stat-color': better === 'b' ? 'var(--eng)' : 'var(--text-2)',
          '--stat-weight': better === 'b' ? '700' : '400',
        } as CSSProperties}
      >
        {fmt(b)}
      </span>
    </div>
  );
}

/**
 * Build a markdown export of the verdict for sharing or saving.
 */
function buildMarkdownExport(v: VerdictData): string {
  const lines: string[] = [];
  lines.push('# 仿真评判');
  lines.push('');
  lines.push(`**获胜者：** ${v.winner === 'tie' ? '平局' : `${v.winnerName} （决策者 ${v.winner}）`}`);
  lines.push('');
  lines.push(`> ${v.headline}`);
  lines.push('');
  lines.push(v.summary);
  lines.push('');
  lines.push('## 关键分歧');
  lines.push('');
  lines.push(v.keyDivergence);
  if (v.scores) {
    lines.push('');
    lines.push('## 评分');
    lines.push('');
    lines.push('| 维度 | ' + (v.leaderA?.name || 'A') + ' | ' + (v.leaderB?.name || 'B') + ' |');
    lines.push('|---|---|---|');
    lines.push(`| 生存 | ${v.scores.a?.survival ?? 0} | ${v.scores.b?.survival ?? 0} |`);
    lines.push(`| 繁荣 | ${v.scores.a?.prosperity ?? 0} | ${v.scores.b?.prosperity ?? 0} |`);
    lines.push(`| 士气 | ${v.scores.a?.morale ?? 0} | ${v.scores.b?.morale ?? 0} |`);
    lines.push(`| 创新 | ${v.scores.a?.innovation ?? 0} | ${v.scores.b?.innovation ?? 0} |`);
  }
  if (v.finalStats) {
    const scenarioRows = scenarioStatRows(v.finalStats);
    const title = finalStatsTitle(v.settlementNoun).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
    lines.push('');
    lines.push(`## ${title}`);
    lines.push('');
    lines.push('| 指标 | ' + (v.leaderA?.name || 'A') + ' | ' + (v.leaderB?.name || 'B') + ' |');
    lines.push('|---|---|---|');
    if (scenarioRows) {
      for (const r of scenarioRows) {
        lines.push(`| ${scenarioStatLabel(r)} | ${formatScenarioStat(r.a, r.format, r.currency)} | ${formatScenarioStat(r.b, r.format, r.currency)} |`);
      }
    } else {
      lines.push(`| 人口 | ${v.finalStats.a?.population ?? 0} | ${v.finalStats.b?.population ?? 0} |`);
      lines.push(`| 士气 | ${Math.round((v.finalStats.a?.morale ?? 0) * 100)}% | ${Math.round((v.finalStats.b?.morale ?? 0) * 100)}% |`);
      lines.push(`| 食物（月） | ${(v.finalStats.a?.food ?? 0).toFixed(1)} | ${(v.finalStats.b?.food ?? 0).toFixed(1)} |`);
      lines.push(`| 电力（kW） | ${(v.finalStats.a?.power ?? 0).toFixed(1)} | ${(v.finalStats.b?.power ?? 0).toFixed(1)} |`);
      lines.push(`| 模块 | ${(v.finalStats.a?.modules ?? 0).toFixed(1)} | ${(v.finalStats.b?.modules ?? 0).toFixed(1)} |`);
      lines.push(`| 科研 | ${v.finalStats.a?.science ?? 0} | ${v.finalStats.b?.science ?? 0} |`);
    }
    lines.push(`| 生成工具数 | ${v.finalStats.a?.tools ?? 0} | ${v.finalStats.b?.tools ?? 0} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('由 [Paracosm] 生成(https://paracosm.agentos.sh)');
  return lines.join('\n');
}

function winColorFor(winner: VerdictData['winner']): string {
  if (winner === 'A') return 'var(--vis)';
  if (winner === 'B') return 'var(--eng)';
  return 'var(--amber)';
}

/**
 * Full verdict body shared by the Sim modal and the Reports inline
 * panel. Accepts the parsed VerdictData and renders the winner
 * headline, summary, key divergence, score bars, and final stats.
 * Caller supplies any wrapping chrome (modal vs inline card).
 */
export function VerdictDetails({ v, onExport, copied }: { v: VerdictData; onExport?: () => void; copied?: boolean }) {
  const winColor = winColorFor(v.winner);
  return (
    <>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.headerKicker}>仿真评判</div>
          <div
            className={styles.headerWinner}
            style={{ '--win-color': winColor } as CSSProperties}
          >
            {v.winner === 'tie' ? '平局' : `${v.winnerName} 获胜`}
          </div>
          <div className={styles.headerHeadline}>{v.headline}</div>
        </div>
        {onExport && (
          <div className={styles.exportWrap}>
            <button
              onClick={onExport}
              aria-label="复制 Markdown 格式结论"
              className={[styles.exportBtn, copied ? styles.copied : ''].filter(Boolean).join(' ')}
            >
              {copied ? '已复制 ✓' : '导出 Markdown'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.summary}>{v.summary}</div>

      <div className={styles.divergenceBox}>
        <span className={styles.divergenceLabel}>关键分歧</span>
        <div className={styles.divergenceBody}>{v.keyDivergence}</div>
      </div>

      <div className={styles.matchupRow}>
        <div className={styles.matchupSide}>
          <div className={styles.matchupNameA}>{v.leaderA?.name || '决策者 A'}</div>
          <div className={styles.matchupArchetype}>{localizeTemplate(v.leaderA?.archetype)}</div>
        </div>
        <div className={styles.matchupVs}>对比</div>
        <div className={styles.matchupSide}>
          <div className={styles.matchupNameB}>{v.leaderB?.name || '决策者 B'}</div>
          <div className={styles.matchupArchetype}>{localizeTemplate(v.leaderB?.archetype)}</div>
        </div>
      </div>

      <div className={styles.scoreBarsWrap}>
        <ScoreBar label="生存" a={v.scores.a?.survival ?? 0} b={v.scores.b?.survival ?? 0} />
        <ScoreBar label="繁荣" a={v.scores.a?.prosperity ?? 0} b={v.scores.b?.prosperity ?? 0} />
        <ScoreBar label="士气" a={v.scores.a?.morale ?? 0} b={v.scores.b?.morale ?? 0} />
        <ScoreBar label="创新" a={v.scores.a?.innovation ?? 0} b={v.scores.b?.innovation ?? 0} />
      </div>

      {v.finalStats && (
        <div className={styles.finalStats}>
          <div className={styles.finalStatsLabel}>{finalStatsTitle(v.settlementNoun)}</div>
          {scenarioStatRows(v.finalStats)?.map(r => (
            <StatRow key={r.id} label={scenarioStatLabel(r)} a={r.a} b={r.b} scenarioFormat={r.format} currency={r.currency} direction={r.better} />
          )) ?? (<>
            <StatRow label="人口" a={v.finalStats.a?.population ?? 0} b={v.finalStats.b?.population ?? 0} />
            <StatRow label="士气" a={v.finalStats.a?.morale ?? 0} b={v.finalStats.b?.morale ?? 0} format="percent" />
            <StatRow label="食物（月）" a={v.finalStats.a?.food ?? 0} b={v.finalStats.b?.food ?? 0} format="decimal" />
            <StatRow label="功率（kW）" a={v.finalStats.a?.power ?? 0} b={v.finalStats.b?.power ?? 0} format="decimal" />
            <StatRow label="模块" a={v.finalStats.a?.modules ?? 0} b={v.finalStats.b?.modules ?? 0} format="decimal" />
            <StatRow label="科研" a={v.finalStats.a?.science ?? 0} b={v.finalStats.b?.science ?? 0} />
          </>)}
          <StatRow label="已创建工具" a={v.finalStats.a?.tools ?? 0} b={v.finalStats.b?.tools ?? 0} />
        </div>
      )}
    </>
  );
}

/**
 * Inline full-width verdict panel. Branches on `verdict.mode`:
 * pair-mode renders the A-vs-B VerdictDetails (scores + final stats);
 * cohort-mode renders the N-actor CohortVerdictDetails (ranked list,
 * per-actor scores, key divergence). Both share the same collapsible
 * panel chrome so the SIM and Reports tabs swap panels seamlessly when
 * the run shape changes.
 *
 * Previously cohort runs returned null here — the panel checked
 * `v.scores` which only exists on the pair shape, so 3+ actor runs
 * showed no verdict in the SIM body even when `cohort_verdict` had
 * landed cleanly.
 */
export function VerdictPanel({ verdict: raw }: VerdictCardProps) {
  const v = raw as unknown as VerdictData & { mode?: string; rankings?: unknown; winnerIndex?: number };
  const [copied, setCopied] = useState(false);
  // Collapsible: clicking the close button shrinks the panel to a
  // single-line summary so the SIM area is not dominated by the
  // verdict block when reviewing turns. Clicking the collapsed bar
  // re-expands. State is per-session in-memory; remounting (page
  // reload, replay change) restores the expanded default.
  const [expanded, setExpanded] = useState(true);
  const handleExport = useCallback(() => {
    const md = buildMarkdownExport(v);
    navigator.clipboard.writeText(md).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
      () => { /* clipboard denied — silent */ },
    );
  }, [v]);
  if (!v.winner) return null;
  const mode: 'pair' | 'cohort' = v.mode === 'cohort' ? 'cohort' : 'pair';
  // Pair shape: bail without scores (back-compat: an older verdict
  // payload without scores can't render the score bars).
  if (mode === 'pair' && !v.scores) return null;
  // Cohort shape: bail without rankings.
  if (mode === 'cohort' && !Array.isArray(v.rankings)) return null;
  const winColor = mode === 'cohort'
    ? getActorColorVar(typeof v.winnerIndex === 'number' ? v.winnerIndex : 0)
    : winColorFor(v.winner);
  if (!expanded) {
    const headline = v.headline ?? (mode === 'cohort'
      ? `${String(v.winner)} leads`
      : `${v.winner === 'tie' ? 'Tied' : `${v.winner.toUpperCase()} wins`}`);
    return (
      <button
        type="button"
        className={styles.panelCollapsed}
        style={{ '--win-color': winColor } as CSSProperties}
        onClick={() => setExpanded(true)}
        aria-label="展开结论"
      >
        <span className={styles.panelCollapsedDot} aria-hidden="true" />
        <span className={styles.panelCollapsedText}>评判： {headline}</span>
        <span className={styles.panelCollapsedHint}>（点击展开）</span>
      </button>
    );
  }
  return (
    <div
      className={styles.panel}
      style={{ '--win-color': winColor } as CSSProperties}
    >
      <button
        type="button"
        className={styles.panelClose}
        onClick={() => setExpanded(false)}
        aria-label="收起结论"
        title="收起结论"
      >
        ×
      </button>
      {mode === 'cohort'
        ? <CohortVerdictDetails v={v as unknown as Record<string, unknown>} />
        : <VerdictDetails v={v} onExport={handleExport} copied={copied} />}
    </div>
  );
}

/**
 * Verdict surface. Renders as a compact banner pinned at the top of the
 * sim area when a verdict is available — never takes over the layout.
 * The full verdict (scores, stats, summary) opens in a modal on demand,
 * with a copy-to-clipboard markdown export so the user can save or
 * share the result without leaving the sim view.
 */
export function VerdictCard({ verdict: raw }: VerdictCardProps) {
  const v = raw as unknown as VerdictData;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Escape key closes the modal when open. Matches the dismissal
  // behavior of every other dashboard modal (CostBreakdown,
  // ShortcutsOverlay, SimFooterBar pops, ToolDetailModal).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleExport = useCallback(() => {
    const md = buildMarkdownExport(v);
    navigator.clipboard.writeText(md).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
      () => { /* clipboard denied — silent */ },
    );
  }, [v]);

  if (!v.winner || !v.scores) return null;
  const winColor = winColorFor(v.winner);
  const winnerLabel = v.winner === 'tie' ? '平局' : `${v.winnerName} wins`;
  const winColorVar = { '--win-color': winColor } as CSSProperties;

  return (
    <>
      {/* Compact banner — never takes more than ~36px so the sim columns
          stay fully visible. Click to open the full breakdown modal. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="打开仿真结论"
        className={styles.banner}
        style={winColorVar}
      >
        <span className={styles.bannerKicker}>评判</span>
        <span className={styles.bannerWinner}>{winnerLabel}</span>
        <span className={styles.bannerHeadline}>{v.headline}</span>
        <span className={styles.bannerCta}>查看完整评判 →</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="仿真结论"
          onClick={() => setOpen(false)}
          className={styles.modalBackdrop}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={styles.modalDialog}
            style={winColorVar}
          >
            <div className={styles.modalCloseAnchor}>
              <button
                onClick={() => setOpen(false)}
                aria-label="关闭结论"
                className={styles.modalCloseBtn}
              >
                ×
              </button>
              <VerdictDetails v={v} onExport={handleExport} copied={copied} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
