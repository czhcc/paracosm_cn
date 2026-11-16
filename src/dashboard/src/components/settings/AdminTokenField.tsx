import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_TOKEN_UNSENDABLE,
  adminTokenState,
  clearAdminToken,
  saveAdminToken,
  subscribeAdminToken,
  type AdminTokenState,
} from '../../admin-token';
import styles from './AdminTokenField.module.scss';

const STATUS: Record<AdminTokenState, string> = {
  none: '此浏览器尚未保存管理员令牌。',
  stored: '此浏览器已保存管理员令牌，已保存的内容不会回显。',
  held: '此浏览器无法持久保存令牌，仅在本次页面打开期间有效，刷新后失效。',
};

/**
 * Where the operator enters the server's admin token.
 *
 * Settings shows it only on a server with admin writes on. The token is
 * written through admin-token.ts, which the four admin calls read; this
 * field never holds a saved token in its input and never shows one back.
 * The input and its two buttons stay on one row at every width.
 *
 * The input is uncontrolled: React mirrors a controlled input's value into
 * its value attribute, which would put typed text in the page markup. The
 * component keeps only whether anything is typed, for the Save button.
 */
export function AdminTokenField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState(false);
  const [state, setState] = useState<AdminTokenState>(() => adminTokenState());
  const [refusal, setRefusal] = useState<string | null>(null);

  // A call the server refused clears the token; so can another tab.
  useEffect(() => subscribeAdminToken(() => setState(adminTokenState())), []);

  const empty = () => {
    if (inputRef.current) inputRef.current.value = '';
    setTyped(false);
  };

  const save = () => {
    const value = inputRef.current?.value ?? '';
    if (!value.trim()) return;
    const saved = saveAdminToken(value);
    if (saved === 'unsendable') {
      // Kept in the input, so a mistyped character can be put right.
      setRefusal(ADMIN_TOKEN_UNSENDABLE);
      return;
    }
    setRefusal(null);
    setState(saved);
    empty();
  };

  const clear = () => {
    clearAdminToken();
    setState('none');
    setRefusal(null);
    empty();
  };

  return (
    <div>
      <p className={styles.intro}>
        本服务器的管理写入操作需要 <code>ADMIN_TOKEN</code>：包括下方场景编辑器的“保存到磁盘”、
        运行操作菜单中的“删除服务器数据”，以及场景详情中的“重命名”和“删除”。输入一次即可保存到此浏览器。
        控制台仅在这些请求中通过 <code>X-Admin-Token</code> 请求头发送令牌。
      </p>
      <label htmlFor="admin-token" className={styles.label}>此服务器的管理员令牌</label>
      <div className={styles.row}>
        <input
          id="admin-token"
          type="password"
          autoComplete="off"
          spellCheck={false}
          ref={inputRef}
          onChange={e => { setTyped(e.target.value.trim() !== ''); setRefusal(null); }}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
          placeholder={state === 'none' ? '尚未输入' : '已保存'}
          aria-describedby="admin-token-status"
          className={styles.input}
        />
        <button
          type="button"
          onClick={save}
          disabled={!typed}
          className={[styles.btn, styles.amber].join(' ')}
          aria-label="保存管理员令牌"
        >
          保存
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={state === 'none' && !typed}
          className={styles.btn}
          aria-label="清除管理员令牌"
        >
          清除
        </button>
      </div>
      <div id="admin-token-status" role="status" className={styles.status}>{STATUS[state]}</div>
      {refusal && <p role="alert" className={styles.refusal}>{refusal}</p>}
    </div>
  );
}
