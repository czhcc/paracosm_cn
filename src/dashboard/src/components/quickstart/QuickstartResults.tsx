/**
 * Three-column Quickstart result grid. Each card: actor name /
 * archetype / HEXACO bars / fingerprint / median deltas / Download +
 * Share + Fork-at-N + Swap controls.
 *
 * @module paracosm/dashboard/quickstart/QuickstartResults
 */
import { useState, useMemo } from 'react';
import { useBranchesContext } from '../branches/BranchesContext';
import { useDashboardNavigation } from '../../App';
import { useScenarioLabels } from '../../hooks/useScenarioLabels';
import {
  computeMedianDeltas,
  buildQuickstartShareUrl,
  downloadArtifactJson,
} from './QuickstartView.helpers';
import { formatDelta } from '../branches/BranchesTab.helpers';
import { ActorPresetPicker } from './ActorPresetPicker';
import type { RunArtifact } from '../../../../engine/schema/index.js';
import type { ActorConfig } from '../../../../engine/types.js';
import type { LeaderPreset } from '../../../../engine/presets/index.js';
import styles from './QuickstartResults.module.scss';

export interface QuickstartResultsProps {
  actors: ActorConfig[];
  artifacts: RunArtifact[];
  sessionId?: string;
  onSwap: (actorIndex: number, preset: LeaderPreset) => void;
}

const HEXACO_TRAITS: Array<keyof NonNullable<ActorConfig['hexaco']>> = [
  'openness', 'conscientiousness', 'extraversion',
  'agreeableness', 'emotionality', 'honestyHumility',
];

export function QuickstartResults({ actors, artifacts, sessionId, onSwap }: QuickstartResultsProps) {
  const { dispatch } = useBranchesContext();
  const navigate = useDashboardNavigation();
  const labels = useScenarioLabels();
  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null);
  const [copiedForIndex, setCopiedForIndex] = useState<number | null>(null);

  const handleFork = (i: number) => {
    dispatch({ type: 'SET_PARENT', artifact: artifacts[i] });
    // Branches is a sub-tab inside Studio after the merge. Land on
    // Studio; the user clicks Branches in Studio's sub-nav. Future
    // polish: thread the sub-tab through so this lands directly on
    // Branches without the manual click.
    navigate('studio');
  };

  const handleShare = async (i: number) => {
    if (!sessionId) return;
    const url = buildQuickstartShareUrl(window.location.origin, sessionId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedForIndex(i);
      setTimeout(() => setCopiedForIndex(null), 1500);
    } catch {
      // ignore clipboard errors (secure-context requirement etc.)
    }
  };

  const handleDownload = (i: number) => {
    const artifact = artifacts[i];
    const a = actors[i] ?? {};
    const archetype = typeof a.archetype === 'string' ? a.archetype : '';
    const name = typeof a.name === 'string' ? a.name : '';
    const slug =
      archetype.toLowerCase().replace(/\s+/g, '-') ||
      name.toLowerCase().replace(/\s+/g, '-') ||
      `actor-${i}`;
    downloadArtifactJson(artifact, `paracosm-quickstart-${slug}.json`);
  };

  // Run-wide aggregate stats surfaced as a small summary strip above
  // the side-by-side actor cards. Makes the result region show the
  // simulation's depth — tools forged in the AgentOS sandbox, citations
  // pulled by the deep-research grounding pass, total turns, total LLM
  // spend — at a glance, instead of forcing the viewer to dig into each
  // actor's detail to count.
  const summary = useMemo(() => {
    const totalTools = artifacts.reduce(
      (n, a) => n + (a?.forgedTools?.length ?? 0),
      0,
    );
    const totalCitations = artifacts.reduce(
      (n, a) => n + (a?.citations?.length ?? 0),
      0,
    );
    const totalDecisions = artifacts.reduce(
      (n, a) => n + (a?.decisions?.length ?? 0),
      0,
    );
    const totalTurns = artifacts.reduce(
      (n, a) => n + (a?.trajectory?.timepoints?.length ?? 0),
      0,
    );
    const totalCostUSD = artifacts.reduce(
      (n, a) => n + (a?.cost?.totalUSD ?? 0),
      0,
    );
    return { totalTools, totalCitations, totalDecisions, totalTurns, totalCostUSD };
  }, [artifacts]);

  return (
    <div className={styles.results} role="region" aria-label="快速开始结果">
      <div className={styles.runSummary} role="region" aria-label="运行总结">
        <div className={styles.summaryStat} title="生成决策者前，通过 Serper 和 Tavily 检索并加入场景的网络来源，为仿真提供现实资料依据。">
          <span className={styles.summaryNum}>{summary.totalCitations}</span>
          <span className={styles.summaryLabel}>条引用 · 网络研究</span>
        </div>
        <div className={styles.summaryStat} title="当部门需要现有代码未提供的计算时，AgentOS 在 node:vm 沙箱中动态创建工具。工具须通过安全性与正确性审查后才能参与决策。">
          <span className={styles.summaryNum}>{summary.totalTools}</span>
          <span className={styles.summaryLabel}>个生成工具 · AgentOS 沙箱</span>
        </div>
        <div className={styles.summaryStat} title="各决策者的决策次数，每次均经过提议、审查与执行流程。">
          <span className={styles.summaryNum}>{summary.totalDecisions}</span>
          <span className={styles.summaryLabel}>次指挥官决策</span>
        </div>
        <div className={styles.summaryStat} title="所有并行决策者的仿真回合总数。每回合包含部门分析、决策、内核推进与成员反应。">
          <span className={styles.summaryNum}>{summary.totalTurns}</span>
          <span className={styles.summaryLabel}>个仿真回合</span>
        </div>
        {summary.totalCostUSD > 0 && (
          <div className={styles.summaryStat} title="所有决策者累计模型调用费用，具体模型以当前运行配置为准。">
            <span className={styles.summaryNum}>${summary.totalCostUSD.toFixed(2)}</span>
            <span className={styles.summaryLabel}>模型费用</span>
          </div>
        )}
      </div>
      <div className={styles.grid}>
        {actors.map((actor, i) => {
          const artifact = artifacts[i];
          // Defensive: skip cards whose artifact dropped out of the
          // trio (e.g., a mid-run error that cleared one actor's
          // result). Downstream helpers assume artifact is defined.
          if (!artifact) return null;
          return (
            <ActorResultCard
              key={i}
              actor={actor}
              artifact={artifact}
              peers={artifacts.filter((a, j) => j !== i && !!a)}
              timeLabel={labels.time}
              timeLabelCap={labels.Time}
              copiedHere={copiedForIndex === i}
              shareEnabled={!!sessionId}
              onDownload={() => handleDownload(i)}
              onShare={() => handleShare(i)}
              onFork={() => handleFork(i)}
              onRequestSwap={() => setSwapTargetIndex(i)}
            />
          );
        })}
      </div>
      {swapTargetIndex !== null && (
        <ActorPresetPicker
          onSelect={preset => {
            onSwap(swapTargetIndex, preset);
            setSwapTargetIndex(null);
          }}
          onClose={() => setSwapTargetIndex(null)}
        />
      )}
    </div>
  );
}

interface ActorResultCardProps {
  actor: ActorConfig;
  artifact: RunArtifact;
  peers: RunArtifact[];
  timeLabel: string;
  timeLabelCap: string;
  copiedHere: boolean;
  shareEnabled: boolean;
  onDownload: () => void;
  onShare: () => void;
  onFork: () => void;
  onRequestSwap: () => void;
}

function ActorResultCard({
  actor, artifact, peers, timeLabel, timeLabelCap,
  copiedHere, shareEnabled, onDownload, onShare, onFork, onRequestSwap,
}: ActorResultCardProps) {
  const deltas = useMemo(() => computeMedianDeltas(artifact, peers), [artifact, peers]);
  const turnsCompleted = artifact.trajectory?.timepoints?.length ?? 0;
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <h4 className={styles.actorName}>{actor.name}</h4>
        <span className={styles.archetype}>{actor.archetype}</span>
        <button
          type="button"
          className={styles.swap}
          onClick={onRequestSwap}
          aria-label={`Swap ${actor.name}`}
        >
          更换
        </button>
      </header>
      <div className={styles.hexaco}>
        {HEXACO_TRAITS.map(trait => (
          <div key={trait} className={styles.trait}>
            <span className={styles.traitLabel}>{trait.slice(0, 4).toUpperCase()}</span>
            <div className={styles.traitBarOuter}>
              <div
                className={styles.traitBarInner}
                style={{ width: `${Math.round((actor.hexaco?.[trait] ?? 0.5) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.fingerprint}>
        <span>FP</span>
        <code>
          {artifact.fingerprint
            ? Object.values(artifact.fingerprint).slice(0, 3).join(' / ')
            : 'n/a'}
        </code>
      </div>
      {deltas.length > 0 && (
        <ul className={styles.deltas} aria-label="与组内中位数的差值">
          {deltas.slice(0, 4).map(d => (
            <li
              key={`${d.bag}.${d.key}`}
              className={`${styles.delta} ${styles[`direction_${d.direction}`]}`}
            >
              {formatDelta(d)}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button type="button" onClick={onDownload}>下载 JSON</button>
        <button
          type="button"
          onClick={onShare}
          disabled={!shareEnabled}
          title="复制可直接打开此次运行可视化页面的链接"
        >
          {copiedHere ? 'Copied!' : "复制可视化分享链接"}
        </button>
        <button
          type="button"
          onClick={onFork}
          disabled={turnsCompleted === 0}
          className={styles.forkButton}
          title={turnsCompleted === 0 ? "尚无已完成回合" : `设为分支起点并打开分支页。 ${turnsCompleted} ${turnsCompleted === 1 ? timeLabel : `${timeLabel}s`} available.`}
        >
          在分支中继续运行 →
        </button>
      </div>
      <div className={styles.forkHint}>
        {turnsCompleted > 0
          ? `${turnsCompleted} ${timeLabelCap}${turnsCompleted === 1 ? '' : 's'} available for forking`
          : ''}
      </div>
    </article>
  );
}
