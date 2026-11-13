/**
 * Lightweight UI announcement that paracosm now ships a pluggable
 * TraitModel registry. Renders a single info-level notice block above
 * the HEXACO sliders in ActorConfig so dashboard users discover the
 * registry without the full slider generalization (deferred to a
 * follow-up phase that will replace HEXACO sliders with model-aware
 * slider grids).
 *
 * Visual treatment: muted card with a small "NEW" badge, two-line
 * copy, and a link to the ai-agent cookbook entry. Matches the
 * dashboard's existing notice / banner aesthetic.
 *
 * @module paracosm/dashboard/components/settings/TraitModelNotice
 */
import styles from './TraitModelNotice.module.scss';

export function TraitModelNotice() {
  return (
    <div className={styles.notice} role="note" aria-label="可扩展人格模型">
      <span className={styles.badge} aria-hidden="true">新增</span>
      <div className={styles.body}>
        <div className={styles.headline}>
          决策者支持可扩展的人格模型。
        </div>
        <p className={styles.copy}>
          下方表单配置 HEXACO 人格，API 也支持 <code>ai-agent</code> 类型的决策者，其六个维度为探索、验证严谨度、服从、风险容忍、透明度及指令遵循。其他人格模型的滑块界面尚未提供，目前可以通过{' '}
          <code>traitProfile</code> 字段调用{' '}
          <code>runSimulation(leader, ...)</code> 直接使用。
        </p>
        <div className={styles.links}>
          <a
            href="https://github.com/framerslab/paracosm/blob/master/docs/COOKBOOK.md#pluggable-traits-ai-agent-end-to-end"
            target="_blank"
            rel="noopener"
            className={styles.link}
          >
            AI 智能体完整运行示例
          </a>
          <a
            href="https://github.com/framerslab/paracosm/blob/master/docs/COOKBOOK.md#pluggable-traits-ai-agent-end-to-end"
            target="_blank"
            rel="noopener"
            className={styles.link}
          >
            人格模型使用指南
          </a>
        </div>
      </div>
    </div>
  );
}
