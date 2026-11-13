<p align="center">
  <a href="https://paracosm.agentos.sh"><img src="assets/favicons/icon.svg" alt="Paracosm" height="64" /></a>
</p>

<h1 align="center">PARACOSM 中文版</h1>

<p align="center">
  <em>基于大语言模型的多智能体仿真引擎：从提示词构建世界，运行多角色决策，探索不同的未来分支。</em>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="https://github.com/framerslab/paracosm">原始项目</a> ·
  <a href="https://github.com/czhcc/paracosm_cn">中文项目</a> ·
  <a href="https://paracosm.agentos.sh/sim">上游在线演示</a> ·
  <a href="https://paracosm.agentos.sh/docs">API 文档</a> ·
  <a href="LICENSE">Apache-2.0</a>
</p>

<p align="center">
  <img src="assets/blog/readme/paracosm-hero.gif" alt="Paracosm 演示：输入场景描述，比较多个决策者，并从历史回合创建分支" width="720" />
</p>

## 项目来源与汉化说明

本工程代码来自 [framerslab/paracosm](https://github.com/framerslab/paracosm)，原项目由 [Frame.dev](https://frame.dev) 开发，基于 [AgentOS](https://agentos.sh/en) 构建，采用 Apache-2.0 许可证。本工程在保留原项目署名与许可证的基础上，对控制台界面、场景文本和相关模型提示词进行了简体中文汉化，并增加了自定义模型配置支持。

本工程新增两个场景：

| 场景 | 比较内容 | 主要观察指标 | 配置文件 |
| --- | --- | --- | --- |
| 双城引才：经济成长与城市吸引力 | 两座初始条件相同的虚拟城市，市长初始人格相同，分别采用直接激励与发展环境两种引才政策，推演八年 | 经济产出、城市吸引力、人才留存、生产率、住房负担和政策成本 | [city-talent-policy.json](scenarios/city-talent-policy.json) |
| 舆情应对：封堵限制与沟通疏导 | 陈宁与林清面对同一虚拟服务事故，分别采用封堵限制与沟通疏导策略，推演八日 | 公开讨论、信任、诉求解决、谣言影响、传播反弹和资源成本 | [public-opinion-response.json](scenarios/public-opinion-response.json) |

这两个场景通过独立运行比较策略效果，数值与效果表属于未经实证校准的实验假设。它们适合探索假设、决策路径和潜在副作用，不能直接作为现实预测或政策优劣的实证结论。

## Paracosm 是什么

Paracosm 将 JSON 场景草稿、提示词或文档提取内容编译为可运行的多智能体世界。带有 HEXACO 人格特征的决策者逐回合作出选择，确定性内核负责状态、时间、随机数与约束，运行过程记录为可复现、可创建分支的 `RunArtifact`。

内核的确定性并不意味着重新调用大模型会生成完全相同的文本。事件导演会读取决策者的人格和累计状态，因此即使使用相同初始场景，不同决策者也可能从第一回合开始经历不同事件。需要固定外部冲击的策略实验，应在场景中明确安排共同事件；本工程新增的两个场景已预设默认八回合的共同事件。

<p align="center">
  <img src="assets/diagrams/paracosm-flow.svg" alt="系统流程：场景来源、编译器、确定性内核、运行时编排、多智能体群与可回放的运行产物" width="100%" />
</p>

## 从历史回合创建分支

可创建分支的世界需要能够恢复的确定性状态、读取状态作出推理的大模型，以及明确的状态契约。Paracosm 使用 JSON 快照保存状态，从指定回合继续运行时复用此前的过程。

```typescript
import { WorldModel } from 'paracosm';
import worldJson from './my-world.json' with { type: 'json' };

const wm = await WorldModel.fromJson(worldJson);

// 主线运行：每回合保存快照
const trunk = await wm.simulate(visionaryActor, {
  maxTurns: 6, seed: 42, captureSnapshots: true,
});

// 从第 3 回合创建分支，更换决策者；此前的回合不重新运行
const branch = await (await wm.forkFromArtifact(trunk, 3)).simulate(
  pragmatistActor,
  { maxTurns: 6, seed: 42 },
);

console.log(trunk.metadata.runId);
console.log(branch.metadata.forkedFrom); // { parentRunId, atTurn: 3 }
console.log(trunk.fingerprint, branch.fingerprint);
```

`captureSnapshots` 默认为 `false`。控制台运行会开启快照；“报告”页在已完成且非最后一回合的位置提供分支按钮。创建分支时，控制台通过 `/setup` 提交父运行产物，并在分支视图中展示指标变化。分支使用父运行的场景；导入其他场景的记录后，需要先切换到对应场景。

### 回放与审计

```typescript
const replay = await wm.replay(storedArtifact);
console.log(replay.matches);    // 各次回合间推进是否复现已保存的状态
console.log(replay.divergence); // 不一致时，第一个差异所在的路径
```

开启快照后，运行循环会保存回合间推进的起始状态和推进后状态。回放恢复起始状态，重新执行年龄、辐射剂量、死亡、出生、食物和士气等推进，再与记录比较。回放不调用模型，也不重新应用当回合的决策。缺少所需快照的旧记录会抛出 `WorldModelReplayError`，表示无法验证，而非简单判定一致或不一致。详见 [FAQ](docs/FAQ.md#what-does-replay-do)。

## 人格与决策差异

相同初始状态下，改变决策者的人格可以产生不同轨迹。HEXACO 包含开放性、尽责性、外向性、宜人性、情绪性和诚实谦逊六个维度；大模型各阶段会读取这些特征。

同一个人、同一种死因在两条轨迹中使用相同的随机依据，世界状态改变其生存机会。火星创世纪使用每人每种死因贯穿一生的随机判据：如果某条轨迹逐年提供的生存机会都更好，共同死亡的个体不会在该轨迹上更早死亡。

角色可以是殖民地指挥官、船长、CEO、市长、委员会、派系领导者或自主协调器。也可以保持初始人格一致，通过角色指令比较不同政策。

```typescript
import { compileScenario, WorldModel } from 'paracosm';
import worldJson from './my-world.json' with { type: 'json' };

const scenario = await compileScenario(worldJson, {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
});
const wm = WorldModel.fromScenario(scenario);

const reyes = {
  name: '雷耶斯船长', archetype: '务实派', unit: '阿尔法站',
  hexaco: { openness: 0.4, conscientiousness: 0.9, extraversion: 0.3,
            agreeableness: 0.6, emotionality: 0.5, honestyHumility: 0.8 },
  instructions: '按规程领导，优先保证安全余量。',
};
const okafor = {
  name: '奥卡福船长', archetype: '创新派', unit: '贝塔站',
  hexaco: { openness: 0.9, conscientiousness: 0.4, extraversion: 0.8,
            agreeableness: 0.5, emotionality: 0.3, honestyHumility: 0.6 },
  instructions: '通过实验领导，探索新的边界。',
};

const [a, b] = await Promise.all(
  [reyes, okafor].map(actor => wm.simulate({ actor, maxTurns: 6, seed: 42 })),
);
console.log(a.fingerprint, b.fingerprint);
```

### 查看智能体群

每次运行可以携带具有人格、部门、职责、情绪、家庭关系和持久记忆的智能体群，结果保存在 `RunArtifact.finalSwarm`。人数由场景及运行配置决定。

```typescript
import { getSwarm, swarmByDepartment, moodHistogram, departmentHeadcount } from 'paracosm/swarm';

const swarm = getSwarm(a);
if (swarm) {
  console.log(`T${swarm.turn} · ${swarm.population} 人 · 士气 ${Math.round((swarm.morale ?? 0) * 100)}%`);
  console.log(moodHistogram(swarm));
  console.log(departmentHeadcount(swarm));
  console.log(swarmByDepartment(a));
}
```

也可通过 `WorldModel.swarm(artifact)` 或 HTTP 接口 `GET /api/v1/runs/:runId/swarm` 读取。控制台通过 SSE 逐回合接收相同结构的数据。运行指纹是轨迹、决策与最终指标的稳定哈希，可用于比较运行结果。

## 快速开始：从提示词或文档生成仿真

`WorldModel.fromPrompt` 接受文本、URL 或 PDF 提取文本，编译得到场景；`wm.quickstart` 再生成多个符合上下文的角色并并行运行。草稿通过 `DraftScenarioSchema` 校验，然后进入标准的 `compileScenario` 流程。

```typescript
import { WorldModel } from 'paracosm';

const wm = await WorldModel.fromPrompt({
  seedText: '第三季度董事会简报：公司需要在扩大市场与控制成本之间作出选择……',
  domainHint: '公司战略决策',
});
const { actors, artifacts } = await wm.quickstart({ actorCount: 3 });
artifacts.forEach((artifact, i) => console.log(actors[i].name, artifact.fingerprint));
```

控制台默认进入“快速开始”，支持粘贴描述、上传 PDF 或输入 URL。生成速度取决于模型和网络。程序化批量实验可使用 `ACTOR_PRESETS` 中的人格预设。

## 安装与本地启动

### 作为 SDK 使用

```bash
pnpm add paracosm
```

npm 上的 `paracosm` 包由上游发布。本仓库的汉化、自定义模型改动和新增场景请通过源码使用。

项目使用纯 ESM，要求 Node.js 22 或更高版本；上游 CI 使用 Node.js 24。根模块导出 `run`、`runMany`、`WorldModel`、`compileScenario`、内置场景、预设与公共类型。高级接口位于 `paracosm/{compiler,schema,swarm,digital-twin,core}`。

### 从中文仓库启动控制台

```bash
git clone https://github.com/czhcc/paracosm_cn.git
cd paracosm_cn
pnpm install
pnpm --dir src/dashboard install
pnpm run dashboard:build
```

将 `.env.example` 复制为 `.env`，填入模型配置。Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

启动服务：

```bash
pnpm run dashboard
```

访问 <http://localhost:3456/sim>。`PORT` 可修改服务端口。需要修改前端并实时预览时，可另开终端执行 `pnpm run dashboard:dev`，其访问地址以 Vite 输出为准。

项目根目录和前端目录分别有依赖配置；上游 CI 使用 npm 锁文件。使用 pnpm 开发时，不要用它重新生成上游的 `package-lock.json`。

### 模型配置

至少配置一个模型提供方。使用 OpenAI 兼容的本地模型或网关时，可在 `.env` 中配置：

```dotenv
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=http://your-model-server:4002/v1
OPENAI_MODEL=your-model-id
PORT=3456
```

在控制台中选择 OpenAI 提供方，并使用服务实际提供的模型 ID。默认模型用于仿真角色、场景编译和角色聊天；显式填写的角色模型或编译模型优先于该默认值。模型需支持工程所用的结构化输出等能力。

使用官方 OpenAI 接口时可留空 `OPENAI_BASE_URL`；Anthropic 可配置 `ANTHROPIC_API_KEY`，并通过 `ANTHROPIC_MODEL` 设置默认模型。修改环境配置后重启服务。密钥保存在本地 `.env`，不要提交到仓库。

### 使用新增场景

服务启动时会加载 `scenarios/` 下的自定义场景。在控制台场景目录中选择“双城引才：经济成长与城市吸引力”或“舆情应对：封堵限制与沟通疏导”，查看角色预设，在设置中确认模型和运行参数后启动。

保持默认八回合及配套预设，可以使用场景安排的共同事件比较政策；修改事件、角色指令或延长运行后，应重新检查比较口径。在“仿真”页看逐回合事件与决策，在“可视化”页看智能体群状态，在“报告”页看分析、指标与最终结论。

## 定义世界

场景使用 JSON 定义，可以手写、由提示词生成，或通过 `seedText` / `seedUrl` 引入资料。

```json
{
  "id": "submarine-habitat",
  "labels": {
    "name": "深海居住站",
    "populationNoun": "船员",
    "settlementNoun": "居住站",
    "timeUnitNoun": "day",
    "currency": "资源点"
  },
  "setup": {
    "defaultTurns": 8,
    "defaultPopulation": 50,
    "defaultStartTime": 2040,
    "defaultSeed": 42
  },
  "departments": [
    {
      "id": "life-support",
      "label": "生命保障部",
      "role": "生命保障主管",
      "instructions": "分析氧气水平、二氧化碳净化能力与水循环。"
    },
    {
      "id": "engineering",
      "label": "工程部",
      "role": "总工程师",
      "instructions": "分析舱体完整性、压力系统与发电能力。"
    }
  ],
  "metrics": [
    { "id": "population", "format": "number" },
    { "id": "morale", "format": "percent" }
  ]
}
```

场景通过 `labels.populationNoun`、`labels.settlementNoun`、`labels.timeUnitNoun` 定义领域词汇，`labels.actorNoun` 定义决策者称谓。未覆盖时使用引擎默认词汇。除了人口和士气，运行只携带场景在 `world` 中声明的指标与政治状态；未声明的火星专用指标不会自动进入其他场景。

`setup.defaultTimePerTurn` 和 `setup.defaultStartTime` 是数值，具体表示年、季度、日或其他单位由场景决定。年龄、经验、出生与死亡等年化机制使用年为基准；`setup.yearsPerTimeUnit` 可显式指定换算关系，否则按时间单位名称推断：年为 1，季度为 1/4，月为 1/12，周为 1/52，日为 1/365，小时为 1/8760，其他名称默认为 1。

较长回合按年度步骤推进。进度钩子可读取 `timeDelta`（场景单位）、`yearsDelta`、`yearsSinceStart` 和 `yearsPerUnit`。已有完整示例见 [scenarios/](scenarios/)。

## 编译与运行

```typescript
import { compileScenario, WorldModel } from 'paracosm';
import worldJson from './my-world.json' with { type: 'json' };

// 首次编译调用模型并缓存结果；费用取决于实际提供方
const scenario = await compileScenario(worldJson, {
  provider: 'anthropic', model: 'claude-sonnet-4-6',
});
const wm = WorldModel.fromScenario(scenario);
const result = await wm.simulate({
  actor,
  maxTurns: 6,
  seed: 42,
  // costPreset: 'economy',
  onEvent(e) { console.log(actor.name, e.type, e.data.summary); },
});

console.log(result.metadata.scenario.name, result.fingerprint);
console.log(result.cost?.totalUSD.toFixed(2));
console.log(result.finalState?.metrics);
console.log(result.forgedTools?.length ?? 0);
console.log(result.citations?.length ?? 0);
```

每次 `wm.simulate` 接受一个决策者，控制台将多位决策者的运行并行展示。场景编辑器支持创建、导入、导出、编译和运行自定义场景。

### 命令行

安装上游命令行工具后，可以使用：

```bash
pnpm add -g paracosm
paracosm run
paracosm run --name "Reyes" --openness 0.85 --turns 6
paracosm dashboard 6
paracosm compile scenarios/lunar.json --seed-url <url> --max-searches 5
paracosm init my-app --domain "8 人潜艇船员" --actors 3
```

命令行按 `--actors`、`./actors.json`、`./config/actors.json`、内置示例的顺序寻找角色配置。`paracosm-dashboard` 是保留的兼容命令。使用本仓库源码可通过 `pnpm run run`、`pnpm run compile`、`pnpm run dashboard` 调用对应入口。

### 分享运行

控制台的顶部操作菜单、快速开始角色卡片和资料库记录可以复制可视化分享链接。历史记录需要已关联广播会话，才会显示相应的分享按钮。会话分享通过 `/sessions/:id/replay` SSE 接口播放已保存的运行。

也可以使用远程 JSON 记录构造链接：

```text
https://your-server/sim?load=<remote-json-url>&tab=viz&autoload=1
```

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `load` | 是 | 可通过跨域请求读取的 HTTP 或 HTTPS JSON 记录地址 |
| `tab` | 否 | 加载后打开的页面：`sim`、`viz`、`reports`、`chat`、`library`、`settings`、`studio`；默认或无效值使用 `sim` |
| `autoload` | 否 | `1` 或 `true` 跳过预览确认；不填则显示预览 |

## 类型化产物与事件

运行结果统一记录在 `RunArtifact` 中，包含场景元数据、轨迹、决策、最终状态，以及可用的智能体群、工具、引用和快照。流事件带有类型，可据此区分回合、报告、进度和批量结果等消息。

非 TypeScript 项目可使用 `pnpm run export:json-schema` 导出 `schema/run-artifact.schema.json` 与 `schema/stream-event.schema.json`。Python 项目可据此生成 Pydantic 类型，其他语言也可使用相应的 JSON Schema 工具。具体结构以 [schema/](schema/) 和 API 类型为准。

## 数字孪生：对象与干预

以单个对象及其干预为中心的场景，可以使用 `DigitalTwin`、`SubjectConfig` 和 `InterventionConfig`。

```typescript
import { DigitalTwin } from 'paracosm/digital-twin';
import { SubjectConfigSchema, InterventionConfigSchema } from 'paracosm/schema';

const twin = await DigitalTwin.fromJson(scenarioJson);
const subject = SubjectConfigSchema.parse({
  id: 'user-42', name: 'Alice',
  profile: { age: 34, diet: 'mediterranean' },
  signals: [{ label: 'HRV', value: 48.2, unit: 'ms', recordedAt: '2026-04-21T08:00:00Z' }],
  markers: [{ id: 'rs4680', category: 'genome', value: 'AA' }],
});
const intervention = InterventionConfigSchema.parse({
  id: 'intv-1', name: '肌酸与睡眠习惯调整',
  description: '每日 5g，晚上 11 点就寝。',
  duration: { value: 12, unit: 'weeks' },
  adherenceProfile: { expected: 0.7 },
});
const artifact = await twin.intervene({ subject, intervention, actor });
```

`DigitalTwin` 是 `WorldModel` 的别名，以导入路径表达应用场景。对象与干预信息随 `RunArtifact.subject` 和 `RunArtifact.intervention` 一起传递；上述代码用于展示输入契约。

## HEXACO 以外的特征模型

`TraitModel` 注册表内置两种模型，也支持注册新模型。

| 模型 | 维度 | 适用角色 |
| --- | --- | --- |
| `hexaco` | 开放性、尽责性、外向性、宜人性、情绪性、诚实谦逊 | CEO、船长、市长、委员会等 |
| `ai-agent` | 探索、验证严谨性、服从权威、风险容忍、透明度、指令遵循 | AI 发布负责人、自主协调器、评估智能体等 |

```typescript
const releaseDirector = {
  name: 'Atlas-Bot 发布负责人',
  archetype: '积极发布型优化器',
  unit: '前沿实验室',
  traitProfile: {
    modelId: 'ai-agent',
    traits: {
      exploration: 0.85, 'verification-rigor': 0.2, deference: 0.2,
      'risk-tolerance': 0.85, transparency: 0.4, 'instruction-following': 0.4,
    },
  },
  instructions: '优先缩短上市时间，将验证视作额外成本。',
};
await wm.simulate({ actor: releaseDirector, maxTurns: 6, seed: 42 });
```

设置 `traitProfile` 后可不填写 `hexaco`，也可以提供代表性快照。编排器通过 `normalizeActorConfig` 归一化这些输入。详见 [COOKBOOK](docs/COOKBOOK.md)。

## 模型分工与费用

仿真会实际调用所配置的模型接口。不同角色可以使用不同模型：部门需要生成工具代码，通常更依赖模型能力；成员反应调用量较多，可以采用成本较低的模型。

| 预设 | 用途 | 说明 |
| --- | --- | --- |
| `quality`（默认） | 注重分析和工具生成质量 | 按提供方为部门、决策者、导演、审查和反应角色分配模型 |
| `economy` | 开发迭代与测试 | 在部分角色使用更低费用的模型，可能影响结构化输出和工具审批表现 |

显式指定的 `models` 优先于预设；本工程的自定义默认模型配置可用于本地或兼容网关。实际费用随模型、回合、部门、成员数量和事件数量变化，上游 README 的美元估算不代表本地模型或其他网关的实际账单。

`WorldModel.simulate` 返回 `cost`，记录估算的美元费用与模型调用次数；其 token 汇总不完整。流事件的 `_cost` 提供各阶段 token、缓存读写与节省费用等信息。稳定的提示词前缀可供提供方的提示词缓存使用，是否命中及计费规则取决于提供方。

## 一个回合如何运行

事件导演生成事件 → 确定性内核推进 → 各部门并行分析 → 决策者选择 → 结果分类 → 内核应用效果 → 成员反应 → 记忆整合 → 人格漂移。

部门分析期间可在进程内的 `node:vm` 上下文中生成并运行工具，工具生成由大模型审查。导演、部门、决策者、反应和最终裁决等结构化模型输出均经过 Zod 校验，失败后携带反馈重试。相关定义见 [src/runtime/validators/](src/runtime/validators/)，详细流程见 [架构文档](docs/ARCHITECTURE.md)。

## 外部知识与资料增强

使用 `paracosm compile <scenario.json> --seed-text "..."` 或 `--seed-url <url>`，可以提取主题，并通过 Firecrawl、Tavily、Serper、Brave 等搜索服务补充资料。配置 `COHERE_API_KEY` 后可使用 Cohere 重排搜索结果。

研究内容进入 AgentOS 的 `AgentMemory.sqlite()` 存储，并以引用形式提供给部门提示词；知识包按种子资料缓存。报告页展示相关引用。搜索依赖对应服务密钥及场景中的相关策略配置，具体选项见 [.env.example](.env.example)。

## 内置场景、API 与存储

上游内置 `marsScenario`（火星创世纪：默认 100 名居民、6 回合、跨越 48 年、5 个部门）和 `lunarScenario`（月球南极：50 人团队、月壤与低重力环境），可作为自定义场景的参考。场景目录还提供公司、实验室、深海站等配置，本工程另增加前述两个中文策略比较场景。

程序接口包括根模块的 `run`、`runMany`、`WorldModel`、`compileScenario`、`createParacosmClient`，以及各子路径。默认提供方、预设和模型可按客户端或通过相应 `PARACOSM_*` 环境变量指定。详见 [COOKBOOK](docs/COOKBOOK.md)。

HTTP 服务提供 `/api/v1/*` 的读取和回放接口；`POST /simulate` 需开启 `PARACOSM_ENABLE_SIMULATE_ENDPOINT=true`。详见 [HTTP API](docs/HTTP_API.md)。

运行历史与保存会话使用 SQLite，通过 `@framers/sql-storage-adapter` 访问。无法加载原生 `better-sqlite3` 时尝试 `sql.js`。运行历史位于 `APP_DIR` 下的 `data/runs.db`，未设 `APP_DIR` 时使用工作目录；可通过 `PARACOSM_RUN_HISTORY_DB_PATH` 修改历史库位置。会话位于 `data/sessions.db`。`STORAGE_ADAPTER` 与 `DATABASE_URL` 不控制这两个数据库。

管理员写入默认关闭。`/admin/sessions/save`、`/admin/data/wipe`、`DELETE /admin/scenarios/:id`，以及 `POST /scenario/store` 的磁盘保存操作，需要 `ADMIN_WRITE=true`，并在 `X-Admin-Token` 请求头携带 `ADMIN_TOKEN`。开启后，控制台“设置”显示“管理员令牌”输入框，可为当前浏览器保存令牌。

## 项目结构

```text
src/
  index.ts             公共导出：运行、世界模型、编译器、场景、预设与类型
  api/                 run() 与 runMany()
  engine/              场景契约、编译器与确定性内核
    core/              随机数、状态、快照与推进
    compiler/          场景草稿与资料编译
    schema/            RunArtifact 类型与 Zod 定义
    digital-twin/      数字孪生别名
    scenarios/         内置场景加载
    data-driven-hooks/ 将 JSON 钩子转为运行时钩子
    physics/           个体推进机制
    traits/            人格与特征模型
    registries/        效果、事件与指标注册表
    presets/           角色预设
    provider/          模型提供方与配置
  runtime/             仿真执行
    orchestrator/      导演、部门、决策者与成员反应的回合流程
    agents/            反应、记忆与运行后聊天
    world-model/       simulate、replay、fork、intervene、batch
    swarm/             智能体群投影视图
    research/          引用与研究记忆
    validators/        模型输出校验
    economics/         成本跟踪
    io/                产物输出与 SSE 封装
    util/              公共辅助逻辑
  llm/                 运行时与编译器共享的模型调用
  cli/                 命令行入口
  server/              HTTP 与 SSE 服务
  dashboard/           React + Vite 控制台
scenarios/             内置与新增场景 JSON、知识包
config/                角色配置
docs/                  架构、API、示例与方案文档
tests/                 自动化测试
tests-e2e/             浏览器端到端测试
```

引擎负责状态、时间、随机性和约束；场景负责事件类别、部门指令、推进钩子与资料引用；编排器连接两者。详见 [内部目录说明](docs/architecture/INTERNAL_LAYOUT.md)。

## 基于 AgentOS

Paracosm 使用 AgentOS 完成智能体编排、模型调用、工具生成和记忆管理。部门负责人保留记忆，专业角色可以在决策过程中创建工具，工具进入流程前由模型审查。

| AgentOS API | 用途 |
| --- | --- |
| `agent()` | 决策者、部门和事件导演智能体 |
| `generateText()` | 事件生成和工具评估等模型调用 |
| `EmergentCapabilityEngine` | 运行时工具生成与执行 |
| `EmergentJudge` | 生成工具的安全审查 |
| `WebSearchService` | 多提供方搜索与资料增强 |
| `AgentMemory` | 每次运行的引用与全文检索记忆 |

## 在线演示与自行部署

| 项目 | 上游在线演示 | 自行部署 |
| --- | --- | --- |
| 访问方式 | [上游演示站](https://paracosm.agentos.sh/sim) | 本地或服务器，默认端口 3456 |
| 模型密钥 | 使用演示站密钥，或在设置中输入自己的密钥 | 使用自己的环境配置或会话密钥 |
| 限制 | 使用站点密钥时有回合、人数、部门及每日运行限制 | 没有托管演示配额；各接口仍有参数范围及服务限流 |
| 费用 | 可试用，具体以演示站为准 | 软件采用 Apache-2.0；模型费用由提供方收取 |

`runMany()` 和 `WorldModel.quickstart()` 接受 2 至 6 个角色；`run()` 运行两个角色并返回第一个结果。控制台普通运行支持 2 至 300 个角色，分支可以使用 1 个角色。服务使用自身密钥时，`RATE_LIMIT` 控制每个 IP 每天运行次数，未设置时为 1，设为 `0` 可关闭该限流。SDK 的单次仿真参数与控制台配额不同，具体以接口校验为准。

## 文档与链接

| 资源 | 地址 |
| --- | --- |
| 英文 README | [README.md](README.md) |
| 原始仓库 | [framerslab/paracosm](https://github.com/framerslab/paracosm) |
| 中文仓库 | [czhcc/paracosm_cn](https://github.com/czhcc/paracosm_cn) |
| 上游在线演示 | [paracosm.agentos.sh/sim](https://paracosm.agentos.sh/sim) |
| API 参考 | [paracosm.agentos.sh/docs](https://paracosm.agentos.sh/docs) |
| HTTP API | [docs/HTTP_API.md](docs/HTTP_API.md) |
| 使用示例 | [docs/COOKBOOK.md](docs/COOKBOOK.md) |
| 常见问题 | [docs/FAQ.md](docs/FAQ.md) |
| 对抗模式修改方案 | [docs/对抗模式修改方案.md](docs/对抗模式修改方案.md) |
| AgentOS | [agentos.sh](https://agentos.sh/en) |
| 上游社区 | [Discord](https://wilds.ai/discord) |

## 贡献与支持

开发约定、提交规范和贡献许可见 [CONTRIBUTING.md](CONTRIBUTING.md)，自动化代理约定见 [AGENTS.md](AGENTS.md)。另请参阅 [行为准则](.github/CODE_OF_CONDUCT.md)、[安全策略](.github/SECURITY.md) 和 [支持说明](SUPPORT.md)。上游发布与部署流程见 [发布说明](https://github.com/framerslab/paracosm/blob/master/CONTRIBUTING.md#releasing-and-deploying)。

原项目的商业、合作与赞助联系邮箱为 [team@frame.dev](mailto:team@frame.dev)。

## 许可证

本工程遵循原项目的 [Apache-2.0 许可证](LICENSE)，保留原作者署名与许可声明。原项目由 [Frame.dev](https://frame.dev) 开发；本仓库在此基础上进行汉化与场景扩展。
