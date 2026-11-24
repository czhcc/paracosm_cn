import { useLayoutEffect, useRef, type CSSProperties } from 'react';
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
 *
 * As it opens, focus moves to its Close key and stays inside it, a click on
 * its words included, so the Viz tab's own keys (the arrows scrub the turn)
 * leave the panel behind it alone; as it closes, focus goes back to the key
 * that opened it.
 */
export function GridHelpOverlay({ open, onClose }: GridHelpOverlayProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  const labels = useScenarioLabels();
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const dialogCls = [styles.dialog, phone ? styles.phone : ''].filter(Boolean).join(' ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="网格可视化帮助"
      data-viz-help=""
      onClick={onClose}
      // The Close key is the overlay's one key, so Tab keeps focus on it.
      onKeyDown={e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          closeRef.current?.focus({ preventScroll: true });
        }
      }}
      className={styles.backdrop}
    >
      {/* Focusable, so a click on its words keeps focus inside the overlay. */}
      <div tabIndex={-1} onClick={e => e.stopPropagation()} className={dialogCls}>
        <div className={styles.header}>
          <h2 className={styles.title}>存活 {labels.Place} 网格 — 图例</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭帮助" className={styles.closeBtn}>
            ×
          </button>
        </div>

        <Section title="模式">
          <Row k="存活" v={`显示完整场景、${labels.person}标记和事件光效`} />
          <Row k="情绪" v={`突出${labels.person}标记和按情绪着色的云图`} />
          <Row k="工具创建" v="弱化背景，突出工具生成及复用弧线" />
          <Row k="生态" v="隐藏人员标记，以四个象限分别显示食物、水、电力和容量" />
          <Row k="分歧" v={`仅显示此侧存活、另一侧已故的${labels.people}`} />
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

        <Section title="键盘操作">
          <Row k="1 / 2 / 3 / 4 / 5" v="切换模式（存活／情绪／工具创建／生态／分歧）" />
          <Row k="← / →" v="返回上一回合／前往下一回合" />
          <Row k="Space" v="播放／暂停时间线" />
          <Row k="?" v="打开或关闭帮助" />
          <Row k="Esc" v="关闭弹窗或帮助" />
          <Row k="点击标记" v={`打开${labels.person}详情（HEXACO 雷达图、记忆、聊天）`} />
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
