import * as React from 'react';
import styles from './SearchBar.module.scss';

export interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar(props: SearchBarProps): JSX.Element {
  const { value, onChange, inputRef } = props;
  return (
    <div className={styles.searchBar}>
      <span className={styles.icon} aria-hidden="true">⌕</span>
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="按场景、决策者或人物类型搜索运行…"
        aria-label="搜索运行"
        className={styles.input}
      />
      <kbd className={styles.kbd}>⌘K</kbd>
    </div>
  );
}
