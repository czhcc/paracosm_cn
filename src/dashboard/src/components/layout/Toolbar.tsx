import { useScenarioContext } from '../../App';
import type { GameState } from '../../hooks/useGameState';

interface ToolbarProps {
  state: GameState;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
}

const btnStyle = {
  background: 'var(--bg-card)',
  color: 'var(--text-2)',
  border: '1px solid var(--border)',
  padding: '3px 12px',
  borderRadius: '3px',
  fontSize: 'var(--font-2xs)',
  cursor: 'pointer',
  fontWeight: 600,
  fontFamily: 'var(--sans)',
};

export function Toolbar({ state, onSave, onLoad, onClear }: ToolbarProps) {
  const scenario = useScenarioContext();
  const hasEvents = Object.values(state.actors).some(s => s.events.length > 0);

  return (
    <div
      className="toolbar shrink-0"
      role="toolbar"
      aria-label="仿真控制"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 16px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        fontSize: 'var(--font-2xs)',
      }}
    >
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {scenario.id}
      </span>
      <div style={{ flex: 1 }} />
      {hasEvents && (
        <button onClick={onSave} style={btnStyle} aria-label="保存仿真数据" title="将当前仿真事件和结果导出为 .json 文件">保存</button>
      )}
      <button onClick={onLoad} style={btnStyle} aria-label="加载已保存的仿真" title="加载通过保存按钮导出的 .json 仿真文件">加载仿真</button>
      {hasEvents && (
        <button onClick={onClear} style={{ ...btnStyle, color: 'var(--rust)' }} aria-label="清除仿真数据" title="清除全部仿真数据并返回设置，此操作不可撤销。">清空</button>
      )}
    </div>
  );
}
