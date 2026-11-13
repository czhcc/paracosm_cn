import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { emitScenarioUpdated, markScenarioSwitched, subscribeScenarioUpdates } from '../../scenario-sync';
import { buildScenarioCompileRequest } from './scenarioCompileRequest';
import { compileRefusal } from './compileRefusal';
import { SETTINGS_LABEL_STYLE } from './shared/settingsStyles';
import styles from './ScenarioEditor.module.scss';
import { ADMIN_TOKEN_WHERE, adminTokenHeader, clearAdminToken, readAdminToken } from '../../admin-token';
import { localizeTemplate } from '../../template-localization';

interface AdminConfig {
  adminWrite: boolean;
  memoryScenarios: string[];
}

interface CompileProgress {
  hook: string;
  status: string;
}

const EXAMPLE_SCENARIO = {
  id: 'my-scenario',
  version: '1.0.0',
  engineArchetype: 'closed_turn_based_settlement',
  labels: { name: 'My Scenario', shortName: 'custom', populationNoun: 'agents', settlementNoun: 'settlement', currency: 'credits' },
  theme: { primaryColor: '#6366f1', accentColor: '#818cf8' },
  setup: { defaultTurns: 8, defaultSeed: 100, defaultStartTime: 2040, defaultPopulation: 50, configurableSections: ['actors', 'departments', 'models'] },
  departments: [
    { id: 'operations', label: 'Operations', role: "运营主管", icon: '', defaultModel: 'gpt-5.4-mini', instructions: "你负责分析运营情况。" },
    { id: 'research', label: 'Research', role: "研究主管", icon: '', defaultModel: 'gpt-5.4-mini', instructions: "你负责分析科研情况。" },
  ],
  metrics: [{ id: 'population', label: "人口", source: 'metrics.population', format: 'number' }],
  effects: { environmental: { morale: 0.08 }, resource: { morale: 0.05 } },
  ui: { headerMetrics: [{ id: 'population', format: 'number' }], tooltipFields: [], reportSections: ['crisis'], departmentIcons: {}, setupSections: ['actors'] },
  policies: { toolForging: { enabled: true }, liveSearch: { enabled: false, mode: 'off' }, bulletin: { enabled: true }, characterChat: { enabled: true }, sandbox: { timeoutMs: 10000, memoryMB: 128 } },
  presets: [],
};

/** The compile result the editor shows again after the reload that follows a compile. */
const COMPILE_RESULT_KEY = 'paracosm:editorCompileResult';

function readCompileResult(): { success: boolean; message: string } | null {
  try {
    const raw = window.sessionStorage.getItem(COMPILE_RESULT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { success?: unknown; message?: unknown };
    return typeof saved.message === 'string' ? { success: saved.success === true, message: saved.message } : null;
  } catch {
    return null;
  }
}

interface ScenarioEditorProps {
  /**
   * Told the server's `adminWrite` when this editor's own /admin-config
   * answer lands. Settings shows its Admin Token field on it, so the field
   * is there whenever Save to Disk is, also when Settings' own request for
   * the same answer failed.
   */
  onAdminWrite?: (adminWrite: boolean) => void;
}

export function ScenarioEditor({ onAdminWrite }: ScenarioEditorProps) {
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({ adminWrite: false, memoryScenarios: [] });
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState('');
  const [seedText, setSeedText] = useState('');
  const [seedUrl, setSeedUrl] = useState('');
  const [webSearch, setWebSearch] = useState(true);
  const [maxSearches, setMaxSearches] = useState('5');
  const [compileProvider, setCompileProvider] = useState('');
  const [compileModel, setCompileModel] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [storing, setStoring] = useState(false);
  const [progress, setProgress] = useState<CompileProgress[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(() => readCompileResult());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/admin-config').then(r => r.json()).then((config: AdminConfig) => {
      setAdminConfig(config);
      onAdminWrite?.(config.adminWrite === true);
    }).catch(() => {});
    // Shown once: the next load starts without it.
    try { window.sessionStorage.removeItem(COMPILE_RESULT_KEY); } catch { /* private mode */ }
  }, []);

  // Auto-load the active scenario JSON into the editor on mount and when scenario changes
  const loadActiveIntoEditor = useCallback(() => {
    fetch('/scenario')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.id) {
          setJsonText(JSON.stringify(localizeTemplate(data), null, 2));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadActiveIntoEditor();
    return subscribeScenarioUpdates(window, loadActiveIntoEditor);
  }, [loadActiveIntoEditor]);

  // Validate JSON on change
  useEffect(() => {
    if (!jsonText.trim()) { setParseError(''); return; }
    try { JSON.parse(jsonText); setParseError(''); }
    catch (e) { setParseError(String(e).replace('SyntaxError: ', '')); }
  }, [jsonText]);

  const loadExample = () => setJsonText(JSON.stringify(EXAMPLE_SCENARIO, null, 2));

  const loadActiveScenario = useCallback(async () => {
    try {
      const res = await fetch('/scenario');
      const data = await res.json();
      setJsonText(JSON.stringify(localizeTemplate(data), null, 2));
      setResult({ success: true, message: `已加载当前场景： ${data.labels?.name || data.id}` });
    } catch (err) { setResult({ success: false, message: `Failed to load: ${err}` }); }
  }, []);

  const importFile = () => fileInputRef.current?.click();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setJsonText(text);
      try { JSON.parse(text); setResult({ success: true, message: `Imported ${file.name} (${(file.size / 1024).toFixed(1)}KB)` }); }
      catch { setResult({ success: false, message: `Imported ${file.name} but JSON is invalid` }); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportFile = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      const name = parsed.id || 'scenario';
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.json`; a.click();
      URL.revokeObjectURL(url);
      setResult({ success: true, message: `Exported ${name}.json` });
    } catch { setResult({ success: false, message: "请修复 JSON 错误后导出" }); }
  };

  const storeInMemory = useCallback(async () => {
    if (!jsonText.trim() || parseError) return;
    setStoring(true);
    try {
      const scenario = JSON.parse(jsonText);
      const res = await fetch('/scenario/store', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, saveToDisk: false }),
      });
      const data = await res.json();
      if (data.stored) {
        emitScenarioUpdated(window);
        setResult({
          success: true,
          message: data.switchable
            ? `Stored "${data.id}" in memory and added it to the scenario selector.`
            : `Stored "${data.id}" as draft JSON in memory. Compile it to make it runnable and switchable.`,
        });
        setAdminConfig(prev => ({ ...prev, memoryScenarios: [...new Set([...prev.memoryScenarios, data.id])] }));
      } else {
        setResult({ success: false, message: data.error || "保存失败" });
      }
    } catch (err) { setResult({ success: false, message: String(err) }); }
    setStoring(false);
  }, [jsonText, parseError]);

  const saveToDisk = useCallback(async () => {
    if (!jsonText.trim() || parseError || !adminConfig.adminWrite) return;
    try {
      const scenario = JSON.parse(jsonText);
      // The disk write takes the operator's admin token, the one the server
      // wipe and the scenario delete send, entered in Settings (admin-token.ts).
      const sent = readAdminToken();
      const res = await fetch('/scenario/store', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...adminTokenHeader() },
        body: JSON.stringify({ scenario, saveToDisk: true }),
      });
      const data = await res.json();
      if (data.savedToDisk) {
        emitScenarioUpdated(window);
        setResult({
          success: true,
          message: data.switchable
            ? `已将“${data.id}”保存到 scenarios/${data.id}.json，并加载到当前场景目录。`
            : `已将“${data.id}”的 JSON 草稿保存到 scenarios/${data.id}.json。请编译后再运行，重启后仍需使用编译版本。`,
        });
      } else if (res.status === 401) {
        // No token, or one the server refused: a refused token is dropped,
        // as the other admin calls drop it, and the message says where it goes.
        // A token entered since this request went out is not the refused one.
        clearAdminToken(sent);
        setResult({ success: false, message: `磁盘写入被拒绝：缺少管理员令牌或令牌错误。${ADMIN_TOKEN_WHERE}` });
      } else {
        setResult({ success: false, message: data.error || `磁盘写入被拒绝（HTTP ${res.status}）` });
      }
    } catch (err) { setResult({ success: false, message: String(err) }); }
  }, [jsonText, parseError, adminConfig.adminWrite]);

  const compile = useCallback(async () => {
    if (!jsonText.trim() || parseError) return;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(jsonText); }
    catch { setResult({ success: false, message: "请修复 JSON 错误后编译" }); return; }

    setCompiling(true);
    setProgress([]);
    setResult(null);

    try {
      const body = buildScenarioCompileRequest({
        scenario: parsed,
        seedText,
        seedUrl,
        webSearch,
        maxSearches,
        provider: compileProvider,
        model: compileModel,
      });

      const res = await fetch('/compile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // A refused compile is one JSON object, not the stream read below:
      // an id that is taken, the day's compiles used up, a body the server
      // cannot read. Its message shows where the compile result does.
      const refusal = await compileRefusal(res);
      if (refusal !== null) {
        setResult({ success: false, message: refusal });
        setCompiling(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.hook) {
                setProgress(prev => {
                  const idx = prev.findIndex(p => p.hook === data.hook);
                  if (idx >= 0) { const u = [...prev]; u[idx] = data; return u; }
                  return [...prev, data];
                });
              }
              if (data.id) {
                // The compile put it in the catalog for everyone and made it
                // nobody's pick; switching makes it this visitor's, as the
                // compile used to make it everyone's.
                let switchError: string | null = null;
                try {
                  const switched = await fetch('/scenario/switch', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: data.id }),
                  });
                  if (!switched.ok) {
                    const body = await switched.json().catch(() => ({} as { error?: string }));
                    switchError = body.error ?? `HTTP ${switched.status}`;
                  }
                } catch (err) {
                  switchError = String(err);
                }
                if (switchError) {
                  setResult({ success: false, message: `Compiled ${data.id}，但切换失败： ${switchError}` });
                  continue;
                }
                // Reload onto the compiled scenario, as the other switches
                // do, so the page skips the run the server still holds
                // instead of showing it under the new scenario's nouns.
                // The result shows again after the reload.
                try {
                  window.sessionStorage.setItem(COMPILE_RESULT_KEY, JSON.stringify({
                    success: true,
                    message: `Compiled: ${data.id} (${data.departments} departments, ${data.hooks} 个钩子）。请在下方配置决策者后启动。`,
                  }));
                } catch {
                  // Private mode: the reload comes up without the message.
                }
                markScenarioSwitched();
                window.location.reload();
                return;
              }
              if (data.error) setResult({ success: false, message: data.error });
            } catch {}
          }
        }
      }
    } catch (err) { setResult({ success: false, message: String(err) }); }
    setCompiling(false);
  }, [jsonText, parseError, seedText, seedUrl, webSearch, maxSearches, compileProvider, compileModel]);

  const lineCount = jsonText.split('\n').length;
  const byteSize = new Blob([jsonText]).size;

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>场景编辑器</h3>
          <p className={styles.lead}>
            编写或导入场景 JSON 草稿，补充背景资料或网页链接后编译或导出。
            {!adminConfig.adminWrite && ' 此实例未启用磁盘保存。'}
          </p>
        </div>
        <div className={styles.btnRow}>
          <button onClick={loadActiveScenario} className={[styles.btn, styles.amber].join(' ')} aria-label="加载当前场景 JSON">加载当前场景</button>
          <button onClick={loadExample} className={styles.btn} aria-label="加载示例场景">示例模板</button>
          <button onClick={importFile} className={styles.btn} aria-label="导入 JSON 文件">导入</button>
          <button onClick={exportFile} className={styles.btn} disabled={!jsonText.trim() || !!parseError} aria-label="导出 JSON 文件">导出</button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileImport} className={styles.fileInput} />
        </div>
      </div>

      {/* Editor */}
      <div className={styles.editorWrap}>
        <textarea
          ref={editorRef}
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          placeholder='{\n  "id": "my-scenario",\n  "labels": { "name": "My World" },\n  "departments": [...]\n}'
          spellCheck={false}
          aria-label="场景 JSON 编辑器"
          className={styles.editor}
        />
        {/* Status bar */}
        <div
          className={styles.statusBar}
          style={{ '--status-color': parseError ? 'var(--rust)' : 'var(--text-3)' } as CSSProperties}
        >
          <span>{parseError || (jsonText.trim() ? 'Valid JSON' : "空白")}</span>
          <span>{lineCount} 行， {(byteSize / 1024).toFixed(1)}KB</span>
        </div>
      </div>

      {/* Seed enrichment */}
      <details className={styles.seedDetails}>
        <summary className={styles.seedSummary}>
          补充背景资料（可选）
        </summary>
        <div className={styles.seedBody}>
          <div>
            <label style={SETTINGS_LABEL_STYLE}>背景资料</label>
            <textarea
              value={seedText}
              onChange={e => setSeedText(e.target.value)}
              placeholder="粘贴提示词、笔记、背景描述或原始材料，以提取研究事实和类别映射。"
              className={styles.textarea}
            />
          </div>
          <div>
            <label style={SETTINGS_LABEL_STYLE}>资料链接（通过 Firecrawl 获取）</label>
            <input value={seedUrl} onChange={e => setSeedUrl(e.target.value)} placeholder="https://example.com/article" className={styles.input} />
          </div>
          <div>
            <label style={SETTINGS_LABEL_STYLE}>最多网络搜索次数</label>
            <input
              value={maxSearches}
              onChange={e => setMaxSearches(e.target.value)}
              inputMode="numeric"
              placeholder="5"
              className={styles.input}
            />
          </div>
          <div>
            <label style={SETTINGS_LABEL_STYLE}>指定编译模型服务商</label>
            <input
              value={compileProvider}
              onChange={e => setCompileProvider(e.target.value)}
              placeholder="anthropic 或 openai（可选）"
              className={styles.input}
            />
          </div>
          <div>
            <label style={SETTINGS_LABEL_STYLE}>指定编译模型</label>
            <input
              value={compileModel}
              onChange={e => setCompileModel(e.target.value)}
              placeholder="例如 gpt-5.4-mini、claude-sonnet-4-6（可选）"
              className={styles.input}
            />
          </div>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={webSearch} onChange={e => setWebSearch(e.target.checked)} />
            补充网络研究（需要 Serper、Tavily 或 Firecrawl 密钥）
          </label>
          <p className={styles.fineprint}>
            同时填写背景文字和网页链接时，优先使用网页内容进行编译。
          </p>
        </div>
      </details>

      {/* Compile progress */}
      {progress.length > 0 && (
        <div className={styles.progressWrap}>
          {progress.map(p => (
            <div key={p.hook} className={styles.progressRow}>
              <span>{p.status === 'done' ? '✔' : p.status === 'generating' ? '⏳' : p.status === 'cached' ? '✔' : '•'}</span>
              <span>{p.hook}</span>
              <span className={styles.progressStatus}>{p.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Result message */}
      {result && (
        <div
          className={styles.result}
          style={{
            '--result-color': result.success ? 'var(--green)' : 'var(--rust)',
            '--result-bg': result.success ? 'rgba(106,173,72,.06)' : 'rgba(224,101,48,.06)',
          } as CSSProperties}
        >
          {result.message}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={storeInMemory}
          disabled={!jsonText.trim() || !!parseError || storing}
          className={styles.actionBtn}
          aria-label="将场景暂存到内存"
        >
          {storing ? 'Storing...' : "暂存到内存"}
        </button>
        <button
          onClick={compile}
          disabled={!jsonText.trim() || !!parseError || compiling}
          className={[styles.actionBtn, styles.primary].join(' ')}
          aria-label="编译场景"
        >
          {compiling ? 'Compiling...' : "编译场景"}
        </button>
        {adminConfig.adminWrite && (
          <button
            onClick={saveToDisk}
            disabled={!jsonText.trim() || !!parseError}
            className={[styles.actionBtn, styles.amber].join(' ')}
            aria-label="将场景保存到磁盘"
          >
            保存到磁盘
          </button>
        )}
        <span className={styles.spacer} />
        {adminConfig.memoryScenarios.length > 0 && (
          <span className={styles.memCount}>
            {adminConfig.memoryScenarios.length} 已暂存内存
          </span>
        )}
      </div>
    </div>
  );
}
