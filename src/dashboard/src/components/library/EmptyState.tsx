import * as React from 'react';
import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
  filtersActive: boolean;
  onClearFilters: () => void;
}

export function EmptyState(props: EmptyStateProps): JSX.Element {
  const { filtersActive, onClearFilters } = props;

  if (filtersActive) {
    return (
      <section className={styles.empty}>
        <div className={styles.icon} aria-hidden="true">⌕</div>
        <h2>没有符合筛选条件的运行。</h2>
        <p>清除筛选可查看资料库中的全部运行。</p>
        <button onClick={onClearFilters} className={styles.cta}>清除筛选</button>
      </section>
    );
  }

  return (
    <section className={styles.empty}>
      <div className={styles.icon} aria-hidden="true">∎</div>
      <h2>资料库中暂无运行。</h2>
      <p>可以通过以下方式开始：</p>
      <ul className={styles.list}>
        <li><a href="?tab=sim">运行火星创世纪演示</a></li>
        <li><a href="?tab=quickstart">从文字或网页链接快速开始</a></li>
        <li><a href="?tab=sim">编译自定义场景</a></li>
      </ul>
    </section>
  );
}
