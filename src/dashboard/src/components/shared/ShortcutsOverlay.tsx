import { useEffect, useState } from 'react';
import styles from './ShortcutsOverlay.module.scss';

interface Shortcut {
  keys: string[];
  description: string;
  scope: 'Global' | 'Visualization' | 'Chat';
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['?'], description: "打开快捷键说明", scope: 'Global' },
  { keys: ['Esc'], description: "关闭浮层／详情面板", scope: 'Global' },
  { keys: ['←'], description: 'Previous turn', scope: 'Visualization' },
  { keys: ['→'], description: 'Next turn', scope: 'Visualization' },
  { keys: ['Space'], description: 'Play / pause playback', scope: 'Visualization' },
  { keys: ['M'], description: "切换聚类模式（家庭／部门／情绪／年龄）", scope: 'Visualization' },
  { keys: ['D'], description: "显示／隐藏分歧颜色叠层", scope: 'Visualization' },
  { keys: ['A'], description: "收起／展开元胞区域", scope: 'Visualization' },
  { keys: ['1'], description: "元胞：情绪传播", scope: 'Visualization' },
  { keys: ['2'], description: 'Automaton: forge flow', scope: 'Visualization' },
  { keys: ['3'], description: "元胞：生态网格", scope: 'Visualization' },
  { keys: ['Enter'], description: 'Send chat message', scope: 'Chat' },
];

/**
 * Modal overlay listing all keyboard shortcuts. Toggled by `?` from
 * anywhere in the app (skips when focus is in an input/textarea so the
 * user can still type a literal `?`).
 */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !editable) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const scopes: Shortcut['scope'][] = ['Global', 'Visualization', 'Chat'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
      className={styles.backdrop}
    >
      <div onClick={e => e.stopPropagation()} className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>键盘快捷键</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts"
            className={styles.closeBtn}
          >
            ×
          </button>
        </div>

        {scopes.map(scope => {
          const items = SHORTCUTS.filter(s => s.scope === scope);
          if (items.length === 0) return null;
          return (
            <section key={scope} className={styles.section}>
              <h3 className={styles.scopeTitle}>{scope}</h3>
              <ul className={styles.list}>
                {items.map(s => (
                  <li key={s.keys.join('+')} className={styles.row}>
                    <span className={styles.keys}>
                      {s.keys.map((k, i) => (
                        <kbd key={i} className={styles.kbd}>{k}</kbd>
                      ))}
                    </span>
                    <span className={styles.description}>{s.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <div className={styles.footer}>
          按下 <kbd className={styles.kbdInline}>?</kbd> 即可打开 · <kbd className={styles.kbdInline}>Esc</kbd> 关闭
        </div>
      </div>
    </div>
  );
}
