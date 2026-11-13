import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { GameState, LeaderInfo } from '../../hooks/useGameState';
import { useScenarioContext, useScenarioReady } from '../../App';
import { leaderUnit } from '../../hooks/useScenarioLabels.helpers';
import { readActiveRunActors } from '../../hooks/useLastLaunchConfig';
import { DigitalTwinPanel } from '../digital-twin/DigitalTwinPanel';
import { DigitalTwinProgress } from '../digital-twin/DigitalTwinProgress';
import type { RunArtifact } from '../../../../engine/schema/index.js';
import { useCitationContext } from '../../hooks/useCitationRegistry';
import { useToolContext } from '../../hooks/useToolRegistry';
import { ActorBar } from '../layout/ActorBar';
import { StatsBar } from '../layout/StatsBar';
import { Timeline } from './Timeline';
import { TurnGrid } from './TurnGrid';
import { MultiActorTurnGrid } from './MultiActorTurnGrid';
import { SimFooterBar } from './SimFooterBar';
import { RerunPanel } from './RerunPanel';
import { VerdictPanel } from './VerdictCard';
import { LoadPriorRunsCTA } from '../settings/LoadPriorRunsCTA';
import { SimLayoutToggle, type SimLayout } from './SimLayoutToggle';
import { ConstellationView } from './ConstellationView';
import { ActorTable } from './ActorTable';
import { DistributionPanel } from './DistributionPanel';
import { ActorDrillInModal } from './ActorDrillInModal';
import styles from './SimView.module.scss';

interface SimViewProps {
  state: GameState;
  sseStatus?: string;
  onRun?: () => void;
  /** Optional — opens the guided tour (demo replay) from the empty
   *  state CTA. Without this, first-time users land on a dense
   *  empty page with no affordance to learn what the dashboard
   *  does before spending LLM credits on their own run. */
  onTour?: () => void;
  verdict?: Record<string, unknown> | null;
  /** App-level launching flag — survives tab navigation so users can
   *  switch to viz/chat/etc. and come back to a still-loading sim. */
  launching?: boolean;
  /** Digital-twin artifact returned by /api/quickstart/simulate-intervention
   *  (or a loaded JSON file with subject + intervention). When set,
   *  SimView replaces the parallel-actor layout with DigitalTwinPanel
   *  rendered against this single artifact. */
  interventionArtifact?: RunArtifact | null;
  /** While set (and no artifact yet), SimView renders DigitalTwinProgress
   *  with subject + intervention echo plus the live SSE event log. The
   *  payload carries just the prefilled subject + intervention shapes
   *  the dashboard knew about when the user clicked Run; once the
   *  artifact lands, App.tsx clears this field and DigitalTwinPanel
   *  renders the full result. */
  interventionRunning?: {
    subject: { id: string; name: string; profile?: Record<string, unknown> };
    intervention: { id: string; name: string; description: string; duration?: { value: number; unit: string } };
  } | null;
  /** The state the Digital Twin views read: the run this page started,
   *  whichever scenario it is in. Falls back to `state`. */
  interventionState?: GameState;
  /** Clears the intervention artifact so SimView returns to the standard
   *  parallel-actor layout. */
  onInterventionDismiss?: () => void;
  /** Pins the layout to a fixed value, overriding the auto-default and
   *  any previous user pick. The GuidedTour passes 'side-by-side' so its
   *  highlight selectors (`.leaders-row`, `.sim-columns`,
   *  `[aria-label="Colony statistics"]`) always exist — without this,
   *  a viewer who had previously run a 3+ actor sim would see the tour
   *  attempt to highlight nodes that the constellation layout never
   *  renders, and the tour would silently no-op past Sim. */
  forceLayout?: SimLayout;
}

// LeaderColumn (the per-leader scrolling-column helper) was removed
// when SimView switched to TurnGrid for the side-by-side layout. The
// turn-aligned grid groups events by turn across both leaders so the
// per-leader column is no longer a meaningful unit.

/**
 * Compact introduction bar. The old full-paragraph version took three
 * text lines and shoved the actual sim columns below the fold on short
 * viewports. Now collapses to a single short headline with a show/hide
 * toggle; expanded body is only rendered when the user asks for it.
 */
function IntroBar({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      role="region"
      aria-label="仿真阅读说明"
      className={styles.introBar}
    >
      <div className={styles.introBody}>
        <b className={styles.introHeading}>如何阅读：</b>{' '}
        {expanded ? (
          <>
            多位不同 HEXACO 人格的指挥官使用相同随机种子并行运行。每回合各部门并行分析，可在 V8 沙箱中生成计算工具或复用已有工具，随后指挥官作出决策，世界逐渐分叉。点击可视化中的成员查看详情，点击工具卡片检查生成代码。
          </>
        ) : (
          <>
            多位指挥官、相同随机种子、不同演变历史。HEXACO 人格影响模型决策。{' '}
            <button
              onClick={() => setExpanded(true)}
              className={styles.introExpandButton}
            >
              更多
            </button>
          </>
        )}
      </div>
      <button
        onClick={onDismiss}
        className={styles.introDismissButton}
        aria-label="关闭介绍"
      >
        知道了
      </button>
    </div>
  );
}

export function SimView({ state, sseStatus, onRun, onTour, verdict, launching: launchingProp, interventionArtifact, interventionRunning, interventionState = state, onInterventionDismiss, forceLayout }: SimViewProps) {
  const scenario = useScenarioContext();
  const scenarioReady = useScenarioReady();
  // Digital-twin short-circuit: when the dashboard receives an artifact
  // produced by simulateIntervention (subject + intervention populated),
  // we replace the entire SIM body with DigitalTwinPanel. Single-actor
  // intervention runs do not slot into the parallel-actor layout, so
  // mixing the two would just confuse the read.
  if (interventionArtifact) {
    return (
      <div className={styles.root}>
        <div className={styles.scrollableBody}>
          <DigitalTwinPanel artifact={interventionArtifact} state={interventionState} onDismiss={onInterventionDismiss} />
        </div>
      </div>
    );
  }
  // Live phase: server is still streaming SSE events for this run. We
  // know the prefilled subject + intervention from the click that
  // initiated it, so we can render their cards immediately and let the
  // event log + counters fill in as broadcast() pushes events through.
  if (interventionRunning) {
    return (
      <div className={styles.root}>
        <div className={styles.scrollableBody}>
          <DigitalTwinProgress state={interventionState} subject={interventionRunning.subject} intervention={interventionRunning.intervention} />
        </div>
      </div>
    );
  }
  const citationRegistry = useCitationContext();
  const toolRegistry = useToolContext();
  // Local fallback only used when no parent-controlled launching flag is
  // passed (legacy callers). The App now owns this state and threads it
  // through so it survives tab navigation.
  const [localLaunching, setLocalLaunching] = useState(false);
  const launching = launchingProp ?? localLaunching;

  // Layout state. Default to side-by-side because the N-actor surface
  // (`MultiActorTurnGrid`) renders feature parity with the 2-actor
  // TurnGrid via a horizontally-scrolling track of per-actor cells.
  // For large cohorts (50+ actors) the side-by-side track turns into
  // a 50+ column DOM that the browser struggles to keep at 60fps —
  // we soft-default such runs to constellation, which scales much
  // better. The user can still flip back via the layout toggle, and
  // userPickedLayoutRef pins their explicit choice across SSE updates
  // so the auto-default never overrides them mid-run.
  const SIDE_BY_SIDE_AUTO_LIMIT = 50;
  const [layoutState, setLayoutState] = useState<SimLayout>('side-by-side');
  const userPickedLayoutRef = useRef(false);
  const setLayoutWithOverride = useCallback((next: SimLayout) => {
    userPickedLayoutRef.current = true;
    setLayoutState(next);
  }, []);
  // Auto-default to constellation once a large cohort lands. Only
  // applies if the user hasn't explicitly chosen a layout this session.
  useEffect(() => {
    if (userPickedLayoutRef.current) return;
    if (state.actorIds.length > SIDE_BY_SIDE_AUTO_LIMIT && layoutState !== 'constellation') {
      setLayoutState('constellation');
    }
  }, [state.actorIds.length, layoutState]);
  const layout: SimLayout = forceLayout ?? layoutState;

  const [drillInActor, setDrillInActor] = useState<string | null>(null);
  const drillInIndex = drillInActor ? state.actorIds.indexOf(drillInActor) : 0;

  const firstId = state.actorIds[0];
  const secondId = state.actorIds[1];
  const sideA = firstId ? state.actors[firstId] : null;
  const sideB = secondId ? state.actors[secondId] : null;
  const hasEvents = Object.values(state.actors).some(s => s.events.length > 0);
  const showLoading = state.isRunning && !hasEvents;

  // Clear local launching state once events start arriving or sim is running
  useEffect(() => {
    if ((hasEvents || state.isRunning) && launchingProp === undefined) setLocalLaunching(false);
  }, [hasEvents, state.isRunning, launchingProp]);

  const handleRun = useCallback(() => {
    if (launchingProp === undefined) setLocalLaunching(true);
    onRun?.();
  }, [onRun, launchingProp]);

  // Fallback leader info for the live header. Two-step chain:
  //   1. Scenario presets (Mars Genesis / Lunar / etc. ship leaders).
  //   2. The actors of the most recently launched run, persisted to
  //      localStorage at /setup time so compiled scenarios (which
  //      ship no presets) still surface names through the SSE
  //      connect-and-replay window.
  // ActorBar's `leader={sideA?.leader || presetLeaderA}` chain still
  // wins on the SSE-populated value once status:parallel lands.
  const defaultPreset = scenario.presets.find(p => p.id === 'default');
  const presetLeaders = defaultPreset?.leaders ?? defaultPreset?.actors;
  const persistedActors = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return readActiveRunActors(window.localStorage);
  }, []);
  // Coerce both shapes (preset entry, persisted-actor entry) into a
  // single loose record so the `unit` / `instructions` field reads
  // don't TS-error on the structural union. Preset entries don't carry
  // `unit`; the default is named for the scenario's settlement.
  const fallbackA = (presetLeaders?.[0] ?? persistedActors?.[0]) as
    | { name?: string; archetype?: string; unit?: string; hexaco?: unknown; instructions?: string }
    | undefined;
  const fallbackB = (presetLeaders?.[1] ?? persistedActors?.[1]) as
    | { name?: string; archetype?: string; unit?: string; hexaco?: unknown; instructions?: string }
    | undefined;
  const presetLeaderA: LeaderInfo | null = fallbackA?.name
    ? { name: fallbackA.name, archetype: fallbackA.archetype ?? '', unit: fallbackA.unit ?? leaderUnit(scenario, 0), hexaco: (fallbackA.hexaco ?? {}) as LeaderInfo['hexaco'], instructions: fallbackA.instructions ?? '', quote: '' }
    : null;
  const presetLeaderB: LeaderInfo | null = fallbackB?.name
    ? { name: fallbackB.name, archetype: fallbackB.archetype ?? '', unit: fallbackB.unit ?? leaderUnit(scenario, 1), hexaco: (fallbackB.hexaco ?? {}) as LeaderInfo['hexaco'], instructions: fallbackB.instructions ?? '', quote: '' }
    : null;

  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('paracosm-intro-dismissed') !== '1';
  });

  const dismissIntro = () => {
    setShowIntro(false);
    localStorage.setItem('paracosm-intro-dismissed', '1');
  };

  // Build turn-event text for the shared stats bar
  const eventA = sideA?.event;
  const crisisText = eventA
    ? `T${eventA.turn} \u2014 ${eventA.time}: ${eventA.title}`
    : '';

  const verdictPlacementFor = useMemo(() => {
    const w = verdict && typeof verdict === 'object' ? (verdict as Record<string, unknown>).winner : null;
    return (side: 'A' | 'B'): 'winner' | 'second' | 'tie' | null => {
      if (w === 'tie') return 'tie';
      if (w === side) return 'winner';
      if (w === 'A' || w === 'B') return 'second';
      return null;
    };
  }, [verdict]);

  const progressPercent = state.maxTurns > 0
    ? Math.min(100, Math.max(0, (state.turn / state.maxTurns) * 100))
    : 0;

  const handleScrollToReplayCta = useCallback(() => {
    // Prior UX tried to programmatically click the TopBar LOAD
    // dropdown. That dropdown opens at the top of the screen while
    // the user is looking at the empty state in the middle, so the
    // click registered as "nothing happened" from the user's POV.
    //
    // Instead, scroll to the WATCH A PRIOR RUN card directly below.
    const cta = document.querySelector<HTMLElement>(
      '[data-paracosm-replay-cta="true"]',
    );
    if (!cta) return;
    cta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Flash the card border so the user's eye catches the landing
    // spot (scroll alone is easy to miss on a long empty state).
    cta.classList.add(styles.flashOn);
    window.setTimeout(() => cta.classList.remove(styles.flashOn), 1200);
  }, []);

  const handleGoToSettings = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'settings');
    window.history.replaceState({}, '', url.toString());
    window.location.reload();
  }, []);

  const columnsVisible = state.isRunning || state.isComplete || hasEvents || sseStatus === 'connected';

  return (
    <div className={styles.root}>
      {/*
        Two-pane SimView shell:
          • <div.scrollableBody> — everything that scrolls (the active
            layout's content, plus Timeline). The app shell is
            `overflow: hidden; height: 100dvh` to keep the topbar /
            tab nav pinned, so SimView creates its own scroll context
            here. Constellation mode (with DistributionPanel + ActorTable
            + Timeline below the constellation SVG) easily exceeds
            viewport height; without an internal scroll the bottom of
            the column was simply clipped and unreachable.
          • <SimFooterBar> + <RerunPanel> — sit OUTSIDE the scroll body
            as flex siblings, so the layout-toggle row and rerun
            controls stay glued to the bottom of the SIM panel
            regardless of how much content is above. Sticky positioning
            inside a flex column is fragile across browsers; siblings
            outside the scroll context are not.
      */}
      <div className={styles.scrollableBody}>
      {/* Inline verdict panel — appears at the top of the SIM body
          when the run completes and the LLM verdict is in. Persistent
          (not dismissable) so the winner + reasoning stays in place
          while the user scrolls through the run details below. The
          global VerdictBanner at the top of every tab remains the
          dismissable surface; this panel is the always-visible
          counterpart pinned to the SIM tab. */}
      {state.isComplete && verdict && (verdict as Record<string, unknown>).winner ? (
        <VerdictPanel verdict={verdict} />
      ) : null}
      {layout === 'constellation' ? (
        <>
          <ConstellationView
            state={state}
            onActorClick={(name) => setDrillInActor(name)}
          />
          {/* N-way distribution: quantile bands across all actors per
              turn (median + IQR + min-max envelope) for morale and
              population. Replaces the A-vs-B DivergenceRail story
              with "where does the variance live across the cohort." */}
          <DistributionPanel state={state} />
          {/* Sortable actor roster — the constellation is the visual
              overview, the table is the data view for ranking by
              morale, deaths, forges, or turn progress. Click a row to
              open the same drill-in modal the constellation uses. */}
          <ActorTable
            state={state}
            onActorClick={(id) => setDrillInActor(id)}
          />
        </>
      ) : state.actorIds.length >= 3 ? (
        // N-actor side-by-side: skip the standalone leaders-row that the
        // 2-actor mode renders. `MultiActorTurnGrid` (rendered below)
        // carries its own sticky compact-ActorBar header that already
        // shows every actor's name + archetype + POP + morale + event +
        // Deciding pill. Rendering both at the same time produced two
        // visually-redundant rows of leader cards stacked on top of
        // each other (user-reported regression). StatsBar still pins
        // the global crisis text + tool counts above the grid.
        <StatsBar
          actors={state.actorIds.map(id => ({ id, state: state.actors[id] }))}
          crisisText={crisisText}
          toolRegistry={toolRegistry}
        />
      ) : (
        <>
          {/* Shared leaders row. Winner/tie/second chip on each card
              surfaces the verdict even before the user scrolls down to
              the banner card. */}
          <div className={`leaders-row ${styles.leadersRow}`}>
            <ActorBar
              actorIndex={0}
              leader={sideA?.leader || presetLeaderA}
              popHistory={sideA?.popHistory || []}
              moraleHistory={sideA?.moraleHistory || []}
              verdictPlacement={verdictPlacementFor('A')}
              event={sideA?.event}
              statuses={sideA?.statuses}
              pendingDecision={sideA?.pendingDecision}
            />
            <ActorBar
              actorIndex={1}
              leader={sideB?.leader || presetLeaderB}
              popHistory={sideB?.popHistory || []}
              moraleHistory={sideB?.moraleHistory || []}
              verdictPlacement={verdictPlacementFor('B')}
              event={sideB?.event}
              statuses={sideB?.statuses}
              pendingDecision={sideB?.pendingDecision}
            />
          </div>

          <StatsBar
            actors={state.actorIds.slice(0, 2).map(id => ({ id, state: state.actors[id] }))}
            crisisText={crisisText}
            toolRegistry={toolRegistry}
          />
        </>
      )}

      {/* Slim sim-progress bar. Visible while the run is active and
          hides on completion. */}
      {state.isRunning && !state.isComplete && state.maxTurns > 0 && (
        <div className={styles.progressBar}>
          <span className={styles.progressLabel}>
            回合 {Math.max(1, state.turn)} / {state.maxTurns}
          </span>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className={styles.progressPercent}>
            {Math.round(progressPercent)}%
          </span>
        </div>
      )}

      {showIntro && (sideA?.events.length ?? 0) > 0 && <IntroBar onDismiss={dismissIntro} />}

      {/* DivergenceRail used to render here as its own full-width row.
          Per-turn divergence is already badged on each TurnRow header
          (the DiffBadge inline pill), so the dedicated rail just ate
          a row of vertical space repeating the same signal. The
          constellation layout has its own divergence story via
          DistributionPanel; the side-by-side flow now relies on the
          per-turn DiffBadges alone. */}

      {/* Loading state: connected but no events after 2s grace period.
          role="status" + aria-live polite so SR users hear the heading
          when this state mounts. Spinner is aria-hidden — purely
          decorative, the visible "Simulation starting..." text is the
          accessible signal. */}
      {showLoading && !hasEvents && !state.isComplete && state.turn === 0 && (
        <div className={styles.centerState} role="status" aria-live="polite">
          <span className={`spinner ${styles.centerStateSpinnerSmall}`} aria-hidden="true" />
          <div className={styles.centerStateHeading}>仿真即将开始…</div>
          <div className={styles.centerStateCopy}>
            事件导演正在读取状态并生成首个事件，随后各部门将进行分析和工具生成。
          </div>
        </div>
      )}

      {/* Launching state: user clicked Run, waiting for first events */}
      {launching && !hasEvents && !state.isRunning && (
        <div className={styles.centerState} role="status" aria-live="polite">
          <span className={`spinner ${styles.centerStateSpinnerLarge}`} aria-hidden="true" />
          <div className={styles.centerStateHeadingAmber}>正在启动仿真…</div>
          <div className={styles.centerStateCopy}>
            正在初始化事件导演、部门和成员人格，首个事件即将出现。
          </div>
        </div>
      )}

      {/* Connecting state: SSE not yet connected, no events, show spinner */}
      {!hasEvents && !state.isComplete && !launching && sseStatus === 'connecting' && (
        <div className={styles.centerState} role="status" aria-live="polite">
          <span className={`spinner ${styles.centerStateSpinnerSmall}`} aria-hidden="true" />
          <div className={styles.centerStateHeading}>正在连接…</div>
          <div className={styles.centerStateCopy}>
            正在从服务器加载仿真状态；若已有运行，事件即将显示。
          </div>
        </div>
      )}

      {/* Replay-aware empty state: ?replay=<id> in the URL means the user
          just clicked Load Prior Run; the cached events stream in
          shortly. Showing the generic "No simulation running" copy here
          reads as a broken load. Mirror the SwarmViz fix from 147d55055
          (instant cached-run replay + replay-aware empty state). */}
      {!state.isRunning && !state.isComplete && !hasEvents && sseStatus === 'connected' && !launching && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('replay') && (
        <div className={styles.centerState} role="status" aria-live="polite">
          <span className={`spinner ${styles.centerStateSpinnerSmall}`} aria-hidden="true" />
          <div className={styles.centerStateHeading}>正在加载回放…</div>
          <div className={styles.centerStateCopy}>
            正在接收服务器上的缓存运行，回合和事件将逐步显示。
          </div>
        </div>
      )}

      {/* Empty state: connected but no events and no sim running */}
      {!state.isRunning && !state.isComplete && !hasEvents && sseStatus === 'connected' && !launching && !(typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('replay')) && (
        <div className={styles.centerState}>
          <div className={styles.centerStateHeadingLarger}>尚未运行仿真</div>
          <div className={styles.centerStateCopyWide}>
            为决策者配置不同的 HEXACO 人格，选择场景后在“设置”中启动，也可以加载已保存的仿真。
          </div>
          <div className={styles.emptyStateActions}>
            {onRun && (
              <button
                onClick={handleRun}
                disabled={launching || !scenarioReady}
                className={styles.buttonRun}
              >
                {launching ? "正在启动…" : scenarioReady ? "运行仿真" : "正在加载场景…"}
              </button>
            )}
            <button onClick={handleScrollToReplayCta} className={styles.buttonLoad}>
              加载历史运行
            </button>
            <button onClick={handleGoToSettings} className={styles.buttonSettings}>
              设置
            </button>
          </div>
          {onTour && (
            <div className={styles.tourHint}>
              第一次使用？{' '}
              <button type="button" onClick={onTour} className={styles.tourLink}>
                开始交互导览 →
              </button>
              <span className={styles.tourAside}>（预置演示，不产生模型费用）</span>
            </div>
          )}
          {/* Surface saved-run replays right in the empty state so users
              who land on SIM without a running simulation can start
              watching a prior run with one click. */}
          <div
            data-paracosm-replay-cta="true"
            className={`${styles.replayCtaWrap} ${styles.flashCard}`}
          >
            <LoadPriorRunsCTA />
          </div>
        </div>
      )}

      {/* Turn-aligned grid. The pair-mode `TurnGrid` carries the diff
          classification (different-event / different-outcome) which is
          only meaningful for two columns, so we keep it for actorIds=2.
          For N>=3 we render `MultiActorTurnGrid`, which generalises
          the same shape (sticky compact-ActorBar header + per-turn
          rows of N cells) and adds a horizontal scroll track so every
          actor's events stay visible side-by-side. Both gate on
          `columnsVisible` so the grid doesn't render in the empty /
          launching state. Side-by-side layout only — constellation
          mode handles its own surface above. */}
      {columnsVisible && layout === 'side-by-side' && state.actorIds.length === 2 && (
        <TurnGrid state={state} />
      )}
      {columnsVisible && layout === 'side-by-side' && state.actorIds.length >= 3 && (
        <MultiActorTurnGrid state={state} />
      )}

      {/* Verdict surfaces as a global top banner (App.tsx) and inline
          on the Reports tab. */}

      {/* Timeline at bottom — gets the full vertical room now that
          References / Toolbox have moved out of the inline column flow. */}
      <Timeline state={state} />
      </div>

      {/* End-of-sim evidence bar: small pills that open References and
          Forged Toolbox in modals. Sits OUTSIDE scrollableBody so the
          layout-toggle row + reference/toolbox pills stay pinned at the
          bottom of the SIM panel even when constellation-mode content
          overflows the viewport. */}
      <SimFooterBar
        citationRegistry={citationRegistry}
        toolRegistry={toolRegistry}
        layoutToggle={
          <SimLayoutToggle
            layout={layout}
            actorCount={state.actorIds.length}
            onChange={setLayoutWithOverride}
          />
        }
      />

      {/* Re-run-with-seed+1 epilogue. Extracted to its own file in F4
          batch 2 to satisfy audit finding F8 (modular concerns). */}
      <RerunPanel enabled={state.isComplete && !state.isRunning} />

      {/* Drill-in surface for constellation / actor-table clicks. For
          5+ actor runs the dock keeps the report open while the user
          clicks around the SIM tab; for smaller runs the modal-style
          overlay matches the existing UX. Renders nothing when
          actorName is null. */}
      <ActorDrillInModal
        actorName={drillInActor}
        actorIndex={drillInIndex >= 0 ? drillInIndex : 0}
        state={state}
        onClose={() => setDrillInActor(null)}
        mode={state.actorIds.length >= 5 ? 'dock' : 'modal'}
      />
    </div>
  );
}
