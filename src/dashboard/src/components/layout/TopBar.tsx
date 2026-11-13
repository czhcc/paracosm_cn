import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScenarioClientPayload } from '../../hooks/useScenario';
import type { GameState, ActorSideState } from '../../hooks/useGameState';
import type { useSSE } from '../../hooks/useSSE';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Tooltip } from '../shared/Tooltip';
import { RunMenu } from './RunMenu';
import type { LocalHistoryEntry } from '../../hooks/useLocalHistory.helpers';
import styles from './TopBar.module.scss';

/**
 * Mirror the full useSSE return shape so TopBar can read providerError,
 * abortReason, validationFallbacks etc. without any fields getting
 * silently lost behind a narrower inline literal.
 */
type SseState = ReturnType<typeof useSSE>;

interface TopBarProps {
  scenario: ScenarioClientPayload;
  sse: SseState;
  gameState: GameState;
  onSave?: () => void;
  onLoad?: () => void;
  onClear?: () => void;
  onRun?: () => void;
  onTour?: () => void;
  onCopy?: () => void;
  /**
   * Build + copy a deep link to the current run that opens on the viz
   * tab. Wired only when a `sim_saved` server event has landed during
   * this session (or the dashboard is currently replaying a stored
   * session); the menu item is hidden when no sharable session id
   * exists, so the handler doesn't have to defend against null ids.
   */
  onShareViz?: () => void;
  /** F14 local-history props, forwarded to the RunMenu's history section. */
  history?: LocalHistoryEntry[];
  onRestoreHistory?: (entry: LocalHistoryEntry) => void;
  onClearHistory?: () => void;
  /** True while the /setup request is in flight but the first SSE
   *  event hasn't yet arrived. Hides the RUN button so users can't
   *  double-launch. `gameState.isRunning` already hides it after
   *  the sim starts emitting events; this covers the gap. */
  launching?: boolean;
}

/**
 * Animated Paracosm logo. Exact brand SVG structure with subtle
 * glow/pulse/breathe animations. Node positions never move.
 */
function ParacosmLogo({ size = 20 }: { size?: number }) {
  const { resolved } = useTheme();
  const light = resolved === 'light';
  const src = '/favicon.svg';
  const glowColor = light ? 'rgba(122,82,0,.12)' : 'rgba(232,180,74,.15)';

  return (
    <span
      className={styles.logoSpan}
      style={{ '--logo-size': `${size}px`, '--logo-glow': glowColor } as CSSProperties}
    >
      <img src={src} width={size} height={size} alt="Paracosm" className={styles.logoImg} />
      <span className={`pc-logo-glow ${styles.logoGlow}`} />
    </span>
  );
}

export function TopBar({ scenario, sse, gameState, onSave, onLoad, onClear, onRun, onTour, onCopy, onShareViz, launching = false, history, onRestoreHistory, onClearHistory }: TopBarProps) {
  const { resolved, setTheme } = useTheme();
  const hasEvents = Object.values(gameState.actors).some((s: ActorSideState) => s.events.length > 0);

  // Secondary run actions (Save / Copy / Clear) consolidate behind a
  // single overflow trigger so the right cluster does not carry 9+
  // items at mid-laptop widths. Visible only once a run has events,
  // matching the previous gating on each individual button.
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRootRef = useRef<HTMLDivElement | null>(null);
  const overflowMenuRef = useFocusTrap<HTMLDivElement>(overflowOpen);
  useEffect(() => {
    if (!overflowOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOverflowOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      const root = overflowRootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [overflowOpen]);

  // Status pill priority (highest first):
  //   1. Interrupted — sim was cancelled (user navigated away, server
  //      pulled the plug, quota exhausted). Hover surfaces the specific
  //      reason captured from the first sim_aborted SSE event.
  //   2. Complete — sim finished all turns, verdict broadcast.
  //   3. Live / Reconnecting / Connecting — SSE connection state.
  const statusColor = sse.isAborted
    ? 'var(--amber)'
    : sse.isComplete
    ? 'var(--green)'
    : sse.status === 'connected'
    ? 'var(--color-success)'
    : 'var(--text-3)';

  const statusText = sse.isAborted
    ? "已中断"
    : sse.isComplete
    ? "已完成"
    : sse.status === 'connected'
    ? "已连接"
    : sse.status === 'error'
    ? "重新连接中"
    : "连接中";

  // Human-readable tooltip. Every pill state gets a one-line hint, and
  // an interrupted run additionally names the cause (quota, disconnect,
  // user cancel) so the user knows whether to retry, top up credits,
  // or keep the partial results.
  const abortReasonLabel = (raw: string): string => {
    switch (raw) {
      case 'client_disconnected': return "仿真结束前浏览器标签页被关闭";
      case 'quota_exhausted': return "模型服务额度已耗尽";
      case 'user_aborted': return "用户取消了运行";
      case 'provider_error': return "模型服务返回无法恢复的错误";
      case 'another_run_started': return "已启动另一次运行";
      case 'server_restarted': return "运行结束前服务器重启";
      case 'unknown': return "服务器未记录原因";
      default: return raw;
    }
  };
  const statusTitle = sse.isAborted
    ? (() => {
        // Provider errors take priority over the generic abort reason
        // because they are always the actionable cause (top up credits,
        // fix the key). The orchestrator does not emit sim_aborted for
        // provider errors, so without this branch the pill would read
        // "reason not recorded" on quota exhaustion.
        if (sse.providerError) {
          return `Run interrupted: ${sse.providerError.message}。点击清空可重置。`;
        }
        const r = sse.abortReason;
        if (!r) return "运行未完成全部回合就已中断，点击“清空”可重置。";
        const base = `Run interrupted: ${abortReasonLabel(r.reason)}`;
        const where = typeof r.completedTurns === 'number'
          ? ` after ${r.completedTurns} turn${r.completedTurns === 1 ? '' : 's'}`
          : '';
        return `${base}${where}。点击清空可重置。`;
      })()
    : sse.isComplete
    ? "所有回合已完成，请到“报告”查看评判结果。"
    : sse.status === 'connected'
    ? "已连接仿真服务器，点击“运行”开始。"
    : sse.status === 'error'
    ? "正在重新连接仿真服务器。"
    : "正在连接仿真服务器。";

  // Guard against gameState.maxTurns === 0 during the initialization
  // window before /scenario resolves. The outer `turn > 0` check below
  // makes this defensive in practice, but a stray 0 here would render
  // "NaN%" or "Infinity%" and break the progress bar.
  const progressPct = gameState.maxTurns > 0
    ? `${Math.round((gameState.turn / gameState.maxTurns) * 100)}%`
    : '0%';

  return (
    <header
      className={`topbar flex items-center justify-between px-4 gap-3 shrink-0 ${styles.bar}`}
      role="banner"
    >
      {/* Left: Logo + name + scenario */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Single anchor wrapping logo + brand text — both pointed at `/`
            previously, creating two adjacent Tab stops for the same
            navigation. Visible layout is preserved by keeping the
            inline-flex container on .logoLink. */}
        <a href="/" className={`${styles.logoLink} ${styles.brand}`} aria-label="Paracosm 首页">
          <ParacosmLogo size={20} />
          <span>PARA<span className={styles.brandAccent}>COSM</span></span>
        </a>
        <a
          href="https://agentos.sh/en"
          target="_blank"
          rel="noopener"
          className={`topbar-agentos ${styles.agentosTag}`}
          aria-label="AgentOS 运行时（在新标签页打开）"
          title="AgentOS 运行时"
        >
          AGENTOS
        </a>
        <span className={`topbar-agentos ${styles.divider}`} aria-hidden="true">|</span>
        <span className={`topbar-scenario ${styles.scenarioName}`}>
          {scenario.labels.name}
        </span>
      </div>

      {/* Center: Turn info + progress */}
      <div className={`flex items-center gap-3 flex-1 justify-center ${styles.center}`}>
        {gameState.turn > 0 && (
          <div className={`topbar-meta flex items-center gap-2 shrink-0 ${styles.meta}`}>
            {/* Compact T / Y / S tokens wrapped in Tooltip portal so
                viewers can hover for the full meaning. The token stays
                short so the whole topbar meta row fits at mid-laptop
                widths (1024-1440px); the rich explanation lives in the
                popover. */}
            <Tooltip
              content={
                <div>
                  <div className={styles.tooltipTitle}>
                    回合 {gameState.turn} / {gameState.maxTurns}
                  </div>
                  <div>

                    每回合完成一次决策：部门分析情况，决策者选择政策，内核推进仿真时间，居民随之变老。达到回合
                    {' '}{gameState.maxTurns}{' '}时运行结束
                    {gameState.actorIds.length === 2
                      ? " 随后由评估模型比较两位决策者。"
                      : "；三位及以上的运行跳过双人评估，展示与组内中位数的差值。"}
                  </div>
                </div>
              }
            >
              <span className={styles.tokenInline}>
                <span className={styles.tokenLabel}>T</span>
                <strong className={styles.tokenValue}>{gameState.turn}</strong>
                <span className={styles.tokenLabel}>/{gameState.maxTurns}</span>
              </span>
            </Tooltip>
            <Tooltip
              content={
                <div>
                  <div className={styles.tooltipTitle}>
                    仿真时间 {gameState.time}
                  </div>
                  <div>

                    场景中的仿真时间。每次决策按场景的 <code>timePerTurn</code>  （通常为 5～10）推进，影响衰老、生育、退休与长期叙事。这里使用仿真时间。
                  </div>
                </div>
              }
            >
              <span className={styles.tokenInline}>
                <span className={styles.tokenLabel}>Y</span>
                <strong className={styles.tokenValue}>{gameState.time}</strong>
              </span>
            </Tooltip>
            <Tooltip
              content={
                <div>
                  <div className={styles.tooltipTitle}>
                    随机种子 {gameState.seed}
                  </div>
                  <div>

                    内核随机性（居民生成、情绪变化、危机选择）均由此种子决定。相同种子、决策者和场景可复现相同人员与内核结果，使对比从相同条件出发。
                  </div>
                </div>
              }
            >
              <span className={styles.tokenInline}>
                <span className={styles.tokenLabel}>S</span>
                <strong className={styles.tokenValue}>{gameState.seed}</strong>
              </span>
            </Tooltip>
            <div
              className={`topbar-progress w-20 h-1.5 rounded-full overflow-hidden ${styles.progressTrack}`}
              role="progressbar"
              aria-valuenow={gameState.turn}
              aria-valuemin={0}
              aria-valuemax={gameState.maxTurns}
              aria-label={`仿真进度，第 ${gameState.turn} / ${gameState.maxTurns} 回合`}
            >
              <div
                className={`h-full rounded-full transition-all ${styles.progressFill}`}
                style={{ '--progress-pct': progressPct } as CSSProperties}
              />
            </div>
            {sse.validationFallbacks.length > 0 && (() => {
              // A fallback replaced a reply with the empty skeleton; a
              // salvage kept the model's own reply without the effect keys
              // the run does not hold. The pill counts both and names each.
              const fallbacks = sse.validationFallbacks.filter(b => !b.salvaged);
              const salvages = sse.validationFallbacks.filter(b => b.salvaged);
              const fellBack = fallbacks.reduce((sum, b) => sum + b.count, 0);
              const kept = salvages.reduce((sum, b) => sum + b.count, 0);
              const total = fellBack + kept;
              const fellBackLabel = `${fellBack} 次校验回退`;
              const keptLabel = `${kept} 次回复移除未持有的字段后保留`;
              const label = [fellBack > 0 ? fellBackLabel : '', kept > 0 ? keptLabel : ''].filter(Boolean).join(', ');
              const rows = (buckets: typeof fallbacks) => (
                <div className={styles.fallbackBlock}>
                  {buckets.map(b => (
                    <div key={b.schemaName} className={styles.fallbackRow}>
                      <span>{b.schemaName}</span>
                      <span className={styles.fallbackRowMeta}>
                        {b.count}× {b.lastSite ? `（最近：${b.lastSite}）` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              );
              return (
                <Tooltip
                  content={
                    <div>
                      {fellBack > 0 && (
                        <div style={{ marginBottom: kept > 0 ? 8 : 0 }}>
                          <div className={styles.tooltipTitle}>⚠ {fellBackLabel}</div>
                          <div style={{ marginBottom: 8 }}>
                            模型返回的 JSON 未通过 Zod 结构校验。重试耗尽后，调度器使用空结构继续运行，避免仿真在回合中途退出。此处统计可帮助定位校验失败的结构。
                          </div>
                          {rows(fallbacks)}
                        </div>
                      )}
                      {kept > 0 && (
                        <div>
                          <div className={styles.tooltipTitle}>⚠ {keptLabel}</div>
                          <div style={{ marginBottom: 8 }}>
                            回复仅因包含本次运行未持有的效果字段而未通过结构校验。重试后，系统移除这些字段并保留模型的原始回复，没有用空结构替代。
                          </div>
                          {rows(salvages)}
                        </div>
                      )}
                    </div>
                  }
                >
                  <span
                    aria-label={label}
                    className={styles.fallbackPill}
                  >
                    <span aria-hidden="true">⚠</span>
                    {total}
                  </span>
                </Tooltip>
              );
            })()}
          </div>
        )}
        <div className={`topbar-center hidden md:block truncate ${styles.tagline}`}>
          {gameState.turn === 0 ? "相同起点，不同决策，演变出不同未来。" : ''}
        </div>
      </div>

      {/* Right: Actions + status + theme */}
      <div className="flex items-center gap-2 shrink-0">
        {/* GitHub CTA — :hover inverts to amber. The mouse-event handler
            mutating inline styles was a workaround pre-CSS-module; the
            module's :hover rule does the same job without React state. */}
        <a
          href="https://github.com/framerslab/paracosm"
          target="_blank"
          rel="noopener noreferrer"
          className={`topbar-github ${styles.github}`}
          title="在 GitHub 为 Paracosm 点星"
          aria-label="在 GitHub 查看 Paracosm"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={styles.githubIcon}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span className="topbar-github-label">GITHUB</span>
        </a>

        {/* Tour button */}
        {onTour && (
          <button
            onClick={onTour}
            className={`topbar-tour ${styles.tourBtn}`}
            title="使用示例数据体验交互导览"
            aria-label="开始导览"
          >
            <span className="topbar-tour-label">工作原理</span>
            <span className="topbar-tour-icon" aria-hidden="true" style={{ display: 'none' }}>{'?'}</span>
          </button>
        )}
        {/* Run button. Hidden while isRunning OR launching so users
            can't double-fire /setup (which would race against the
            in-flight launch). Swaps to a disabled 'LAUNCHING...' chip
            during the launching window so the UI doesn't appear
            frozen — prior behaviour silently showed nothing. */}
        {onRun && !gameState.isRunning && !launching && (
          <RunMenu
            onRun={onRun}
            onLoadFromFile={onLoad}
            history={history}
            onRestoreHistory={onRestoreHistory}
            onClearHistory={onClearHistory}
            liveStateHasEvents={sse.events.length > 0}
          />
        )}
        {launching && !gameState.isRunning && (
          <span
            className={styles.launchingChip}
            role="status"
            aria-live="polite"
          >
            正在启动…
          </span>
        )}
        {/* Save / Copy / Clear consolidated behind a single overflow
            menu so they don't fight for horizontal space with RUN /
            GITHUB / TOUR / status / theme. Visible only when a run
            has emitted events (same gating the 3 separate buttons
            had before). */}
        {/* Clear always opens the menu so the user can wipe server-
            stored runs + sessions + output files even with an empty
            local buffer. Save/Copy still require an active run; their
            individual buttons inside the menu are gated separately. */}
        {((hasEvents && (onSave || onCopy || onShareViz)) || onClear) && (
          <div ref={overflowRootRef} className={styles.overflowAnchor}>
            <button
              type="button"
              onClick={() => setOverflowOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              aria-label={overflowOpen ? "关闭运行操作菜单" : "打开运行操作菜单"}
              title="保存 · 分享 · 复制 · 清空"
              className={`${styles.toolBtn} ${styles.overflowTrigger}`}
            >
              ⋯
            </button>
            {overflowOpen && (
              <div
                ref={overflowMenuRef}
                role="menu"
                tabIndex={-1}
                className={styles.overflowMenu}
              >
                {hasEvents && onSave && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setOverflowOpen(false); onSave(); }}
                    className={styles.overflowItem}
                    title="将仿真数据导出为 JSON"
                  >
                    保存
                  </button>
                )}
                {hasEvents && onShareViz && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setOverflowOpen(false); onShareViz(); }}
                    className={styles.overflowItem}
                    title="复制可直接打开此次运行可视化页面的链接"
                  >
                    分享可视化链接
                  </button>
                )}
                {hasEvents && onCopy && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setOverflowOpen(false); onCopy(); }}
                    className={styles.overflowItem}
                    title="复制仿真摘要到剪贴板"
                  >
                    复制
                  </button>
                )}
                {onClear && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setOverflowOpen(false); onClear(); }}
                    className={styles.overflowItemDanger}
                    title="清空浏览器中的仿真缓冲和事件缓存。通常保留服务器运行记录；若已在设置中保存管理员令牌，还会请求清除服务器数据。"
                  >
                    清空本地数据
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <span className={styles.divider} aria-hidden="true">|</span>

        {/* Status. The text label hides under .topbar-status-text at
            narrow viewports (<640px) so the colored dot alone signals
            connection state on phones; the title attribute still
            carries the full explanation for hover, and the aria-label
            keeps screen-reader semantics intact. */}
        <span
          className={styles.statusPill}
          style={{ '--status-color': statusColor } as CSSProperties}
          role="status"
          aria-live="polite"
          aria-label={`${statusText}. ${statusTitle}`}
          title={statusTitle}
        >
          <span aria-hidden="true">{sse.status === 'connected' && !sse.isComplete ? '●' : '○'}</span>
          <span className={`topbar-status-text ${styles.statusText}`}>{statusText}</span>
        </span>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${styles.themeBtn}`}
          title={`切换${resolved === 'dark' ? '浅色' : '深色'}模式`}
          aria-label={`切换${resolved === 'dark' ? '浅色' : '深色'}模式`}
        >
          {resolved === 'dark' ? '☀' : '☽'}
        </button>
      </div>
    </header>
  );
}
