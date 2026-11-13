import * as React from 'react';
import styles from './BundleCard.module.scss';
import type { GalleryEntry } from './groupRunsByBundle.js';

export interface BundleCardProps {
  /** A bundle entry from groupRunsByBundle. Exposes scenarioId,
   *  memberCount, totalCostUSD, and the member RunRecords. */
  entry: Extract<GalleryEntry, { kind: 'bundle' }>;
  /** Open the Compare view for this bundle. */
  onOpen: () => void;
}

export function BundleCard({ entry, onOpen }: BundleCardProps): JSX.Element {
  return (
    <article
      className={styles.card}
      // The card is a passive container; the Compare button below is
      // the keyboard-reachable activator. Whole-card click stays for
      // pointer ergonomics but neither tabIndex nor a key handler are
      // set so screen-reader / keyboard users land directly on the
      // button (the previous setup nested an interactive button inside
      // an interactive card, failing axe `nested-interactive`).
      aria-label={`Bundle ${entry.bundleId} · ${entry.memberCount} actors against ${entry.scenarioId}`}
      data-bundle-card
      data-bundle-id={entry.bundleId}
      onClick={onOpen}
    >
      <header className={styles.head}>
        <span className={styles.bundleBadge}>运行组</span>
        <span className={styles.count}>{entry.memberCount} 位决策者</span>
        <span className={styles.cost}>
          {entry.totalCostUSD > 0 ? `$${entry.totalCostUSD.toFixed(2)}` : '—'}
        </span>
        <span className={styles.time}>{relativeTime(entry.earliestCreatedAt)}</span>
      </header>
      <h3 className={styles.scenario}>{entry.scenarioId}</h3>
      <ul className={styles.actors} aria-label="运行组成员">
        {entry.members
          .filter((m) => m.actorName)
          .slice(0, 5)
          .map((m) => (
            <li key={m.runId} className={styles.actor}>
              {m.actorName}
              {m.actorArchetype ? <span className={styles.archetype}> · {m.actorArchetype}</span> : null}
            </li>
          ))}
        {(() => {
          const named = entry.members.filter((m) => m.actorName);
          const unnamed = entry.members.length - named.length;
          if (named.length > 5) {
            return <li className={styles.more}>+ {named.length - 5} 更多</li>;
          }
          if (named.length === 0 && unnamed > 0) {
            // Older runs predate the actor-name field. Show one
            // honest line instead of N rows of "Unknown".
            return <li className={styles.more}>{unnamed} 决策者{unnamed === 1 ? '' : 's'} · 未记录姓名</li>;
          }
          return null;
        })()}
      </ul>
      <div className={styles.actions}>
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className={styles.actionBtn}>对比</button>
      </div>
    </article>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "刚刚";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
