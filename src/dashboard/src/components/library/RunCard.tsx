import * as React from 'react';
import styles from './RunCard.module.scss';
import type { RunRecord } from '../../../../server/services/run-record.js';
import { buildReplayShareUrl } from '../../hooks/shareUrl.helpers';

export interface RunCardProps {
  record: RunRecord;
  onOpen: () => void;
  onReplay: () => void;
  variant?: 'gallery' | 'compact';
}

export function RunCard(props: RunCardProps): JSX.Element {
  const { record, onOpen, onReplay, variant = 'gallery' } = props;
  // Share button is enabled only when the server's autoSaveOnComplete
  // pass populated session_id via linkSessionId. Legacy rows + runs
  // whose broadcast save failed render with the button hidden (no UI
  // affordance suggesting a feature that wouldn't actually work).
  const [copied, setCopied] = React.useState(false);
  const canShare = !!record.sessionId;
  const handleShare = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!record.sessionId) return;
    const url = buildReplayShareUrl(window.location.origin, record.sessionId, 'viz');
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // Clipboard failures (secure-context required, permission
        // denied) leave the button text unchanged. The dashboard's
        // toast pipeline doesn't reach Library row buttons without
        // additional plumbing; the silent failure matches how the
        // Quickstart card's Share button handles the same error.
      },
    );
  };

  return (
    <article
      className={[styles.card, variant === 'compact' ? styles.compact : ''].filter(Boolean).join(' ')}
      // Pointer ergonomics: clicking anywhere on the card opens the
      // run. Keyboard / screen-reader users land on the inner Open
      // and Replay buttons (see below) which are the explicit
      // affordances. The previous setup gave the article a tabIndex
      // and key handler too, which axe flagged as nested-interactive.
      aria-label={`Run ${record.scenarioId} by ${record.actorName ?? "未知决策者"}`}
      data-run-card
      data-run-id={record.runId}
      onClick={onOpen}
    >
      <header className={styles.head}>
        <span className={styles.modeBadge} data-mode={record.mode ?? 'unknown'}>{record.mode ?? 'unknown'}</span>
        <span className={styles.cost}>{record.costUSD != null ? `$${record.costUSD.toFixed(2)}` : '-'}</span>
        <span className={styles.time}>{relativeTime(record.createdAt)}</span>
      </header>
      <h3 className={styles.scenario}>{record.scenarioId}</h3>
      <p className={styles.leader}>
        {record.actorName ?? 'Unknown'}
        {record.actorArchetype ? ` · ${record.actorArchetype}` : ''}
      </p>
      <div className={styles.actions}>
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className={styles.actionBtn}>打开</button>
        <button onClick={(e) => { e.stopPropagation(); onReplay(); }} className={styles.actionBtn} aria-label="回放">回放</button>
        {canShare && (
          <button
            onClick={handleShare}
            className={styles.actionBtn}
            aria-label="复制可直接打开此次运行可视化页面的链接"
            title="复制可视化分享链接"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        )}
        {/* Compare lives at the bundle level (BundleCard). Solo runs only get Open + Replay (+ Share when sessionId is set). */}
      </div>
    </article>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '-';
  const s = ms / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)}d ago`;
  return iso.slice(0, 10);
}
