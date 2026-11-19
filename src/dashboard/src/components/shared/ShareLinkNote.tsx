import { useId } from 'react';
import type { SharedLink, ShareCopyState } from '../../hooks/useShareLink';
import { shareLinkOpensOnlyHere } from '../../hooks/shareUrl.helpers';
import styles from './ShareLinkNote.module.scss';

/** What the note says about the copy, one line each. */
export const SHARE_COPY_WORDS: Record<ShareCopyState, string> = {
  copying: '正在复制链接…',
  copied: '链接已复制。',
  refused: '浏览器拒绝复制链接，请选中链接后手动复制。',
  unanswered: '浏览器未复制链接，请选中链接后手动复制。',
};

/**
 * Who can open a replay link: the stored run plays for whoever holds the
 * link and can reach the dashboard that serves it.
 */
export const SHARE_WHO_CAN_OPEN = '获得此链接且能够访问此控制台的人都可以查看此次运行。';

/** Who can open a replay link made on a dashboard served at a local address. */
export const SHARE_OPENS_ONLY_HERE = '此链接仅能在本机打开，因为控制台使用本地地址。';

interface ShareLinkNoteProps {
  shared: SharedLink;
  onClose: () => void;
}

/**
 * What a "Share viz link" press shows: the link in a field to select and
 * copy, what became of the copy, and who can open the link.
 */
export function ShareLinkNote({ shared, onClose }: ShareLinkNoteProps) {
  const fieldId = useId();
  return (
    <div
      role="status"
      aria-label="分享链接"
      className={styles.note}
      data-state={shared.state}
    >
      <label htmlFor={fieldId} className={styles.label}>此次运行的链接</label>
      <input
        id={fieldId}
        className={styles.field}
        type="text"
        readOnly
        value={shared.url}
        onFocus={e => e.currentTarget.select()}
      />
      <p className={styles.result}>{SHARE_COPY_WORDS[shared.state]}</p>
      <p className={styles.who}>
        {shareLinkOpensOnlyHere(shared.url) ? SHARE_OPENS_ONLY_HERE : SHARE_WHO_CAN_OPEN}
      </p>
      <button type="button" className={styles.close} onClick={onClose}>关闭</button>
    </div>
  );
}
