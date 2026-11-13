/**
 * Onboarding guide rendered above the Studio drop zone. Explains how to
 * obtain a RunArtifact JSON for a user landing here cold, links over to
 * the Settings tab to configure a scenario, and tucks a fully-formed
 * example artifact behind an inline `<details>` so the page stays short.
 *
 * @module paracosm/dashboard/studio/StudioGuide
 */
import * as React from 'react';
import styles from './StudioTab.module.scss';

const EXAMPLE_ARTIFACT = `{
  "schemaVersion": "1.0.0",
  "artifactId": "01J2A8R0K9P3F7HXC4ZDM3WQYV",
  "scenario": {
    "id": "frontier-ai-lab",
    "name": "Frontier AI Lab",
    "departments": 4
  },
  "setup": {
    "turns": 20,
    "seed": 42,
    "startTime": "2025-04-30T09:00:00Z",
    "timePerTurn": 86400,
    "population": 18
  },
  "actor": {
    "kind": "openai",
    "model": "gpt-4o-mini"
  },
  "events": [
    {
      "turn": 1,
      "kind": "actor.action",
      "actorId": "alice",
      "summary": "Reviews Q1 budget; flags compute overrun",
      "ts": "2025-04-30T09:00:00Z"
    },
    {
      "turn": 1,
      "kind": "actor.message",
      "actorId": "bob",
      "to": ["alice"],
      "text": "Confirming the H100 cluster spend. We are 18% over plan."
    }
  ],
  "results": {
    "kpis": { "morale": 0.74, "throughput": 0.61 },
    "completed": true
  },
  "verdict": {
    "kind": "judge.verdict",
    "label": "plausible",
    "score": 0.82,
    "rationale": "Roles consistent with departmental authority; arithmetic checks out."
  }
}`;

function openSettings(event: React.MouseEvent<HTMLAnchorElement>) {
  // SPA-style navigation: update the URL search params, then fire a
  // synthetic popstate so App.tsx's existing listener swaps the active
  // tab without a full page reload. Falls back to the `<a href>` for
  // right-click "open in new tab" and no-JS environments.
  event.preventDefault();
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'settings');
  url.searchParams.delete('sub');
  window.history.replaceState({}, '', url.toString());
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function StudioGuide(): JSX.Element {
  return (
    <section className={styles.guide} aria-label="如何创建运行记录 JSON">
      <div className={styles.guideHead}>
        <h3 className={styles.guideTitle}>如何获取运行记录 JSON</h3>
        <p className={styles.guideSub}>
          工作室接收 Paracosm 的确定性 <code>RunArtifact</code> 运行记录（单次仿真生成的 JSON），支持查看、加入资料库、创建分支和对比。按以下四步即可生成。
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li>
          <strong>在“设置”中配置场景。</strong> 选择内置场景或加载自己的场景，设置回合数、随机种子、人口和每回合时间。
        </li>
        <li>
          <strong>运行仿真。</strong> 切换到“仿真”并点击“运行”。内核推进事件，模型生成对话和决策，结束后生成评判。
        </li>
        <li>
          <strong>下载运行记录。</strong> 使用仿真输出面板的“保存”按钮下载 JSON 运行记录，也可以通过命令行生成： <code>paracosm run scenarios/frontier-ai-lab.json --turns 20 --out run.json</code>.
        </li>
        <li>
          <strong>拖入下方区域。</strong> 支持单次运行记录或记录数组（如用于分支对比），最大 10&nbsp;MB。超过服务器请求上限的记录包，会按完整运行记录（包含快照）分批导入，合并为资料库中的一个记录包；单次运行记录如果超过上限则拒绝导入。请求上限默认为 5&nbsp;MiB，可通过 <code>MAX_REQUEST_BODY_BYTES</code> 调整。
        </li>
      </ol>

      <div className={styles.guideCtaRow}>
        <a
          href="?tab=settings"
          onClick={openSettings}
          className={styles.guideCta}
        >
          打开设置 →
        </a>
        <a
          href="https://github.com/framerslab/paracosm/blob/master/docs/COOKBOOK.md"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.guideCtaSecondary}
        >
          阅读使用指南
        </a>
        <a
          href="https://github.com/framerslab/paracosm/tree/master/scenarios"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.guideCtaSecondary}
        >
          浏览示例场景
        </a>
      </div>

      <details className={styles.guideExample}>
        <summary>查看运行记录示例</summary>
        <pre className={styles.guideExampleCode}>
          <code>{EXAMPLE_ARTIFACT}</code>
        </pre>
        <p className={styles.guideExampleNote}>
          完整记录包括事件日志、每位决策者的逐回合快照、关键指标和评判结果。结构符合 <code>RunArtifact</code> Zod 结构，定义位于 <code>schema/index.ts</code>；运行组为运行记录的 JSON 数组。
        </p>
      </details>
    </section>
  );
}
