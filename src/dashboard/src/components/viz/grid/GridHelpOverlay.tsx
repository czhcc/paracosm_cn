import type { CSSProperties } from 'react';
import { useMediaQuery, PHONE_QUERY } from './useMediaQuery.js';
import { useScenarioLabels } from '../../../hooks/useScenarioLabels.js';
import styles from './GridHelpOverlay.module.scss';

interface GridHelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Legend + keyboard shortcuts modal. Opens via `?`. Explains what the
 * colors/flares/rings mean so a first-time viewer isn't staring at
 * unlabeled blobs. Dismisses via Esc or backdrop click.
 */
export function GridHelpOverlay({ open, onClose }: GridHelpOverlayProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  const labels = useScenarioLabels();
  if (!open) return null;

  const dialogCls = [styles.dialog, phone ? styles.phone : ''].filter(Boolean).join(' ');

  return (
    <div role="dialog" aria-modal="true" aria-label="网格可视化帮助" onClick={onClose} className={styles.backdrop}>
      <div onClick={e => e.stopPropagation()} className={dialogCls}>
        <div className={styles.header}>
          <h2 className={styles.title}>存活 {labels.Place}  网格 — 图例</h2>
          <button type="button" onClick={onClose} aria-label="关闭帮助" className={styles.closeBtn}>
            ×
          </button>
        </div>

        <Section title="模式">
          <Row k="存活" v={`Full chemistry + ${labels.person} 人员符号、亲属连线与事件光效`} />
          <Row k="情绪" v={`Emphasizes ${labels.person} 标记与按情绪着色的云图`} />
          <Row k="工具创建" v="弱化背景，突出工具创建尝试与复用弧线" />
          <Row k="生态" v="隐藏人员符号，突出指标与危机光效" />
          <Row k="分歧" v={`Only shows ${labels.people} 此侧存活、另一侧已故`} />
        </Section>

        <Section title="网格元素">
          <Row k={<Swatch color="rgba(232, 180, 74, 0.9)" />} v={`暖琥珀色表示活力较高（${labels.place} thriving)`} />
          <Row k={<Swatch color="rgba(196, 74, 30, 0.9)" />} v="锈红色表示压力集中（衰退／焦虑）" />
          <Row k="○ 小圆环" v={`Alive ${labels.person}, hover for identity`} />
          <Row k="◎ 粗圆环" v={`Featured ${labels.person} （本回合的叙事重点）`} />
          <Row k="○ 琥珀色光晕" v={`Diverged ${labels.person} — 此侧存活、另一侧已故`} />
          <Row k="部门标签" v="群组中心标签：部门与存活人数" />
        </Section>

        <Section title="事件光效">
          <Row k={<Swatch color="rgba(154, 205, 96, 0.8)" />} v="绿色绽放 — 出生" />
          <Row k={<Swatch color="rgba(168, 152, 120, 0.7)" />} v="灰色波纹 — 死亡" />
          <Row k={<Swatch color="rgba(232, 180, 74, 0.8)" />} v="琥珀色圆点 — 工具获批" />
          <Row k={<Swatch color="rgba(224, 101, 48, 0.7)" />} v="红色闪光 — 工具被拒" />
          <Row k={<Swatch color="rgba(232, 180, 74, 0.6)" />} v="琥珀色弧线 — 跨部门工具复用" />
          <Row k={<Swatch color="rgba(196, 74, 30, 0.8)" />} v="红色圆环 — 危机冲击波（按类别）" />
        </Section>

        <Section title="亲属连线">
          <Row k="— 对应侧颜色的弧线" v="伴侣连线" />
          <Row k="– 青色虚线" v="父母 → 子女连线" />
        </Section>

        <Section title="键盘操作">
          <Row k="1 / 2 / 3 / 4 / 5" v="切换模式（存活／情绪／工具创建／生态／分歧）" />
          <Row k="← / →" v="前一回合／后一回合" />
          <Row k="空格" v="播放／暂停时间线" />
          <Row k="?" v="打开／关闭此帮助" />
          <Row k="Esc" v="关闭浮层／此帮助" />
          <Row k="点击人员符号" v={`Open ${labels.person} 详情（HEXACO 雷达图、记忆与聊天）`} />
        </Section>

        <div className={styles.footer}>

          按下 <kbd className={styles.kbd}>?</kbd>  可随时重新打开。
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.rows}>{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowKey}>{k}</span>
      <span className={styles.rowVal}>{v}</span>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span className={styles.swatchWrap}>
      <span
        className={styles.swatch}
        style={{ '--swatch-color': color } as CSSProperties}
      />
    </span>
  );
}
