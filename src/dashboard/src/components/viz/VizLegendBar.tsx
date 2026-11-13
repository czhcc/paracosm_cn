/**
 * Always-visible 4-glyph legend strip + a "Show full legend" popover.
 * The inline strip is glanceable; the popover carries the full color
 * map (departments, mood tiers). Dismissed with Esc, with the click
 * outside the popover, or with the Close button. Focus is trapped per
 * existing dashboard conventions while open.
 *
 * @module viz/VizLegendBar
 */
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './VizLegendBar.module.scss';

void React;

/** Department entry surfaced in the popover's color-map list. */
export interface VizLegendDept {
  id: string;
  label: string;
  color: string;
}

export interface VizLegendBarProps {
  /** Active scenario's department list with display color. */
  departments: ReadonlyArray<VizLegendDept>;
}

export function VizLegendBar({ departments }: VizLegendBarProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useFocusTrap<HTMLDivElement>(open);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Esc closes the popover. Outside-click closes too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && wrapRef.current && !wrapRef.current.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className={styles.bar} aria-label="可视化图例" ref={wrapRef}>
      <span className={styles.glyphRow}>
        <Glyph type="band" />
        <span className={styles.label}>部门色带</span>
        <Glyph type="agent" />
        <span className={styles.label}>成员</span>
        <Glyph type="featured" />
        <span className={styles.label}>重点成员</span>
        <Glyph type="turn" />
        <span className={styles.label}>回合标记</span>
      </span>
      <button
        type="button"
        className={styles.fullLegend}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >

        显示完整图例
      </button>
      {open && (
        <div
          className={styles.popover}
          role="dialog"
          aria-modal="true"
          aria-labelledby="viz-legend-heading"
          tabIndex={-1}
          ref={popoverRef}
        >
          <h3 id="viz-legend-heading" className={styles.popHeading}>

            视图说明
          </h3>
          <section>
            <h4>部门（单元格颜色）</h4>
            <ul className={styles.deptList}>
              {departments.map((d) => (
                <li key={d.id}>
                  <span
                    className={styles.deptSwatch}
                    style={{ background: d.color }}
                    aria-hidden="true"
                  />
                  {d.label}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4>情绪分级（标记符号）</h4>
            <ul className={styles.moodList}>
              <li>
                <span aria-hidden="true">▼</span>  低落（士气低于 25%）
              </li>
              <li>
                <span aria-hidden="true">▽</span>  紧张（25～50%）
              </li>
              <li>
                <span aria-hidden="true">△</span>  平稳（50～75%）
              </li>
              <li>
                <span aria-hidden="true">▲</span>  高涨（士气高于 75%）
              </li>
            </ul>
          </section>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="关闭图例"
          >

            关闭（Esc）
          </button>
        </div>
      )}
    </div>
  );
}

function Glyph({ type }: { type: 'band' | 'agent' | 'featured' | 'turn' }) {
  switch (type) {
    case 'band':
      return <span className={`${styles.glyph} ${styles.band}`} aria-hidden="true" />;
    case 'agent':
      return <span className={`${styles.glyph} ${styles.agent}`} aria-hidden="true" />;
    case 'featured':
      return <span className={`${styles.glyph} ${styles.featured}`} aria-hidden="true" />;
    case 'turn':
      return (
        <span className={`${styles.glyph} ${styles.turn}`} aria-hidden="true">
          T
        </span>
      );
  }
}
