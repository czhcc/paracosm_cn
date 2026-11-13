import { localizeTemplate, displayLabel } from '../../template-localization';
import type { TurnEventInfo } from '../../hooks/useGameState';
import { useScenarioLabels } from '../../hooks/useScenarioLabels';
import { Tooltip } from '../shared/Tooltip';
import styles from './TurnEventHeader.module.scss';

interface TurnEventHeaderProps {
  actorIndex: number;
  event: TurnEventInfo | null;
}

/**
 * Per-turn narrative event header at the top of each leader's column.
 * Scenario label `labels.eventNounSingular` controls what a user sees
 * (e.g. "crisis" for Mars, "incident" for a submarine sim) but the
 * internal contract is generic: `TurnEventInfo`.
 *
 * Layout: two-line-clamped header bar. Label pills (T#, category,
 * EMERGENT) on line 1; description clamps to line 2 via
 * `-webkit-line-clamp: 2`. Hover popover shows the full context.
 */
export function TurnEventHeader({ actorIndex, event }: TurnEventHeaderProps) {
  const labels = useScenarioLabels();
  if (!event) return null;

  const fullText = event.description || event.turnSummary || '';

  const popover = (
    <div>
      <b className={styles.popoverTitle}>
        T{event.turn}: {localizeTemplate(event.title)}
      </b>
      <div className={styles.popoverMetaRow}>
        <span className={styles.popoverCategory}>{displayLabel(event.category)}</span>
        {event.emergent && <span className={styles.popoverEmergent}>涌现事件</span>}
        <span className={styles.popoverContext}>
          {labels.Time} {event.time} · 决策者 {String.fromCharCode(65 + actorIndex)}
        </span>
      </div>
      {fullText && <div className={styles.popoverBody}>{fullText}</div>}
    </div>
  );

  return (
    <Tooltip content={popover} block>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.titleText}>T{event.turn}: {localizeTemplate(event.title)}</span>
          <span className={styles.categoryPill}>{displayLabel(event.category)}</span>
          {event.emergent && <span className={styles.emergentPill}>涌现事件</span>}
        </div>
        {fullText && <span className={styles.body}>{fullText}</span>}
      </div>
    </Tooltip>
  );
}
