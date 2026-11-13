import { useEffect, type CSSProperties } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { CostBreakdown, CostSiteBreakdown } from '../../hooks/useGameState';
import { useRetryStats } from '../../hooks/useRetryStats';
import styles from './CostBreakdownModal.module.scss';

/**
 * Modal that breaks down a run's LLM spend by pipeline stage.
 *
 * Shown when the user clicks the COST pill in the StatsBar. Surfaces
 * where the money actually went so a user debugging a high bill can see
 * at a glance whether reactions, departments, or the judge dominated.
 *
 * Each row is a stage: director, commander, departments, judge,
 * reactions, other. Rows are sorted by spend descending so the biggest
 * line item is always at the top. A visual bar graph renders alongside
 * the numbers so the proportion is glanceable.
 */

interface CostBreakdownModalProps {
  combined: CostBreakdown;
  leaderA?: CostBreakdown;
  leaderB?: CostBreakdown;
  leaderAName?: string;
  leaderBName?: string;
  /**
   * Optional full-cohort per-actor cost list. When the run carried 3+
   * actors, ReportView passes the entire roster here so the modal can
   * render an "all actors" rollup section above the stage breakdown.
   * Empty / undefined for pair runs (which keep the existing
   * leaderA/leaderB rendering only).
   */
  actors?: Array<{ actorId: string; name: string; cost: CostBreakdown }>;
  onClose: () => void;
}

/** Human-readable descriptions for each pipeline stage. */
const SITE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  director: { label: "事件导演", description: "每回合根据世界状态生成事件" },
  commander: { label: 'Commander', description: "阅读部门报告、选择方案并提拔部门负责人" },
  departments: { label: "部门分析", description: "五位专家并行分析每个事件" },
  judge: { label: "工具评审", description: "模型审查每个动态工具的安全性与正确性" },
  reactions: { label: "成员反应", description: "约 100 位居民对每回合结果作出反应" },
  other: { label: 'Other', description: "未分类调用" },
};

function fmtUsd(v: number): string {
  if (v < 0.0001) return '$0.0000';
  return `$${v < 0.01 ? v.toFixed(4) : v.toFixed(2)}`;
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

/** Threshold-driven color assignment; returns a CSS var token. */
function avgAttemptsColor(avg: number): string {
  if (avg > 1.5) return 'var(--rust)';
  if (avg > 1.1) return 'var(--amber)';
  return 'var(--text-1)';
}

function fallbackColor(rate: number): string {
  if (rate > 0.01) return 'var(--rust)';
  if (rate > 0) return 'var(--amber)';
  return 'var(--text-3)';
}

export function CostBreakdownModal({ combined, leaderA, leaderB, leaderAName, leaderBName, actors, onClose }: CostBreakdownModalProps) {
  // Dismiss on Escape key. Keeps the modal keyboard-accessible without
  // pulling in a dialog library.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  // Fetch /retry-stats when the modal opens. Shows cross-run schema +
  // forge reliability trends from the server's ring buffer.
  const retryStats = useRetryStats(true);

  const breakdown = combined.breakdown ?? {};
  // Sort sites by cost descending. An empty breakdown falls back to an
  // empty array so the modal still renders an informative empty state.
  const rows = Object.entries(breakdown)
    .map(([site, b]) => ({ site, ...b }))
    .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  const total = combined.totalCostUSD || rows.reduce((s, r) => s + r.totalCostUSD, 0);
  const maxCost = rows[0]?.totalCostUSD ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="费用明细"
      onClick={onClose}
      className={styles.backdrop}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={styles.dialog}
      >
        <div className={styles.titleRow}>
          <h3 className={styles.title}>费用明细</h3>
          <button
            onClick={onClose}
            aria-label="关闭费用明细"
            className={styles.escBtn}
          >
            ESC
          </button>
        </div>
        <div className={styles.totalLine}>
          合计： <span className={styles.totalAmount}>{fmtUsd(total)}</span>
          {' · '}
          {combined.llmCalls.toLocaleString()} 次调用
          {' · '}
          {fmtTokens(combined.totalTokens)}  词元
        </div>

        {/* Prompt-cache savings block. Only renders when the provider
            reported cache activity (Anthropic on Sonnet/Haiku). OpenAI's
            automatic caching is not exposed per-call so this stays
            hidden for OpenAI runs. Consumer-facing framing:
              - headline: concrete dollars saved
              - sub: hit rate as percentage of input tokens
              - details: reads / creates in raw tokens for the curious */}
        {(combined.cacheReadTokens || combined.cacheCreationTokens) ? (() => {
          const reads = combined.cacheReadTokens ?? 0;
          const creates = combined.cacheCreationTokens ?? 0;
          const savings = combined.cacheSavingsUSD ?? 0;
          // Hit rate = reads as a share of (reads + creates). 100% means
          // every cache-tagged token on this run was served from an
          // existing cache entry (turn 2+ on a stable prefix). 0% means
          // nothing was reused — the cache filled but didn't pay off.
          const total = reads + creates;
          const hitRate = total > 0 ? reads / total : 0;

          let verdictColor = 'var(--text-3)';
          let verdictLine: string;
          if (savings > 0.001) {
            verdictColor = 'var(--green)';
            verdictLine = `Saved ${fmtUsd(savings)} via prompt caching`;
          } else if (savings < -0.001) {
            verdictColor = 'var(--amber)';
            // Negative savings means creation overhead hasn't been
            // amortized yet. Normal on turn 1; concerning by turn 3+.
            verdictLine = `Cache priming cost ${fmtUsd(-savings)} 截至目前 · 后续复用可抵偿此成本`;
          } else if (reads > 0) {
            verdictColor = 'var(--green)';
            verdictLine = "缓存复用收益已抵消预填费用";
          } else {
            verdictColor = 'var(--amber)';
            verdictLine = "缓存已填充但尚未复用，请重新运行或检查提示词稳定性";
          }

          return (
            <div className={styles.cacheBlock}>
              <div className={styles.cacheLabel}>提示词缓存</div>
              <div
                className={styles.cacheVerdict}
                style={{ '--cache-verdict-color': verdictColor } as CSSProperties}
              >
                {verdictLine}
              </div>
              <div className={styles.cacheSubLine}>
                {Math.round(hitRate * 100)}% 缓存输入命中率（{fmtTokens(reads)} 已复用 / {fmtTokens(total)} 缓存 tokens）
              </div>
              <div className={styles.cacheTokenRow}>
                <span>读取 {fmtTokens(reads)} <span className={styles.cacheMultiplier}>@0.10×</span></span>
                <span>创建 {fmtTokens(creates)} <span className={styles.cacheMultiplier}>@1.25×</span></span>
              </div>
            </div>
          );
        })() : null}

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            暂无模型调用费用。启动仿真后可查看各阶段支出。
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.headRow}>
                <th className={styles.th}>阶段</th>
                <th className={styles.thRight}>调用次数</th>
                <th className={styles.thRight}>词元</th>
                <th className={styles.thRight}>费用</th>
                <th className={styles.thRight}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const info = SITE_DESCRIPTIONS[r.site] ?? { label: r.site, description: '' };
                const pct = total > 0 ? (r.totalCostUSD / total) * 100 : 0;
                const barPct = maxCost > 0 ? (r.totalCostUSD / maxCost) * 100 : 0;
                return (
                  <tr key={r.site} className={styles.bodyRow}>
                    <td className={styles.stageCell}>
                      <div className={styles.stageLabel}>{info.label}</div>
                      <div className={styles.stageDescription}>{info.description}</div>
                      {/* Proportional bar. Width maps to % of the largest
                          stage so you can eyeball relative scale at a glance. */}
                      <div aria-hidden="true" className={styles.bar}>
                        <div
                          className={styles.barFill}
                          style={{ '--bar-pct': `${barPct}%` } as CSSProperties}
                        />
                      </div>
                    </td>
                    <td className={styles.numericCell}>{r.calls.toLocaleString()}</td>
                    <td className={styles.numericCell}>{fmtTokens(r.totalTokens)}</td>
                    <td className={styles.numericCellGreen}>{fmtUsd(r.totalCostUSD)}</td>
                    <td className={styles.numericCellMuted}>{pct.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Schema retry rollup. Each row is one Zod schema that the
            validation wrappers hit at least once during the run. Attempts
            per call > 1.0 means the model is fighting the output format
            on that schema; fallbacks > 0 means the retry loop exhausted
            and the turn ran with an empty skeleton. */}
        {combined.schemaRetries && Object.keys(combined.schemaRetries).length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>结构校验可靠性</div>
            <table className={styles.tableSm}>
              <thead>
                <tr className={styles.headRow}>
                  <th className={styles.th}>结构</th>
                  <th className={styles.thRight}>调用次数</th>
                  <th className={styles.thRight}>平均尝试次数</th>
                  <th className={styles.thRight}>回退次数</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(combined.schemaRetries)
                  .sort((a, b) => b[1].calls - a[1].calls)
                  .map(([schemaName, bucket]) => {
                    const avg = bucket.calls > 0 ? bucket.attempts / bucket.calls : 0;
                    const avgColor = avgAttemptsColor(avg);
                    const fbColor = bucket.fallbacks > 0 ? 'var(--rust)' : 'var(--text-3)';
                    return (
                      <tr key={schemaName} className={styles.bodyRow}>
                        <td className={styles.cellSchemaName}>{schemaName}</td>
                        <td className={styles.cellNumericTight}>{bucket.calls}</td>
                        <td
                          className={styles.cellAvgAttempts}
                          style={{ '--avg-color': avgColor } as CSSProperties}
                        >
                          {avg.toFixed(2)}
                        </td>
                        <td
                          className={styles.cellFallback}
                          style={{
                            '--fb-color': fbColor,
                            '--fb-weight': bucket.fallbacks > 0 ? '700' : '400',
                          } as CSSProperties}
                        >
                          {bucket.fallbacks}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div className={styles.sectionFootnote}>
              1.00 表示首次成功，越高代表校验失败后重试越多。可调整 <code className="mono">maxRetries</code> 或收紧结构约束，尤其当数值持续高于 1.3 时。
            </div>
          </div>
        )}

        {/* Forge reliability for the current run. Approval rate below
            ~60% usually means the judge is rejecting legitimately (model
            forging broken tools) OR the judge rubric has drifted too
            strict. avgConfidence below 0.7 means approved tools are
            marginal quality. */}
        {combined.forgeStats && combined.forgeStats.attempts > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>工具生成可靠性</div>
            {(() => {
              const f = combined.forgeStats!;
              const approvalRate = f.attempts > 0 ? f.approved / f.attempts : 0;
              const avgConf = f.approved > 0 ? f.approvedConfidenceSum / f.approved : 0;
              const rateColor = approvalRate < 0.5 ? 'var(--rust)' : approvalRate < 0.75 ? 'var(--amber)' : 'var(--green)';
              const confColor = avgConf > 0 && avgConf < 0.6 ? 'var(--amber)' : 'var(--text-1)';
              return (
                <table className={styles.tableSm}>
                  <thead>
                    <tr className={styles.headRow}>
                      <th className={styles.thRight}>尝试次数</th>
                      <th className={styles.thRight}>通过</th>
                      <th className={styles.thRight}>拒绝</th>
                      <th className={styles.thRight}>通过率</th>
                      <th className={styles.thRight}>平均置信度</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={styles.bodyRow}>
                      <td className={styles.cellRight1}>{f.attempts}</td>
                      <td className={styles.cellRightGreen}>{f.approved}</td>
                      <td className={f.rejected > 0 ? styles.cellRightRust : styles.cellRightMuted}>{f.rejected}</td>
                      <td
                        className={styles.cellRateColor}
                        style={{ '--rate-color': rateColor } as CSSProperties}
                      >
                        {(approvalRate * 100).toFixed(0)}%
                      </td>
                      <td
                        className={styles.cellConfColor}
                        style={{ '--conf-color': confColor } as CSSProperties}
                      >
                        {avgConf > 0 ? avgConf.toFixed(2) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
            <div className={styles.sectionFootnote}>
              拒绝可能来自结构检查或评审结果。带反馈重试通常可以修复；长期低通过率可能表示部门模型不擅长生成符合结构要求的代码。
            </div>
          </div>
        )}

        {/* Cross-run trend from /retry-stats. Populated once on modal
            open. Separates compile:* schemas (compiler hook generation)
            from runtime schemas so operators can see each class's
            health distinctly. */}
        {(() => {
          const rs = retryStats.data;
          if (retryStats.loading && !rs) {
            return <div className={styles.statusInline}>最近运行 — 加载中…</div>;
          }
          if (retryStats.error) {
            return (
              <div className={styles.statusInline}>

                最近运行 — <span className={styles.statusErrorTag}>获取失败（{retryStats.error})</span>
              </div>
            );
          }
          if (!rs || rs.runCount === 0) return null;

          const runtimeSchemas = Object.entries(rs.schemas).filter(([k]) => !k.startsWith('compile:'));
          const compileSchemas = Object.entries(rs.schemas)
            .filter(([k]) => k.startsWith('compile:'))
            .map(([k, v]) => [k.replace(/^compile:/, ''), v] as const);
          const forges = rs.forges;
          const caches = rs.caches;
          const providerErrors = rs.providerErrors;

          const schemaRow = ([name, b]: readonly [string, typeof rs.schemas[string]]) => {
            const avgColor = avgAttemptsColor(b.avgAttempts);
            const fbColor = fallbackColor(b.fallbackRate);
            return (
              <tr key={name} className={styles.bodyRow}>
                <td className={styles.cellSchemaName}>{name}</td>
                <td className={styles.cellNumericTight}>{b.calls}</td>
                <td
                  className={styles.cellAvgAttempts}
                  style={{ '--avg-color': avgColor } as CSSProperties}
                >
                  {b.avgAttempts.toFixed(2)}
                </td>
                <td
                  className={styles.cellFallback}
                  style={{
                    '--fb-color': fbColor,
                    '--fb-weight': b.fallbacks > 0 ? '700' : '400',
                  } as CSSProperties}
                >
                  {(b.fallbackRate * 100).toFixed(2)}%
                </td>
              </tr>
            );
          };

          return (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>最近运行（最近 {rs.runCount})</div>

              {runtimeSchemas.length > 0 && (
                <div className={styles.subBlock}>
                  <div className={styles.subBlockLabel}>运行时结构校验</div>
                  <table className={styles.tableSm}>
                    <thead>
                      <tr className={styles.headRow}>
                        <th className={styles.th}>结构</th>
                        <th className={styles.thRight}>调用次数</th>
                        <th className={styles.thRight}>平均尝试</th>
                        <th className={styles.thRight}>回退比例</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runtimeSchemas.sort((a, b) => b[1].calls - a[1].calls).map(schemaRow)}
                    </tbody>
                  </table>
                </div>
              )}

              {compileSchemas.length > 0 && (
                <div className={styles.subBlock}>
                  <div className={styles.subBlockLabel}>编译钩子</div>
                  <table className={styles.tableSm}>
                    <thead>
                      <tr className={styles.headRow}>
                        <th className={styles.th}>钩子</th>
                        <th className={styles.thRight}>调用次数</th>
                        <th className={styles.thRight}>平均尝试</th>
                        <th className={styles.thRight}>回退比例</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compileSchemas.sort((a, b) => b[1].calls - a[1].calls).map(schemaRow)}
                    </tbody>
                  </table>
                </div>
              )}

              {forges && forges.runsPresent > 0 && (
                <div className={styles.subBlock}>
                  <div className={styles.subBlockLabel}>工具生成</div>
                  <table className={styles.tableSm}>
                    <thead>
                      <tr className={styles.headRow}>
                        <th className={styles.thRight}>运行次数</th>
                        <th className={styles.thRight}>尝试次数</th>
                        <th className={styles.thRight}>尝试通过率</th>
                        <th className={styles.thRight}>独立工具数</th>
                        <th className={styles.thRight}>最终通过</th>
                        <th className={styles.thRight}>最终失败</th>
                        <th className={styles.thRight}>平均置信度</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={styles.bodyRow}>
                        <td className={styles.cellRight1}>{forges.runsPresent}</td>
                        <td className={styles.cellRight1}>{forges.totalAttempts}</td>
                        <td
                          className={styles.cellRateColor}
                          style={{
                            '--rate-color': forges.approvalRate < 0.5
                              ? 'var(--rust)'
                              : forges.approvalRate < 0.75 ? 'var(--amber)' : 'var(--green)',
                          } as CSSProperties}
                        >
                          {(forges.approvalRate * 100).toFixed(1)}%
                        </td>
                        <td className={styles.cellRight1}>{forges.totalUniqueNames}</td>
                        <td
                          className={styles.cellRateColor}
                          style={{
                            '--rate-color': forges.uniqueApprovalRate < 0.8
                              ? 'var(--rust)'
                              : forges.uniqueApprovalRate < 0.95 ? 'var(--amber)' : 'var(--green)',
                          } as CSSProperties}
                        >
                          {forges.totalUniqueApproved} ({(forges.uniqueApprovalRate * 100).toFixed(0)}%)
                        </td>
                        <td
                          className={styles.cellFallback}
                          style={{
                            '--fb-color': forges.totalUniqueTerminalRejections > 0 ? 'var(--rust)' : 'var(--text-3)',
                            '--fb-weight': forges.totalUniqueTerminalRejections > 0 ? '700' : '400',
                          } as CSSProperties}
                        >
                          {forges.totalUniqueTerminalRejections}
                        </td>
                        <td className={styles.cellRight1} style={{ fontWeight: 700 }}>
                          {forges.avgApprovedConfidence > 0 ? forges.avgApprovedConfidence.toFixed(2) : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className={styles.sectionFootnoteTight}>
                    尝试通过率统计所有生成调用及重试；最终通过表示进入工具箱的工具，最终失败表示重试后仍未修复的工具。
                  </div>
                  {(() => {
                    const rr = forges.rejectionReasons;
                    const totalCategorized = rr.schema_extra_field + rr.shape_check + rr.parse_error + rr.judge_correctness + rr.other;
                    if (totalCategorized === 0) return null;
                    const pct = (n: number) => totalCategorized > 0 ? Math.round((n / totalCategorized) * 100) : 0;
                    const cellStyle = (n: number, warnColor: string): CSSProperties => ({
                      '--rj-color': n > 0 ? warnColor : 'var(--text-3)',
                      '--rj-weight': n > 0 ? '700' : '400',
                    } as CSSProperties);
                    return (
                      <div className={styles.rejectionWrap}>
                        <div className={styles.rejectionLabel}>
                          拒绝原因（最近 {forges.runsPresent}  运行{forges.runsPresent === 1 ? '' : 's'})
                        </div>
                        <table className={styles.tableSm}>
                          <thead>
                            <tr className={styles.headRow}>
                              <th className={styles.thRight}>存在额外字段</th>
                              <th className={styles.thRight}>结构检查</th>
                              <th className={styles.thRight}>解析错误</th>
                              <th className={styles.thRight}>正确性评审</th>
                              <th className={styles.thRight}>其他</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className={styles.bodyRow}>
                              <td className={styles.rejectionCell} style={cellStyle(rr.schema_extra_field, 'var(--amber)')}>
                                {rr.schema_extra_field} ({pct(rr.schema_extra_field)}%)
                              </td>
                              <td className={styles.rejectionCell} style={cellStyle(rr.shape_check, 'var(--amber)')}>
                                {rr.shape_check} ({pct(rr.shape_check)}%)
                              </td>
                              <td className={styles.rejectionCell} style={cellStyle(rr.parse_error, 'var(--rust)')}>
                                {rr.parse_error} ({pct(rr.parse_error)}%)
                              </td>
                              <td className={styles.rejectionCell} style={cellStyle(rr.judge_correctness, 'var(--rust)')}>
                                {rr.judge_correctness} ({pct(rr.judge_correctness)}%)
                              </td>
                              <td className={styles.cellRightMuted}>
                                {rr.other} ({pct(rr.other)}%)
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className={styles.sectionFootnoteTight}>
                          “结构含额外字段”占比高，说明模型返回的键与声明的 outputSchema.properties 不一致；“评审正确性”表示评审发现了实际逻辑错误。
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {providerErrors && providerErrors.runsPresent > 0 && (
                <div className={styles.subBlock}>
                  <div className={styles.subBlockLabel}>模型服务错误</div>
                  <table className={styles.tableSm}>
                    <thead>
                      <tr className={styles.headRow}>
                        <th className={styles.thRight}>存在错误的运行</th>
                        <th className={styles.thRight}>合计</th>
                        <th className={styles.thRight}>认证</th>
                        <th className={styles.thRight}>额度</th>
                        <th className={styles.thRight}>限流</th>
                        <th className={styles.thRight}>网络</th>
                        <th className={styles.thRight}>其他</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={styles.bodyRow}>
                        <td className={styles.cellRight1}>{providerErrors.runsPresent}</td>
                        <td className={styles.cellRight1} style={{ fontWeight: 700 }}>{providerErrors.total}</td>
                        <td
                          className={styles.cellFallback}
                          style={{
                            '--fb-color': providerErrors.auth > 0 ? 'var(--rust)' : 'var(--text-3)',
                            '--fb-weight': providerErrors.auth > 0 ? '700' : '400',
                          } as CSSProperties}
                        >
                          {providerErrors.auth}
                        </td>
                        <td
                          className={styles.cellFallback}
                          style={{
                            '--fb-color': providerErrors.quota > 0 ? 'var(--rust)' : 'var(--text-3)',
                            '--fb-weight': providerErrors.quota > 0 ? '700' : '400',
                          } as CSSProperties}
                        >
                          {providerErrors.quota}
                        </td>
                        <td className={providerErrors.rate_limit > 0 ? styles.cellFallback : styles.cellRightMuted}
                          style={providerErrors.rate_limit > 0 ? { '--fb-color': 'var(--amber)', '--fb-weight': '400' } as CSSProperties : undefined}
                        >
                          {providerErrors.rate_limit}
                        </td>
                        <td className={providerErrors.network > 0 ? styles.cellFallback : styles.cellRightMuted}
                          style={providerErrors.network > 0 ? { '--fb-color': 'var(--amber)', '--fb-weight': '400' } as CSSProperties : undefined}
                        >
                          {providerErrors.network}
                        </td>
                        <td className={providerErrors.unknown > 0 ? styles.cellFallback : styles.cellRightMuted}
                          style={providerErrors.unknown > 0 ? { '--fb-color': 'var(--amber)', '--fb-weight': '400' } as CSSProperties : undefined}
                        >
                          {providerErrors.unknown}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className={styles.sectionFootnoteTight}>
                    认证与额度错误会中止运行；限流、网络等错误由重试机制处理。
                  </div>
                </div>
              )}

              {caches && caches.runsPresent > 0 && (
                <div>
                  <div className={styles.subBlockLabel}>提示词缓存</div>
                  <table className={styles.tableSm}>
                    <thead>
                      <tr className={styles.headRow}>
                        <th className={styles.thRight}>使用缓存的运行</th>
                        <th className={styles.thRight}>读取 Tokens</th>
                        <th className={styles.thRight}>创建 Tokens</th>
                        <th className={styles.thRight}>读取比例</th>
                        <th className={styles.thRight}>节省费用</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={styles.bodyRow}>
                        <td className={styles.cellRight1}>{caches.runsPresent}</td>
                        <td className={styles.cellRight1}>{fmtTokens(caches.totalReadTokens)}</td>
                        <td className={styles.cellNumericTight}>{fmtTokens(caches.totalCreationTokens)}</td>
                        <td
                          className={styles.cellRateColor}
                          style={{
                            '--rate-color': caches.readRatio >= 0.7
                              ? 'var(--green)'
                              : caches.readRatio >= 0.4 ? 'var(--amber)' : 'var(--rust)',
                          } as CSSProperties}
                        >
                          {(caches.readRatio * 100).toFixed(0)}%
                        </td>
                        <td
                          className={styles.cellRateColor}
                          style={{
                            '--rate-color': caches.totalSavingsUSD > 0 ? 'var(--green)' : 'var(--text-2)',
                          } as CSSProperties}
                        >
                          {fmtUsd(caches.totalSavingsUSD)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className={styles.sectionFootnoteTight}>
                    读取比例至少 70% 表示缓存使用良好，较低比例可能表示缓存经常失效。
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Full cohort cost rollup. For cohort runs (3+ actors)
            ReportView passes the entire actor list so users can see
            per-actor spend ranked by total — surfaces runaway tool-call
            loops on a specific actor at a glance instead of being
            hidden in the pair-mode A/B-only summary below. */}
        {actors && actors.length > 2 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>按决策者 · {actors.length} 决策者</div>
            {(() => {
              const sortedActors = [...actors].sort((a, b) => b.cost.totalCostUSD - a.cost.totalCostUSD);
              const maxActorCost = sortedActors[0]?.cost.totalCostUSD ?? 0;
              const cohortTotal = sortedActors.reduce((s, a) => s + a.cost.totalCostUSD, 0);
              return (
                <div className={styles.perActorList}>
                  {sortedActors.map((entry, idx) => {
                    const widthPct = maxActorCost > 0 ? (entry.cost.totalCostUSD / maxActorCost) * 100 : 0;
                    const sharePct = cohortTotal > 0 ? (entry.cost.totalCostUSD / cohortTotal) * 100 : 0;
                    return (
                      <div key={entry.actorId} className={styles.perActorRow}>
                        <div className={styles.perActorRank}>#{idx + 1}</div>
                        <div className={styles.perActorName} title={entry.name}>
                          {entry.name}
                        </div>
                        <div className={styles.perActorBarTrack} aria-hidden="true">
                          <div
                            className={styles.perActorBarFill}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <div className={styles.perActorCost}>{fmtUsd(entry.cost.totalCostUSD)}</div>
                        <div className={styles.perActorMeta}>
                          {entry.cost.llmCalls}  次调用 · {fmtTokens(entry.cost.totalTokens)}  词元 · {sharePct.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Per-leader totals when both sides have reported. Lets the user
            see if one leader's simulation is unusually expensive (e.g.
            runaway tool-call loop on one side). */}
        {leaderA && leaderB && (leaderA.totalCostUSD > 0 || leaderB.totalCostUSD > 0) && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>按决策者</div>
            <div className={styles.perLeaderRow}>
              <div className={styles.leaderCard}>
                <div
                  className={styles.leaderName}
                  style={{ '--leader-color': 'var(--vis)' } as CSSProperties}
                >
                  {leaderAName || 'Leader A'}
                </div>
                <div className={styles.leaderCost}>{fmtUsd(leaderA.totalCostUSD)}</div>
                <div className={styles.leaderMeta}>{leaderA.llmCalls}  次调用 · {fmtTokens(leaderA.totalTokens)}  词元</div>
              </div>
              <div className={styles.leaderCard}>
                <div
                  className={styles.leaderName}
                  style={{ '--leader-color': 'var(--eng)' } as CSSProperties}
                >
                  {leaderBName || 'Leader B'}
                </div>
                <div className={styles.leaderCost}>{fmtUsd(leaderB.totalCostUSD)}</div>
                <div className={styles.leaderMeta}>{leaderB.llmCalls}  次调用 · {fmtTokens(leaderB.totalTokens)}  词元</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export the type so consumers can import from a single place.
export type { CostSiteBreakdown };
