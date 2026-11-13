/**
 * Re-run-with-seed+1 epilogue bar. Shows at the bottom of SimView
 * after a run completes, offering a one-click restart of the last
 * launch config with the seed bumped by one so the outcome shifts
 * deterministically without sending the user back to Settings.
 *
 * Reads the last-launch config + per-provider key overrides through
 * {@link useLastLaunchConfig} helpers so the localStorage contract
 * lives in one place (audit F22).
 *
 * @module paracosm/cli/dashboard/components/sim/RerunPanel
 */
import { useCallback, useState } from 'react';
import { useRunStart, useScenarioContext, useScenarioReady } from '../../App';
import {
  buildNextRunConfig,
  isLastLaunchFor,
  readKeyOverrides,
  readLastLaunchConfig,
  writeActiveRunActors,
  writeLastLaunchConfig,
  type PersistedActor,
} from '../../hooks/useLastLaunchConfig';
import { resolveSetupRedirectHref } from '../../tab-routing';
import { emitLaunched } from '../../scenario-sync';
import styles from './RerunPanel.module.scss';

interface RerunPanelProps {
  /** Gate: only visible when the sim has completed. Defaults to true
   *  so consumers can conditionally render the whole component. */
  enabled?: boolean;
}

export function RerunPanel({ enabled = true }: RerunPanelProps) {
  const [launching, setLaunching] = useState(false);
  const scenario = useScenarioContext();
  const scenarioReady = useScenarioReady();
  const runStart = useRunStart();

  const handleClick = useCallback(async () => {
    if (launching || !scenarioReady) return;
    setLaunching(true);
    try {
      const prev = readLastLaunchConfig(window.localStorage);
      if (!prev || !isLastLaunchFor(prev, scenario.id)) {
        alert(`未找到上次启动配置： ${scenario.labels.name}。请先从设置页运行一次。`);
        return;
      }
      const overrides = readKeyOverrides(window.localStorage);
      const next = buildNextRunConfig(prev, overrides);
      const res = await fetch('/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Tier 2 Spec 2B: dashboard UI runs always capture snapshots
        // so forking from any past turn is available after the run.
        body: JSON.stringify({ ...next, captureSnapshots: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        redirect?: string;
        error?: string;
        visitorId?: string;
      };
      if (res.status === 429) {
        alert(data.error || "已达到演示限额，请在设置中填写自己的 API 密钥。");
        return;
      }
      if (!res.ok) {
        // Non-429 4xx/5xx — surface the server's error or a generic one
        // so the user isn't left with a dead button click.
        alert(data.error || `重新运行失败，服务器响应 HTTP ${res.status}.`);
        return;
      }
      if (data.redirect) {
        emitLaunched(window, data.visitorId);
        // The server took the run: it replaces the Digital Twin views.
        runStart();
        // Persist the new seed so a subsequent Re-run bumps from THIS
        // run's seed, not the original.
        writeLastLaunchConfig(window.localStorage, next);
        // Persist the actors this re-run is launching so the SIM
        // header shows names during the SSE connect-and-replay window.
        // The Settings form (and the Quickstart paths) all write the
        // same key when launching; this keeps the rerun-from-epilogue
        // path on the same contract.
        const actors = Array.isArray(next.actors) ? (next.actors as PersistedActor[]) : null;
        if (actors && actors.length > 0) {
          writeActiveRunActors(
            window.localStorage,
            actors,
            typeof next.scenarioId === 'string' ? next.scenarioId : undefined,
          );
        }
        // Same bug Quickstart had: a bare /sim from /setup falls
        // through to the URL parser's default ('quickstart'), so the
        // user lands on the form they came from instead of the live
        // Sim tab. resolveSetupRedirectHref forces ?tab=sim.
        window.location.href = resolveSetupRedirectHref(window.location.href, data.redirect);
      } else {
        alert('Re-run failed: server did not return a redirect. Check the server logs.');
      }
    } catch (err) {
      alert(`Re-run failed: ${err}`);
    } finally {
      setLaunching(false);
    }
  }, [launching, scenarioReady, scenario.id, scenario.labels.name, runStart]);

  if (!enabled) return null;

  return (
    <div className={styles.panel}>
      <span className={styles.label}>重新运行</span>
      <span className={styles.copy}>
        使用相同决策者和场景重新运行，随机种子增加 1。
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={handleClick}
        disabled={launching || !scenarioReady}
      >
        {launching ? "正在启动…" : scenarioReady ? "随机种子加 1 后重新运行 ›" : "正在加载场景…"}
      </button>
    </div>
  );
}
