import type { CSSProperties } from 'react';
import { useMediaQuery, PHONE_QUERY } from '../viz/grid/useMediaQuery';
import styles from './Footer.module.scss';

interface FooterAbortReason {
  reason: string;
  completedTurns?: number;
}

interface FooterProviderError {
  message: string;
}

interface FooterProps {
  cost?: { totalTokens: number; totalCostUSD: number; llmCalls: number };
  /**
   * Optional per-source split of the cost total. When provided, the
   * Footer's cost span gains a hover tooltip that breaks down the
   * number into sim vs chat components so users can debug where
   * spend is coming from. Keys are USD; any key <= 0 is omitted
   * from the tooltip line.
   */
  costBreakdown?: {
    simUSD?: number;
    simCalls?: number;
    chatUSD?: number;
    chatCalls?: number;
  };
  simStatus?: {
    isRunning: boolean;
    isComplete: boolean;
    isAborted: boolean;
    connectionStatus: 'connecting' | 'connected' | 'error' | 'replay_not_found';
    abortReason?: FooterAbortReason | null;
    providerError?: FooterProviderError | null;
  };
}

function abortReasonLabel(raw: string): string {
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
}

function StatusChip({ s }: { s: NonNullable<FooterProps['simStatus']> }) {
  const color = s.isAborted
    ? 'var(--amber)'
    : s.isComplete
    ? 'var(--green)'
    : s.isRunning
    ? 'var(--color-success, var(--green))'
    : s.connectionStatus === 'connected'
    ? 'var(--text-3)'
    : 'var(--text-3)';
  const text = s.isAborted
    ? "已中断"
    : s.isComplete
    ? "已完成"
    : s.isRunning
    ? "运行中"
    : s.connectionStatus === 'connected'
    ? "待机"
    : s.connectionStatus === 'error'
    ? "重新连接中"
    : "连接中";
  const glyph = s.isRunning && !s.isComplete && !s.isAborted ? '●' : '○';
  const title = s.isAborted
    ? (() => {
        if (s.providerError) {
          return `运行中断：${s.providerError.message}。点击“清空”可重置。`;
        }
        const r = s.abortReason;
        if (!r) return "运行未完成全部回合就已中断，点击“清空”可重置。";
        const where = typeof r.completedTurns === 'number'
          ? ` after ${r.completedTurns} turn${r.completedTurns === 1 ? '' : 's'}`
          : '';
        return `Run interrupted: ${abortReasonLabel(r.reason)}${where}。点击清空可重置。`;
      })()
    : s.isComplete
    ? "所有回合已完成，请到“报告”查看评判结果。"
    : s.isRunning
    ? "仿真正在运行。"
    : s.connectionStatus === 'connected'
    ? "已连接仿真服务器，点击“运行”开始。"
    : s.connectionStatus === 'error'
    ? "正在重新连接仿真服务器。"
    : "正在连接仿真服务器。";
  return (
    <span
      className={styles.statusChip}
      style={{ '--status-color': color } as CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={`仿真状态：${text}。${title}`}
      title={title}
    >
      {glyph} {text}
    </span>
  );
}

function formatUsdShort(u: number): string {
  if (u < 0.01) return `$${u.toFixed(4)}`;
  return `$${u.toFixed(2)}`;
}

function buildCostTooltip(
  cost: NonNullable<FooterProps['cost']>,
  breakdown: FooterProps['costBreakdown'],
): string {
  const lines: string[] = [
    `合计：${formatUsdShort(cost.totalCostUSD)} · ${cost.totalTokens.toLocaleString()} 个词元 · ${cost.llmCalls} 次调用`,
  ];
  if (breakdown) {
    const sim = breakdown.simUSD ?? 0;
    const chat = breakdown.chatUSD ?? 0;
    if (sim > 0) lines.push(`• 仿真： ${formatUsdShort(sim)}${breakdown.simCalls != null ? ` (${breakdown.simCalls} 次调用)` : ''}`);
    if (chat > 0) lines.push(`• 聊天： ${formatUsdShort(chat)}${breakdown.chatCalls != null ? ` (${breakdown.chatCalls} 次调用)` : ''}`);
  }
  return lines.join('\n');
}

export function Footer({ cost, costBreakdown, simStatus }: FooterProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const cls = ['shrink-0', styles.footer, isPhone ? styles.phone : ''].filter(Boolean).join(' ');
  return (
    <footer className={cls} role="contentinfo">
      {!isPhone && (
        <nav aria-label="页脚链接" className={styles.nav}>
          <a href="https://agentos.sh/en" target="_blank" rel="noopener" className={styles.navLink}>agentos.sh</a>
          <a href="https://github.com/framerslab/paracosm" target="_blank" rel="noopener" className={styles.navLink}>github</a>
          <a href="https://www.npmjs.com/package/paracosm" target="_blank" rel="noopener" className={styles.navLink}>npm</a>
          <a href="/docs" className={styles.navLink}>文档</a>
          <a href="https://agentos.sh/blog" target="_blank" rel="noopener" className={styles.navLink}>博客</a>
        </nav>
      )}

      {simStatus && <StatusChip s={simStatus} />}

      {cost && (cost.totalTokens > 0 || cost.llmCalls > 0) && (
        <span className={styles.cost} title={buildCostTooltip(cost, costBreakdown)}>
          <span className={styles.costAmount}>
            ${cost.totalCostUSD < 0.01 ? cost.totalCostUSD.toFixed(4) : cost.totalCostUSD.toFixed(2)}
          </span>
          <span className={styles.costMuted}>
            {(cost.totalTokens / 1000).toFixed(0)}千词元
          </span>
          {cost.llmCalls > 0 && (
            <span className={styles.costMuted}>
              {cost.llmCalls} 次调用
            </span>
          )}
        </span>
      )}

      {!isPhone && (
        <span>
          <span className={styles.brand}>PARA<span className={styles.brandAccent}>COSM</span></span>
          {' '}&middot; Apache-2.0 &middot; <a href="https://frame.dev" target="_blank" rel="noopener" className={styles.brandLink}>Frame.dev</a>
        </span>
      )}
    </footer>
  );
}
