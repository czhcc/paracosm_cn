import { useEffect, useRef, useState } from 'react';
import styles from './ExportMenu.module.scss';

interface ExportMenuProps {
  recording: boolean;
  onExportPng: () => void;
  onExportJson: () => void;
  onToggleRecording: () => void;
}

/**
 * Collapsed export toolbar — single button opens a small menu with
 * PNG / REC / JSON. Replaces three separate toolbar buttons so the
 * top row stays readable on narrow screens. Recording state still
 * shows as a pulsing indicator on the trigger button.
 */
export function ExportMenu({
  recording,
  onExportPng,
  onExportJson,
  onToggleRecording,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.anchor}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="导出选项"
        title={recording ? "正在录制，点击查看选项" : "导出选项"}
        className={[styles.trigger, open ? styles.triggerOpen : ''].filter(Boolean).join(' ')}
      >
        {recording && <span aria-hidden="true" className={styles.recDot} />}

        导出 ▼
      </button>
      {open && (
        <div role="menu" className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportPng();
            }}
            className={styles.item}
          >
            <span className={styles.itemKey}>PNG</span>
            <span className={styles.itemDesc}>当前画面</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onToggleRecording();
            }}
            className={[styles.item, recording ? styles.itemRecording : ''].filter(Boolean).join(' ')}
          >
            <span className={[styles.itemKey, recording ? styles.itemKeyRecording : ''].filter(Boolean).join(' ')}>
              {recording ? 'STOP' : 'REC'}
            </span>
            <span className={styles.itemDesc}>
              {recording ? "结束录制并下载" : "导出延时视频（WebM）"}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportJson();
            }}
            className={styles.item}
          >
            <span className={styles.itemKey}>JSON</span>
            <span className={styles.itemDesc}>回放快照</span>
          </button>
        </div>
      )}
    </div>
  );
}
