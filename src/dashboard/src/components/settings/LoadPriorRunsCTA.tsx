import { useMemo, useRef } from 'react';
import { useSessions } from '../../hooks/useSessions';
import { formatRoster } from '../layout/ReplayBanner';
import styles from './LoadPriorRunsCTA.module.scss';

interface LoadPriorRunsCTAProps {
  /** Hide entirely when the session store is unavailable (server flag
   *  off, 503). Default true — caller can set false to keep showing the
   *  explanatory empty state even then. */
  hideWhenUnavailable?: boolean;
}

/**
 * Prominent call-to-action at the top of the Settings (setup) page and
 * the SIM empty state that surfaces prior saved runs. Users can watch
 * any completed run back turn-by-turn without spending API credits.
 */
export function LoadPriorRunsCTA({ hideWhenUnavailable = true }: LoadPriorRunsCTAProps = {}) {
  const { sessions, status, refresh } = useSessions();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const recent = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 3),
    [sessions],
  );

  if (status === 'loading') return null;
  if (status === 'unavailable' && hideWhenUnavailable) return null;

  const handleOpen = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('replay', id);
    url.searchParams.set('tab', 'sim');
    url.hash = '';
    window.location.assign(url.toString());
  };

  const formatCreatedAt = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isEmpty = sessions.length === 0;
  const cardCls = [styles.card, isEmpty ? styles.empty : ''].filter(Boolean).join(' ');
  const kickerCls = [styles.kicker, isEmpty ? styles.empty : ''].filter(Boolean).join(' ');
  const leadCls = [styles.lead, isEmpty ? styles.empty : ''].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={cardCls}>
      <div className={styles.headerRow}>
        <div>
          <div className={kickerCls}>
            ▶ {isEmpty ? "从缓存回放" : "查看以往运行"}
          </div>
          {isEmpty ? (
            <div className={leadCls}>
              暂无已保存的运行。{' '}
              <span className={styles.leadMuted}>
                任何仿真完成后都会{"'"}自动保存在这里，便于逐回合回放决策、工具生成和演变分叉，无需再次产生调用费用。
              </span>
            </div>
          ) : (
            <div className={leadCls}>
              不{"'"}想产生调用费用？{' '}
              <span className={styles.leadMuted}>
                可以回放 <strong className={styles.leadCount}>{sessions.length}</strong>{' '}
                个已缓存仿真{sessions.length === 1 ? '' : 's'} ，逐回合查看每次决策、工具生成和演变分叉。
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="刷新历史运行列表"
          title="刷新列表"
          className={styles.refreshBtn}
        >
          ↻ 刷新
        </button>
      </div>
      {!isEmpty && (
        <div className={styles.grid}>
          {recent.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleOpen(s.id)}
              aria-label={`Replay ${s.title || s.scenarioName || s.scenarioId || s.id}`}
              className={styles.tile}
            >
              <span className={styles.tileTitle}>
                {s.title || s.scenarioName || s.scenarioId || 'Simulation'}
              </span>
              <span className={styles.tileMeta}>
                {s.title && s.scenarioName ? `${s.scenarioName} · ` : ''}
                {typeof s.turnCount === 'number' ? `${s.turnCount} turns · ` : ''}
                {formatRoster(s) ? `${formatRoster(s)} · ` : ''}
                {formatCreatedAt(s.createdAt)}
              </span>
              {typeof s.totalCostUSD === 'number' && s.totalCostUSD > 0 && (
                <span className={styles.tileCost}>${s.totalCostUSD.toFixed(2)}</span>
              )}
              <span className={styles.tileCta}>回放 →</span>
            </button>
          ))}
        </div>
      )}
      {!isEmpty && sessions.length > 3 && (
        <div className={styles.moreNote}>
          + {sessions.length - 3} 更多，请使用 <strong>加载</strong> 顶部按钮浏览完整列表。
        </div>
      )}
    </div>
  );
}
