/**
 * Full-viewport overlay shown while a file is being dragged over the
 * dashboard. Purely visual — no interactivity. The drop event is
 * handled at window level by {@link useDashboardDropZone}.
 */
import styles from './DropZoneOverlay.module.scss';

interface DropZoneOverlayProps {
  active: boolean;
}

export function DropZoneOverlay({ active }: DropZoneOverlayProps) {
  if (!active) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="已进入拖放区域，松开即可加载仿真文件。"
      className={styles.overlay}
    >
      <div className={styles.card}>
        <div aria-hidden="true" className={styles.icon}>⬇</div>
        <p className={styles.heading}>放下文件即可加载</p>
        <p className={styles.sub}>JSON 仿真文件</p>
      </div>
    </div>
  );
}
