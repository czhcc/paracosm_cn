/**
 * Dropdown variant of the TopBar Load button. Two rows:
 * - Load from file: delegates to the existing file picker via prop.
 * - Load from cache: expands inline to a card grid of the last N
 *   server-side saved runs (driven by useSessions). Cards navigate
 *   to /sim?replay=<id> to trigger SSE playback via the existing
 *   useSSE hook.
 *
 * Keyboard: Tab cycles rows/cards, Enter/Space activates, Esc closes.
 *
 * @module paracosm/cli/dashboard/components/layout/LoadMenu
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessions, type StoredSessionMeta } from '../../hooks/useSessions';
import {
  formatExplicit,
  shouldShowCacheRow,
  cacheExpandedBody,
} from './LoadMenu.helpers';
import { formatRoster } from './ReplayBanner';
import styles from './LoadMenu.module.scss';

export interface LoadMenuProps {
  /** Called when the user picks "Load from file". */
  onLoadFromFile: () => void;
}

function formatRelative(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return '·';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatCost(usd: number | undefined): string {
  if (usd == null) return '·';
  if (usd < 0.005) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

function Card({ s, onPick }: { s: StoredSessionMeta; onPick: () => void }) {
  // Prefer the LLM-generated narrative title when present. Fall back to
  // scenarioName for titleless rows, then to a deterministic label.
  // formatRoster handles cohort runs ("Aria, Maria, Atlas, +5 more")
  // and pair fallback ("Aria vs Maria") off the same meta shape.
  const roster = formatRoster(s);
  const deterministicTitle = roster
    ? `${roster}${s.scenarioName ? ` · ${s.scenarioName}` : ''}`
    : s.scenarioName || "仿真运行";
  const title = s.title || s.scenarioName || deterministicTitle;
  const actors = roster;
  const scenarioSub = s.title && s.scenarioName ? s.scenarioName : '';
  const turns = s.turnCount != null ? `${s.turnCount} turn${s.turnCount === 1 ? '' : 's'}` : '';
  const line2 = [actors, scenarioSub, turns].filter(Boolean).join(' · ');
  const line3 = `${formatExplicit(s.createdAt)} (${formatRelative(s.createdAt)}) · ${formatDuration(s.durationMs)} · ${formatCost(s.totalCostUSD)}`;
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); }
      }}
    >
      <div className={styles.cardTitle}>{title}</div>
      {line2 && <div className={styles.cardLine2}>{line2}</div>}
      <div className={styles.cardLine3}>{line3}</div>
    </button>
  );
}

export function LoadMenu(props: LoadMenuProps) {
  const [open, setOpen] = useState(false);
  // Cache section opens expanded by default so cached runs are visible
  // the moment the menu opens.
  const [cacheExpanded, setCacheExpanded] = useState(true);
  const { sessions, status, refresh } = useSessions();
  const rootRef = useRef<HTMLDivElement>(null);

  // Refresh the saved-sessions list every time the menu opens so a run
  // that completed while the dashboard was open shows up immediately.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const close = useCallback(() => {
    setOpen(false);
    setCacheExpanded(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const handleFile = () => {
    props.onLoadFromFile();
    close();
  };

  const handlePick = (id: string) => {
    // See LoadPriorRunsCTA for the full backstory: resolveSetupRedirectHref
    // is for server /setup redirect paths and rebuilds the URL from the
    // redirect path arg, dropping the ?replay query buildReplayHref just
    // appended. Set both params on the current URL directly instead.
    const url = new URL(window.location.href);
    url.searchParams.set('replay', id);
    url.searchParams.set('tab', 'sim');
    url.hash = '';
    window.location.assign(url.toString());
  };

  const body = cacheExpandedBody(status, sessions);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        data-paracosm-load-menu-trigger="true"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        title="从文件或服务器缓存加载已保存的仿真"
        onClick={() => setOpen(o => !o)}
      >
        加载
      </button>
      {open && (
        <div role="menu" className={styles.popover}>
          {shouldShowCacheRow(status) && (
            <>
              <div
                role="menuitem"
                tabIndex={0}
                className={styles.row}
                onClick={() => setCacheExpanded(v => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCacheExpanded(v => !v); } }}
                aria-expanded={cacheExpanded}
              >
                <span>从缓存加载</span>
                <span className={styles.rowSubLabel}>
                  {status === 'loading' ? '...' : `${sessions.length} saved`}
                </span>
              </div>
              {cacheExpanded && body === 'loading' && (
                <div className={styles.statusMessage}>正在加载缓存运行…</div>
              )}
              {cacheExpanded && body === 'empty' && (
                <div className={styles.statusMessage}>
                  暂无缓存运行，完成后的运行会自动显示在这里。
                </div>
              )}
              {cacheExpanded && body === 'error' && (
                <div className={styles.errorMessage}>
                  无法连接服务器，请确认 Paracosm 服务器正在运行后刷新。
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className={styles.retryButton}
                  >
                    重试
                  </button>
                </div>
              )}
              {cacheExpanded && body === 'unavailable' && (
                <div className={styles.warningMessage}>
                  服务器会话存储尚未初始化，需要使用可写数据目录重新启动服务器后才能显示缓存运行。
                </div>
              )}
              {/*
                Cards list caps at roughly 5 cards of visible height and
                scrolls the rest. Each card is ~70px tall (3 text lines +
                12px vertical padding + 6px bottom margin); 5 * 70 = 350.
              */}
              {cacheExpanded && body === 'cards' && (
                <div className={styles.cardsList}>
                  {sessions.map(s => (
                    <Card key={s.id} s={s} onPick={() => handlePick(s.id)} />
                  ))}
                </div>
              )}
            </>
          )}

          <div
            role="menuitem"
            tabIndex={0}
            className={styles.row}
            onClick={handleFile}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFile(); } }}
          >
            <span>从文件加载</span>
            <span className={styles.rowSubLabel}>.json</span>
          </div>
        </div>
      )}
    </div>
  );
}
