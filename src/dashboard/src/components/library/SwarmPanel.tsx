import { displayLabel } from '../../template-localization';
import * as React from 'react';
import { useMemo, useState, type CSSProperties } from 'react';
import styles from './SwarmPanel.module.scss';
import {
  aliveCount,
  deathCount,
  departmentHeadcount,
  moodHistogram,
  swarmByDepartment,
} from '../../../../runtime/swarm/index.js';
import type { RunArtifact, SwarmAgent } from '../../../../engine/schema/index.js';

interface SwarmPanelProps {
  artifact: RunArtifact;
}

/**
 * Inline view of `RunArtifact.finalSwarm` shown inside the run-detail
 * drawer. Renders as a no-op when the artifact does not carry a swarm
 * snapshot (batch-point modes, legacy artifacts predating finalSwarm).
 *
 * Pulls every projection from the public `paracosm/swarm` helpers so
 * the dashboard view and external SDK consumers share one source of
 * truth for what "the swarm" is.
 */
export function SwarmPanel({ artifact }: SwarmPanelProps): JSX.Element | null {
  const swarm = artifact.finalSwarm;
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    if (!swarm) return null;
    return {
      alive: aliveCount(swarm),
      dead: deathCount(swarm),
      moodHist: moodHistogram(swarm),
      deptHeadcount: departmentHeadcount(swarm),
      byDept: swarmByDepartment(artifact),
    };
  }, [swarm, artifact]);

  if (!swarm || !stats) return null;

  const moodEntries = Object.entries(stats.moodHist).sort((a, b) => b[1] - a[1]);
  const deptEntries = Object.entries(stats.deptHeadcount).sort((a, b) => b[1] - a[1]);
  const moodTotal = moodEntries.reduce((acc, [, n]) => acc + n, 0);

  const agents = swarm.agents;
  const visibleAgents = showAll ? agents : agents.slice(0, 12);

  return (
    <section className={styles.panel} aria-label="群体快照">
      <header className={styles.header}>
        <h3 className={styles.title}>智能体群体</h3>
        <span className={styles.kicker}>T{swarm.turn} · {swarm.population} 存活</span>
      </header>

      <dl className={styles.statRow}>
        <div className={styles.stat}>
          <dt>存活</dt>
          <dd>{stats.alive}</dd>
        </div>
        <div className={styles.stat}>
          <dt>死亡</dt>
          <dd>{stats.dead}</dd>
        </div>
        {typeof swarm.morale === 'number' && (
          <div className={styles.stat}>
            <dt>士气</dt>
            <dd>{Math.round(swarm.morale * 100)}%</dd>
          </div>
        )}
        {typeof swarm.births === 'number' && (
          <div className={styles.stat}>
            <dt>本回合出生</dt>
            <dd>{swarm.births}</dd>
          </div>
        )}
        {typeof swarm.deaths === 'number' && (
          <div className={styles.stat}>
            <dt>本回合死亡</dt>
            <dd>{swarm.deaths}</dd>
          </div>
        )}
      </dl>

      {moodEntries.length > 0 && (
        <div className={styles.histBlock}>
          <h4 className={styles.subhead}>情绪分布</h4>
          <ul className={styles.histList}>
            {moodEntries.map(([mood, count]) => (
              <li key={mood} className={styles.histRow}>
                <span className={styles.histLabel}>{displayLabel(mood)}</span>
                <div
                  className={styles.histBar}
                  style={{ '--bar-pct': `${(count / Math.max(1, moodTotal)) * 100}%` } as CSSProperties}
                  aria-hidden="true"
                />
                <span className={styles.histCount}>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deptEntries.length > 0 && (
        <div className={styles.histBlock}>
          <h4 className={styles.subhead}>部门人数</h4>
          <ul className={styles.deptList}>
            {deptEntries.map(([dept, count]) => {
              const total = stats.byDept[dept]?.length ?? count;
              return (
                <li key={dept} className={styles.deptRow}>
                  <span className={styles.deptLabel}>{displayLabel(dept)}</span>
                  <span className={styles.deptCount}>
                    {count}/{total} 存活
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={styles.histBlock}>
        <h4 className={styles.subhead}>
          成员名单 <span className={styles.subheadMeta}>· {agents.length} 合计</span>
        </h4>
        <ul className={styles.roster}>
          {visibleAgents.map(agent => (
            <RosterRow key={agent.agentId} agent={agent} />
          ))}
        </ul>
        {agents.length > 12 && (
          <button
            type="button"
            className={styles.showAllBtn}
            onClick={() => setShowAll(s => !s)}
            aria-expanded={showAll}
          >
            {showAll ? '显示前 12 位' : `显示全部 ${agents.length} 位`}
          </button>
        )}
      </div>
    </section>
  );
}

function RosterRow({ agent }: { agent: SwarmAgent }): JSX.Element {
  return (
    <li
      className={[styles.rosterRow, agent.alive ? '' : styles.rosterDead].filter(Boolean).join(' ')}
    >
      <span className={styles.rosterName}>{agent.name}</span>
      <span className={styles.rosterMeta}>
        {displayLabel(agent.department)}
        {agent.role ? ` · ${agent.role}` : ''}
      </span>
      {agent.mood && agent.alive && (
        <span className={styles.rosterMood}>{displayLabel(agent.mood)}</span>
      )}
      {!agent.alive && <span className={styles.rosterMood}>已故</span>}
    </li>
  );
}
