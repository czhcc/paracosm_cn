import * as React from 'react';
import type { TurnDiffClass } from './turn-diff.js';
import styles from './DiffBadge.module.scss';

void React;

interface DiffBadgeProps {
  classification: TurnDiffClass;
}

const TEXT: Record<TurnDiffClass, string> = {
  'same': "✓ 相同",
  'different-outcome': "⚠ 结果不同",
  'different-event': "⚠ 事件不同",
  'pending': "… 运行中",
  'one-sided': "· · · 等待中",
};

const ARIA: Record<TurnDiffClass, string> = {
  'same': "相同事件、相同结果",
  'different-outcome': "相同事件、不同结果",
  'different-event': "不同事件",
  'pending': "此回合仍在运行",
  'one-sided': "仅一位决策者已到达此回合",
};

const CLASS_NAME: Record<TurnDiffClass, string> = {
  'same': styles.same,
  'different-outcome': styles.differentOutcome,
  'different-event': styles.differentEvent,
  'pending': styles.pending,
  'one-sided': styles.oneSided,
};

export function DiffBadge({ classification }: DiffBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${CLASS_NAME[classification]}`}
      aria-label={ARIA[classification]}
    >
      {TEXT[classification]}
    </span>
  );
}
