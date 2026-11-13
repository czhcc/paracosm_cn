/**
 * DigitalTwinPanel — renders a finished `simulateIntervention` artifact
 * inline in the SIM tab. Activates when the loaded artifact has both
 * `subject` and `intervention` populated; otherwise SimView falls back
 * to the standard parallel-actor layout.
 *
 * Sections rendered:
 *  - Subject card (id, name, profile fields, signal trail)
 *  - Intervention card (name, description, duration, adherence)
 *  - Final-state metrics with delta against the first kernel snapshot
 *  - Trajectory mini-chart (per-metric line for up to three key metrics)
 *  - Cost / fingerprint summary row
 *
 * Designed to be self-contained: takes a single `artifact` prop and
 * renders read-only. The "dismiss" button calls `onDismiss` which the
 * parent (App.tsx) uses to clear the in-memory intervention artifact
 * and re-show the empty SIM state.
 *
 * @module paracosm/dashboard/digital-twin/DigitalTwinPanel
 */
import { useMemo, useState, useEffect, useRef, type CSSProperties } from 'react';
import type { RunArtifact } from '../../../../engine/schema/index.js';
import type { GameState } from '../../hooks/useGameState';
import styles from './DigitalTwinPanel.module.scss';

export interface DigitalTwinPanelProps {
  artifact: RunArtifact;
  /**
   * GameState built from the SSE events the server broadcast during
   * the run. When present, the panel exposes a "Playback" section
   * that lets the viewer scrub through every event the run emitted —
   * specialist analyses, forge attempts, the decision, the outcome —
   * matched to the live trail the SIM tab showed while the run was
   * in flight. Optional so a panel rendered against an artifact
   * loaded from disk (no live events) still works.
   */
  state?: GameState;
  onDismiss?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  // t2d-glp1-protocol metrics (the patient digital-twin scenario)
  hba1c: 'HbA1c',
  fastingGlucose: "空腹血糖",
  weight: 'Weight (lb)',
  bmi: 'BMI',
  exerciseAdherence: "运动执行程度",
  sleepHours: 'Sleep (hrs/night)',
  qualityOfLife: "生活质量",
  mortalityRisk: "十年死亡风险",
  cardioFitness: "心肺适能",
  sideEffectBurden: "不良反应负担",
  patientMotivation: 'Motivation',
  familySupport: "家庭支持",
  // legacy / cross-scenario metrics (kept so non-medical scenarios
  // still get readable labels)
  population: 'Population',
  morale: 'Morale',
  alignmentBench: 'AlignmentBench',
  specGamingRate: "规则投机率",
  capabilityIndex: "能力指数",
  releaseReadiness: "发布准备度",
  redTeamCoverage: "红队测试覆盖率",
  runwayMonths: 'Runway',
  burnRate: 'Burn',
  marketShare: "市场份额",
  revenueArr: "年度经常性收入",
};

// Three signals that move under a 12-week GLP-1 + lifestyle protocol:
// HbA1c drops as glycemic control improves, weight drops as the drug
// + diet take effect, exercise adherence climbs as the lifestyle coach
// scaffolding holds. Together these tell the patient-twin story in one
// chart.
const CHART_METRICS = ['hba1c', 'weight', 'exerciseAdherence'];

const CHART_COLORS: Record<string, string> = {
  hba1c: '#ef6f5d',
  weight: '#ffd970',
  exerciseAdherence: '#34d399',
  // alternate medical metrics
  bmi: '#a78bfa',
  qualityOfLife: '#7cb6ff',
  mortalityRisk: '#ef6f5d',
  // legacy fallbacks for non-medical artifacts
  alignmentBench: '#7cb6ff',
  specGamingRate: '#ef6f5d',
  releaseReadiness: '#ffd970',
  morale: '#ffd970',
  runwayMonths: '#5fd49a',
  marketShare: '#7cb6ff',
};

// A run saved before the kernel seeded only declared metrics carries the
// colony defaults (powerKw, foodMonthsReserve, waterLitersPerDay,
// pressurizedVolumeM3, lifeSupportCapacity, infrastructureModules,
// scienceOutput) beside its scenario's world.metrics, and every run
// carries morale. For a patient digital-twin run those values are noise — the panel would render HbA1c next to
// lifeSupportCapacity. We allow-list the medical metrics the
// t2d-glp1-protocol scenario declares so the grid only shows
// subject-relevant numbers. Falls back to "show every metric" when the
// artifact is from a non-medical scenario.
const DIGITAL_TWIN_METRICS = new Set([
  'hba1c',
  'fastingGlucose',
  'weight',
  'bmi',
  'exerciseAdherence',
  'sleepHours',
  'qualityOfLife',
  'mortalityRisk',
  'cardioFitness',
  'sideEffectBurden',
]);

function formatNumber(value: number): string {
  if (Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) < 1) return value.toFixed(3);
  return value.toFixed(2);
}

function formatDelta(initial: number, final: number): { text: string; direction: 'up' | 'down' | 'flat' } {
  const delta = final - initial;
  if (Math.abs(delta) < 1e-6) return { text: '·', direction: 'flat' };
  const sign = delta > 0 ? '+' : '';
  return {
    text: `${sign}${formatNumber(delta)}`,
    direction: delta > 0 ? 'up' : 'down',
  };
}

function formatProfileValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const EVENT_LABELS: Record<string, string> = {
  run_started: "运行已启动",
  turn_started: "回合已开始",
  event_start: "危机事件",
  specialist_start: "专家正在分析",
  specialist_done: "专家分析完成",
  forge_attempt: "尝试生成工具",
  forge_approved: "工具已生成",
  forge_rejected: "工具被拒绝",
  decision_pending: "等待决策",
  decision_made: "已作出决策",
  outcome: 'Outcome',
  bulletin: 'Bulletin',
  turn_done: "回合完成",
  agent_reactions: "成员反应",
  promotion: 'Promotion',
  systems_snapshot: 'Snapshot',
  complete: "已完成",
};

function eventBody(event: { type: string; data: Record<string, unknown> }): string {
  const d = event.data ?? {};
  if (typeof d.title === 'string') return d.title;
  if (typeof d.summary === 'string') return d.summary;
  if (typeof d.name === 'string') return d.name;
  if (typeof d.description === 'string') return d.description;
  if (typeof d.outcome === 'string') return d.outcome;
  if (typeof d.toolName === 'string') return d.toolName;
  if (typeof d.department === 'string') return d.department;
  return '';
}

export function DigitalTwinPanel({ artifact, state, onDismiss }: DigitalTwinPanelProps) {
  const { subject, intervention, finalState, trajectory, cost, fingerprint, metadata } = artifact;

  const initialMetrics = useMemo(() => {
    const tj = trajectory as { sampleTimepoint?: { worldSnapshot?: { metrics?: Record<string, number> } }; timepoints?: Array<{ worldSnapshot?: { metrics?: Record<string, number> } }> } | undefined;
    if (tj?.timepoints && tj.timepoints.length > 0) {
      return tj.timepoints[0]?.worldSnapshot?.metrics ?? {};
    }
    return tj?.sampleTimepoint?.worldSnapshot?.metrics ?? {};
  }, [trajectory]);

  const finalMetrics = (finalState as { metrics?: Record<string, number> } | undefined)?.metrics ?? {};

  const profileEntries = subject?.profile
    ? Object.entries(subject.profile).slice(0, 6)
    : [];

  const chartData = useMemo(() => {
    const tj = trajectory as { timepoints?: Array<{ time?: number; label?: string; worldSnapshot?: { metrics?: Record<string, number> } }> } | undefined;
    const points = tj?.timepoints ?? [];
    if (points.length === 0) return null;
    const series = CHART_METRICS.map(metric => {
      const values = points.map(p => p.worldSnapshot?.metrics?.[metric] ?? null);
      const valid = values.filter((v): v is number => typeof v === 'number');
      if (valid.length < 1) return null;
      const min = Math.min(...valid);
      const max = Math.max(...valid);
      return { metric, values, min, max };
    }).filter((s): s is { metric: string; values: Array<number | null>; min: number; max: number } => s !== null);
    return { points, series };
  }, [trajectory]);

  const metricKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(finalMetrics).forEach(k => keys.add(k));
    Object.keys(initialMetrics).forEach(k => keys.add(k));
    // If any digital-twin medical metric is present we're in
    // patient-twin mode; filter the grid to subject-shaped metrics.
    // Otherwise we're rendering against a non-medical artifact and the
    // unrestricted first-12 view is the right fallback (Mars /
    // corporate-quarterly / lunar / submarine / frontier-ai-lab).
    const inDigitalTwinScenario = Array.from(keys).some(k => DIGITAL_TWIN_METRICS.has(k));
    const filtered = inDigitalTwinScenario
      ? Array.from(keys).filter(k => DIGITAL_TWIN_METRICS.has(k))
      : Array.from(keys);
    return filtered.slice(0, 12);
  }, [finalMetrics, initialMetrics]);

  const fingerprintTop = fingerprint
    ? Object.entries(fingerprint).slice(0, 6)
    : [];

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>数字孪生 · 干预结果</h2>
          <span className={styles.subTitle}>
            {metadata?.scenario?.name ?? 'scenario'} · 随机种子 {metadata?.seed ?? '?'} · {trajectory?.timepoints?.length ?? 0} 回合
          </span>
        </div>
        <div className={styles.runMeta}>
          {metadata?.runId && <span>运行： {metadata.runId.slice(0, 28)}</span>}
          {cost?.totalUSD != null && <span>${cost.totalUSD.toFixed(3)}</span>}
          {cost?.llmCalls != null && <span>{cost.llmCalls} 模型调用</span>}
        </div>
      </div>

      <div className={styles.cardsRow}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>对象</span>
            <span className={styles.cardId}>{subject?.id}</span>
          </div>
          <div className={styles.cardName}>{subject?.name}</div>
          {profileEntries.length > 0 && (
            <div className={styles.kvList}>
              {profileEntries.map(([key, value]) => (
                <div key={key} className={styles.kv}>
                  <span>{key}</span>
                  <span>{formatProfileValue(value)}</span>
                </div>
              ))}
            </div>
          )}
          {subject?.signals && subject.signals.length > 0 && (
            <div className={styles.signalList}>
              {subject.signals.slice(0, 4).map((s, i) => (
                <div key={i} className={styles.signal}>
                  <span className={styles.signalLabel}>{s.label}</span>
                  <span className={styles.signalValue}>
                    {typeof s.value === 'number' ? formatNumber(s.value) : String(s.value)}
                    {s.unit ? ` ${s.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>干预措施</span>
            <span className={styles.cardId}>{intervention?.id}</span>
          </div>
          <div className={styles.cardName}>{intervention?.name}</div>
          {intervention?.description && (
            <p className={styles.description}>{intervention.description}</p>
          )}
          <div className={styles.kvList}>
            {intervention?.duration && (
              <div className={styles.kv}>
                <span>持续时间</span>
                <span>{intervention.duration.value} {intervention.duration.unit}</span>
              </div>
            )}
            {intervention?.adherenceProfile && (
              <div className={styles.kv}>
                <span>执行程度</span>
                <span>{(intervention.adherenceProfile.expected * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {metricKeys.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>最终状态 · 相对初始值变化</h3>
          <div className={styles.metricsGrid}>
            {metricKeys.map(key => {
              const initial = initialMetrics[key];
              const final = finalMetrics[key];
              if (typeof final !== 'number') return null;
              const delta = typeof initial === 'number' ? formatDelta(initial, final) : null;
              return (
                <div key={key} className={styles.metric}>
                  <span className={styles.metricLabel}>{METRIC_LABELS[key] ?? key}</span>
                  <span className={styles.metricValue}>{formatNumber(final)}</span>
                  {delta && (
                    <span
                      className={`${styles.metricDelta} ${delta.direction === 'up' ? styles.metricDeltaUp : delta.direction === 'down' ? styles.metricDeltaDown : ''}`}
                    >
                      {delta.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartData && chartData.series.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>演变过程</h3>
          <div className={styles.chartWrap}>
            <svg className={styles.chart} viewBox="0 0 600 200" preserveAspectRatio="none">
              {chartData.series.map(series => {
                const range = Math.max(0.0001, series.max - series.min);
                const stepX = chartData.points.length > 1 ? 580 / (chartData.points.length - 1) : 0;
                let path = '';
                series.values.forEach((v, i) => {
                  if (typeof v !== 'number') return;
                  const x = 10 + i * stepX;
                  const normalized = (v - series.min) / range;
                  const y = 180 - normalized * 160;
                  path += (path ? ' L' : 'M') + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return (
                  <g key={series.metric}>
                    <path d={path} stroke={CHART_COLORS[series.metric] ?? '#ffd970'} strokeWidth={1.5} fill="none" />
                    {series.values.map((v, i) => {
                      if (typeof v !== 'number') return null;
                      const x = 10 + i * stepX;
                      const normalized = (v - series.min) / range;
                      const y = 180 - normalized * 160;
                      return <circle key={`${series.metric}-${i}`} cx={x} cy={y} r={2.5} fill={CHART_COLORS[series.metric] ?? '#ffd970'} />;
                    })}
                  </g>
                );
              })}
              {chartData.points.map((p, i) => {
                const stepX = chartData.points.length > 1 ? 580 / (chartData.points.length - 1) : 0;
                const x = 10 + i * stepX;
                return (
                  <text key={`label-${i}`} x={x} y={196} fontSize={9} textAnchor="middle" fill="#888">
                    {p.label ?? `t${p.time ?? i}`}
                  </text>
                );
              })}
            </svg>
            <div className={styles.chartLegend}>
              {chartData.series.map(series => (
                <span key={series.metric} className={styles.legendItem}>
                  <span
                    className={`${styles.legendSwatch} ${styles.legendSwatchInline}`}
                    style={{ '--swatch-color': CHART_COLORS[series.metric] } as CSSProperties}
                  />
                  {METRIC_LABELS[series.metric] ?? series.metric}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {fingerprintTop.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>运行特征</h3>
          <div className={styles.fingerprintList}>
            {fingerprintTop.map(([key, value]) => (
              <span key={key} className={styles.fingerprintChip}>
                {key}<b>{String(value)}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <DigitalTwinPlayback state={state} />

      {onDismiss && (
        <div className={styles.dismissBar}>
          <button onClick={onDismiss} className={styles.dismissButton}>
            清空并重新运行
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Scrubbable playback of the run's SSE event trail. Renders a slider
 * that walks the user through every event the run emitted (specialist
 * analyses, forge attempts, decision, outcome, completion) plus a
 * play/pause control that reveals events sequentially at ~600ms each.
 *
 * Reads events directly from gameState (the same stream
 * DigitalTwinProgress consumed live), so the playback timeline matches
 * the live feed exactly.
 */
function DigitalTwinPlayback({ state }: { state?: GameState }) {
  const events = useMemo(() => {
    if (!state) return [];
    const leaderId = state.actorIds[0];
    return leaderId ? state.actors[leaderId]?.events ?? [] : [];
  }, [state]);

  const totalEvents = events.length;
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Park the slider at the end the first time events arrive so a
  // freshly-completed run shows the final state by default. Tracked via
  // a ref so the effect only fires once even if events grow further.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && totalEvents > 0) {
      initializedRef.current = true;
      setPosition(totalEvents);
    }
  }, [totalEvents]);

  // Auto-advance one event every 600ms while playing.
  useEffect(() => {
    if (!playing) return;
    if (position >= totalEvents) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setPosition((p) => p + 1), 600);
    return () => window.clearTimeout(id);
  }, [playing, position, totalEvents]);

  if (totalEvents === 0) return null;

  const visibleEvents = events.slice(0, position);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>回放 · {position} / {totalEvents} 个事件</h3>
      <div className={styles.playbackControls}>
        <button onClick={() => setPlaying(!playing)} className={styles.playbackPlayBtn}>
          {playing ? 'Pause' : (position >= totalEvents ? "回放" : 'Play')}
        </button>
        <button onClick={() => { setPosition(0); setPlaying(false); }} className={styles.playbackResetBtn}>
          重置
        </button>
        <input
          type="range"
          min={0}
          max={totalEvents}
          value={position}
          onChange={(e) => { setPosition(Number(e.target.value)); setPlaying(false); }}
          className={styles.playbackSlider}
        />
      </div>
      <div className={styles.playbackList}>
        {visibleEvents.length === 0 ? (
          <div className={styles.playbackHint}>
            拖动滑块或点击播放，逐步查看运行过程。
          </div>
        ) : (
          visibleEvents.map((event) => (
            <div key={event.id} className={styles.playbackEvent}>
              <span className={styles.playbackTurn}>
                {event.turn != null ? `T${event.turn}` : ''}
              </span>
              <span className={styles.playbackType}>
                {EVENT_LABELS[event.type] ?? event.type}
              </span>
              <span className={styles.playbackBody}>
                {eventBody(event)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
