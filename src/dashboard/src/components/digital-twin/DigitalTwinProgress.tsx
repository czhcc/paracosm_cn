/**
 * DigitalTwinProgress — live-streaming view rendered while a
 * simulate-intervention call is in flight. Echoes the prefilled
 * subject + intervention up top, shows turn / cost / forge /
 * citation counters as they tick, and renders the streaming SSE
 * event log below.
 *
 * Activates when App.tsx receives `interventionRunning` (the user
 * just clicked Run) and there is no `interventionArtifact` yet.
 * When the artifact lands, SimView swaps to DigitalTwinPanel.
 *
 * @module paracosm/dashboard/digital-twin/DigitalTwinProgress
 */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../hooks/useGameState';
import styles from './DigitalTwinProgress.module.scss';

export interface DigitalTwinProgressProps {
  state: GameState;
  subject: { id: string; name: string; profile?: Record<string, unknown> };
  intervention: { id: string; name: string; description: string; duration?: { value: number; unit: string } };
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

function formatNumber(value: number): string {
  if (Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) < 1) return value.toFixed(3);
  return value.toFixed(2);
}

function eventBody(event: { type: string; data?: Record<string, unknown> }): string {
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

export function DigitalTwinProgress({ state, subject, intervention }: DigitalTwinProgressProps) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  // Pull the actor side state for the (single) leader. Digital-twin runs
  // emit events under one leader name; gameState picks that up the
  // moment the first SSE event arrives.
  const leaderId = state.actorIds[0];
  const sideState = leaderId ? state.actors[leaderId] : null;

  const events = sideState?.events ?? [];
  const turn = state.turn;
  const maxTurns = state.maxTurns || 1;
  const progressPct = Math.min(100, Math.max(0, (turn / maxTurns) * 100));
  const cost = state.cost?.totalCostUSD ?? 0;
  const llmCalls = state.cost?.llmCalls ?? 0;
  const tools = sideState?.tools ?? 0;
  const citations = sideState?.citations ?? 0;

  // Auto-scroll the event log to the bottom on new events when the user
  // hasn't manually scrolled away. Same pin-to-bottom pattern the
  // standard LeaderColumn uses.
  useEffect(() => {
    if (!pinnedRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const profileEntries = subject.profile ? Object.entries(subject.profile).slice(0, 4) : [];

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>
          <span className={styles.spinner} aria-hidden="true" />
          数字孪生 · 运行中
        </h2>
        <span className={styles.timer}>
          {elapsedSec}秒已用时 · 实时接收 · {maxTurns} {maxTurns === 1 ? 'turn' : 'turns'} 次模型决策
        </span>
      </div>

      <div className={styles.cardsRow}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>对象</span>
            <span className={styles.cardId}>{subject.id}</span>
          </div>
          <div className={styles.cardName}>{subject.name}</div>
          {profileEntries.length > 0 && (
            <div className={styles.kvList}>
              {profileEntries.map(([key, value]) => (
                <div key={key} className={styles.kv}>
                  <span>{key}</span>
                  <span>{typeof value === 'number' ? formatNumber(value) : String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>干预措施</span>
            <span className={styles.cardId}>{intervention.id}</span>
          </div>
          <div className={styles.cardName}>{intervention.name}</div>
          <p className={styles.description}>{intervention.description}</p>
          {intervention.duration && (
            <div className={styles.kvList}>
              <div className={styles.kv}>
                <span>持续时间</span>
                <span>{intervention.duration.value} {intervention.duration.unit}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>回合</span>
          <span className={styles.statValue}>{turn} / {maxTurns}</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>模型调用</span>
          <span className={styles.statValue}>{llmCalls}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>费用</span>
          <span className={styles.statValue}>${cost.toFixed(4)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>生成工具</span>
          <span className={styles.statValue}>{tools}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>引用</span>
          <span className={styles.statValue}>{citations}</span>
        </div>
      </div>

      <div className={styles.eventLog}>
        <div className={styles.eventLogHeader}>
          <span className={styles.eventLogTitle}>实时事件日志</span>
          <span className={styles.timer}>{events.length} 个事件</span>
        </div>
        <div ref={scrollRef} onScroll={onScroll} className={styles.eventLogScroll}>
          {events.length === 0 ? (
            <div className={styles.eventEmpty}>等待服务器的首个事件…</div>
          ) : (
            events.map((event) => (
              <div key={event.id} className={styles.eventRow}>
                <span className={styles.eventTurn}>
                  {event.turn != null ? `T${event.turn}` : ''}
                </span>
                <span className={styles.eventType}>
                  {EVENT_LABELS[event.type] ?? event.type}
                </span>
                <span className={styles.eventBody}>{eventBody(event)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
