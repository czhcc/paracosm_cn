/**
 * The question a `?load=` link to another site gets before anything is
 * fetched: it names the site the run file is on, and the page loads the
 * file only on Load. Cancel fetches nothing.
 *
 * Shares the LoadPreviewModal's styles, focus trap and Escape handling.
 */
import { useEffect } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './LoadPreviewModal.module.scss';

interface LoadFromHostModalProps {
  /** Host of the run file the link names. */
  host: string;
  onLoad: () => void;
  onCancel: () => void;
}

/**
 * The dialog App mounts while `useLoadFromUrl` holds a `?load=` file on
 * another site. It names `host`; Load calls `onLoad`, which starts the
 * fetch. Cancel, Escape or a click on the backdrop calls `onCancel`, and
 * nothing is fetched.
 */
export function LoadFromHostModal({ host, onLoad, onCancel }: LoadFromHostModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-from-host-title"
      aria-describedby="load-from-host-body"
      onClick={onCancel}
      className={styles.backdrop}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={styles.dialog}
      >
        <div className={styles.header}>
          <h2 id="load-from-host-title" className={styles.title}>从其他网站加载运行记录？</h2>
        </div>
        <div id="load-from-host-body" className={styles.fileInfo}>
          <p>
            此链接将从 <span className={styles.fileName}>{host}</span> 加载已保存的运行记录，
            该地址不属于本站。点击“加载”之前不会获取任何内容。
          </p>
          <p>仅在信任链接来源时加载。</p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.button} autoFocus>
            取消
          </button>
          <button type="button" onClick={onLoad} className={[styles.button, styles.primary].join(' ')}>
            加载
          </button>
        </div>
      </div>
    </div>
  );
}
