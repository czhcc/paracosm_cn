/**
 * Prompt/document/URL to paracosm scenario compiler (Quickstart).
 *
 * Given seed text (optionally with a domain hint), an LLM proposes a
 * scenario draft against `DraftScenarioSchema`: the domain's nouns, its
 * departments, its metrics with each one's start and range, and the
 * category tables its events use. `seedDraftToScenarioJson` turns the
 * draft into a scenario JSON whose world holds every declared score,
 * which keeps a draft's mark on a supply that sustains the people only
 * where the mark passes the veto (`sustainsVeto`), and which keeps one
 * death die for each person's whole life. That JSON routes into the
 * existing `compileScenario` pipeline so the
 * `seedText` research grounding + hook generation still fire. JSON is the
 * canonical contract; this module only provides a convenience entry for
 * callers that start from unstructured source material.
 *
 * @module paracosm/compiler/compile-from-seed
 */
import { z } from 'zod';
import { configuredModel } from '../provider/model-config.js';
import { compileScenario } from './index.js';
import { seedDraftToScenarioJson } from './seed-draft-world.js';
import { validateSeedWorld } from './validate.js';
import type { CompileOptions } from './types.js';
import type { ScenarioPackage } from '../types.js';
import { apiKeyForProvider, resolveProviderFromCredentials } from '../provider/credentials.js';
import { generateValidatedObject } from '../../llm/generateValidatedObject.js';

/**
 * A field that never fails the draft: a value of the wrong type reads as
 * absent, and the normalizer gives the field its default. Optional on the
 * outside, so the provider's strict schema lets the model leave it out;
 * `catch` on the inside, so a wrong type on a route with no provider-side
 * schema does not cost a draft call.
 */
const lenientString = () => z.string().optional().catch(undefined).optional();
/** As {@link lenientString}, for a number. */
const lenientNumber = () => z.number().optional().catch(undefined).optional();
/** As {@link lenientString}, for a true or a false. */
const lenientBoolean = () => z.boolean().optional().catch(undefined).optional();

/** One entry of a category table: the change an event of that kind brings to one metric. */
const DraftEffectEntrySchema = z.object({
  metric: z.string(),
  change: z.number(),
});

/** One category table. An array of these, not a record: a record takes the schema out of strict mode. */
const DraftEffectTableSchema = z.object({
  category: z.string(),
  // A malformed entry reads as undefined and the normalizer drops it; the
  // table's other entries stay.
  entries: z.array(DraftEffectEntrySchema.optional().catch(undefined)),
});

/**
 * The subset of a scenario JSON the LLM is asked to propose. Lean on
 * purpose: the compiler's existing pipeline fills in defaults, hooks,
 * and seed-ingested citations; we only need the domain-specific fields.
 *
 * The fields that say where a metric starts, what bounds it, whether it
 * is a supply that sustains the people and what its events bring carry no
 * size or range check here. Every rule on them lives in
 * `seedDraftToScenarioJson`, which repairs and never rejects, so none of
 * them can fail a draft.
 */
export const DraftScenarioSchema = z.object({
  id: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, 'kebab-case ids only'),
  labels: z.object({
    name: z.string().min(2).max(80),
    populationNoun: z.string().min(2).max(32),
    settlementNoun: z.string().min(2).max(32),
    timeUnitNoun: z.string().min(2).max(24),
    currency: z.string().min(1).max(16).optional(),
    // Swappable decision-making entity. Optional so seed drafts that
    // pre-date this field still validate; the compiler defaults it to
    // "actor" / "actors" when absent (engine/compiler/index.ts).
    actorNoun: z.string().min(2).max(32).optional(),
    actorNounPlural: z.string().min(2).max(32).optional(),
  }),
  setup: z.object({
    defaultTurns: z.number().int().min(2).max(12),
    defaultPopulation: z.number().int().min(10).max(1000),
    defaultStartTime: z.number().int(),
    defaultSeed: z.number().int().optional(),
    // Years in one time unit, for a unit the kernel does not know by its
    // word (it knows year, quarter, month, week, day and hour).
    yearsPerTimeUnit: z.number().positive().max(1000).optional(),
  }),
  departments: z.array(z.object({
    id: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/),
    label: z.string().min(2).max(48),
    role: z.string().min(2).max(80),
    instructions: z.string().min(10).max(400),
  })).min(2).max(8),
  metrics: z.array(z.object({
    id: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/),
    format: z.enum(['number', 'percent', 'currency']).default('number'),
    better: z.enum(['higher', 'lower']).optional(),
    label: lenientString(),
    unit: lenientString(),
    initial: lenientNumber(),
    min: lenientNumber(),
    max: lenientNumber(),
    // The draft's mark on a supply that sustains the people. Only exactly
    // `true` is a mark, and the normalizer keeps one only where the veto
    // passes it.
    sustains: lenientBoolean(),
  })).min(2).max(12),
  // Lenient as the metric fields are. A malformed table reads as undefined
  // and the normalizer drops it; the other tables stay.
  effects: z.array(DraftEffectTableSchema.optional().catch(undefined)).optional().catch(undefined).optional(),
  theme: z.string().min(10).max(400).optional(),
});

export type DraftScenario = z.infer<typeof DraftScenarioSchema>;

/** Seed source material + optional domain hint passed by the caller. */
export interface CompileFromSeedInput {
  seedText: string;
  domainHint?: string;
  sourceUrl?: string;
}

/**
 * LLM system prompt for draft generation. Emphasizes domain fit AND
 * names every numeric / format constraint enforced by
 * DraftScenarioSchema so the LLM doesn't waste retries on validation
 * failures the schema would have caught (real-world counts pasted
 * verbatim into defaultPopulation, capitalized ids, instructions
 * bursting past 400 chars, etc.).
 */
const DRAFT_SYSTEM_PROMPT = `你是 Paracosm 多智能体结构化世界模型的场景架构师。根据输入资料，生成符合领域背景和 DraftScenarioSchema 的场景 JSON；输出会经过 Zod 严格校验。所有显示名称、描述、角色和指令使用简体中文，JSON 字段名及内部 ID 保持协议格式。

领域名词：populationNoun、settlementNoun、timeUnitNoun 等显示词使用中文，例如船员／基地／天，员工／公司／季度，居民／殖民地／年。时间单位需与场景时间设置一致。timeUnitNoun 和 timeUnitNounPlural 是引擎解释时间尺度的字段，仍使用 year、quarter、month、week、day、hour 及其英文复数形式；前端显示时翻译，不改变时间换算。

ID：id、departments[].id、metrics[].id 必须为小写字母、数字和连字符组成的 kebab-case。顶层长度 3～64，部门 2～48，指标 2～32。不能将中文显示名称用作 ID。

SETUP：defaultTurns 为 2～12 的整数，通常选择 4～8。defaultPopulation 为 10～1000 的整数，表示模拟抽样人数，不是现实人口；即使现实人口数百万，也只能选择这个范围内的代表性样本。defaultStartTime 为符合领域的整数。yearsPerTimeUnit 仅在非标准时间单位时填写；标准 year、quarter、month、week、day、hour 不填该字段。

部门：2～8 个，label 长度 2～48 字符，role 为 2～80 字符的简短职位，instructions 为 10～400 字符的中文行动指令。

指标：2～12 个，按重要性排序，前四个显示在页头。
- format：必须为 number、percent 或 currency。
- better：数值越低越好的指标（流失率、缺陷数、风险）设置为 "lower"，其余省略。
- label：2～48 字符的中文显示名称，例如“土壤健康”。
- initial：符合领域实际的初始值。
  - percent：采用 0～100 的百分数尺度，65 表示 65%，不能写成 0.65。
  - number：使用指标自身单位（库存 500、满分 100 的指数为 40）。初始值至少为 1；从空开始的计数可以为 0。占比或比率应使用 percent。
  - currency：场景币种的金额，例如 2400000。
- unit：仅 number 和 currency 可选，最多 16 字符，例如“吨”“kW”“分”；percent 不需要单位。
- min、max：仅 number 和 currency 可选，表示不可突破的下限或上限。只有确实存在上限（如满分 100）时才设置 max；可持续增长的库存、计数和金额不设 max。
- sustains：仅当指标是人群生存必需、且可由决策增减的实物存量或容量（如水、氧气、电力、居住空间）时，才可选填 true。评分、占比、比率、资金、风险和人数不能标记。无法确定时省略，多数场景不需要此标记。
- population（人数）和 morale（士气，百分数）是引擎维护的指标 ID，仅在决策者需要据此决策时声明。
- 只选择决策者实际关注的指标，不要罗列全部统计数据。

效果 effects：3～8 类，描述世界中的事件类型及其影响。
- category：2～32 字符的 kebab-case 事件类型，例如 supply、regulation、market、safety。
- entries：1～4 项，表示普通且胜任的应对所产生的效果。
  - metric：已声明的指标 ID 或 morale，不能为 population。
  - change：按指标自身尺度增加的数值，正数提高、负数降低；百分数使用百分点，4 表示提高四个百分点。
  - 变化幅度保持适中，约为指标初始值的二十分之一，不能超过十二分之一。冒险方案成功时收益约为其 2.5 倍；失败会失去收益，并使成本最多增至四倍。
  - 领域存在权衡时，每类事件应同时包含某项指标的收益和另一项指标的成本。成本是违背指标 better 方向的变化。
- 每个指标必须至少出现在一种事件类型中。

标签：name 为 2～80 字符的中文场景名称；currency 可选，1～16 字符，例如 USD。其他字段遵守 Schema，不能新增字段。钩子、引用和实现细节交给后续编译。仅返回有效 JSON。`;

/** Internal options, a subset of `CompileOptions` that `compileFromSeed` actually reads. */
export interface CompileFromSeedOptions extends CompileOptions {
  /** Override the provider for the draft-generation LLM call. Default: 'anthropic'. */
  draftProvider?: string;
  /** Override the model for the draft-generation LLM call. Default: 'claude-sonnet-4-6'. */
  draftModel?: string;
}

/**
 * Compile a scenario from seed source material. Calls the LLM to
 * propose a `DraftScenario`, validates it via Zod, turns it into a
 * scenario JSON whose world holds every declared score
 * (`seedDraftToScenarioJson`), then routes into the existing
 * `compileScenario` pipeline with `seedText` threading through for
 * research grounding. That JSON keeps one death die for each person's
 * whole life (`setup.mortalityDice: 'life'`), and a supply the draft
 * marks as sustaining the people keeps its mark only where the veto
 * passes it. The categories the knowledge bundle maps are then
 * the category tables' keys, so every event the director is offered has
 * a table.
 *
 * Retries up to 3 times on Zod-validation failure. The first failure
 * usually surfaces as an off-bound numeric (defaultPopulation pasted
 * from a real-world headcount) or a non-kebab id; the explicit
 * constraints in DRAFT_SYSTEM_PROMPT plus the retry budget recover
 * cleanly in practice.
 *
 * Wraps ObjectGenerationError with a more actionable message that
 * preserves the raw model output so the caller can see what the LLM
 * tried to produce.
 *
 * @throws Error when the LLM fails to produce a valid draft after the
 *   retry budget is exhausted. Wraps any ObjectGenerationError so the
 *   message names the field bounds that likely tripped validation.
 */
export async function compileFromSeed(
  input: CompileFromSeedInput,
  options: CompileFromSeedOptions = {},
): Promise<ScenarioPackage> {
  const provider = resolveProviderFromCredentials(
    (options.draftProvider ?? options.provider) as CompileOptions['provider'],
    options,
    'anthropic',
  );
  const model = options.draftModel ?? options.model ?? configuredModel(provider)
    ?? (provider === 'openai' ? 'gpt-5.4-mini' : 'claude-sonnet-4-6');

  const hint = input.domainHint ? `\n\nDomain hint: ${input.domainHint}` : '';
  const prompt = `Seed source material:\n"""\n${input.seedText}\n"""${hint}\n\nRespond with a scenario JSON that matches DraftScenarioSchema. Remember: defaultPopulation must be 10-1000 (representative sample, NOT the real-world headcount from the seed). All ids must be kebab-case. Department instructions must be 10-400 chars. Give every metric its starting value, and list the kinds of event with what each brings.`;

  let result: Awaited<ReturnType<typeof generateValidatedObject<typeof DraftScenarioSchema>>>;
  try {
    result = await generateValidatedObject({
      provider,
      model,
      schema: DraftScenarioSchema,
      schemaName: 'DraftScenario',
      systemCacheable: DRAFT_SYSTEM_PROMPT,
      prompt,
      maxRetries: 3,
      apiKey: apiKeyForProvider(provider, options),
    });
  } catch (err) {
    const rawText = (err as { rawText?: string }).rawText;
    const baseMessage = err instanceof Error ? err.message : String(err);
    const failureHint = ' (common cause: defaultPopulation > 1000 from a real-world count, or a non-kebab id like "Stardrift Online")';
    const wrapped = new Error(`compileFromSeed: ${baseMessage}.${failureHint}${rawText ? `\nLast LLM raw output:\n${rawText.slice(0, 800)}` : ''}`);
    (wrapped as Error & { cause?: unknown }).cause = err;
    throw wrapped;
  }

  // The draft becomes a scenario JSON that declares a world. Each default
  // and repair prints one line, as seed ingestion prints its own. The check
  // holds that JSON to the seed path's rules; an error there is a fault in
  // the normalizer, so it is printed and the compile goes on.
  const { scenario, notes } = seedDraftToScenarioJson(result.object);
  for (const note of notes) console.log(`  [draft] ${note.message}`);
  for (const error of validateSeedWorld(scenario).errors) console.log(`  [draft] invariant: ${error}`);

  // Route the scenario JSON into the existing compiler with seedText
  // grounding so the research + hook-generation stages still pull
  // citations and generate TypeScript.
  const compiled = await compileScenario(scenario, {
    ...options,
    seedText: input.seedText,
    seedUrl: input.sourceUrl,
  });

  // The director is told its category must be one the knowledge bundle
  // maps, and an event reaches a table by exact key. The seed extraction
  // adds categories in free text, which no table carries, so the mapping is
  // rebuilt on the tables' keys: each keeps the topics it was left with, a
  // key with none takes every topic (a milestone reads research by its
  // category alone), and every other key goes. The topics are untouched.
  const merged = compiled.knowledge?.categoryMapping ?? {};
  const topics = Object.keys(compiled.knowledge?.topics ?? {});
  const categoryMapping: Record<string, string[]> = {};
  for (const key of Object.keys(scenario.effects as Record<string, unknown>)) {
    const kept = Object.prototype.hasOwnProperty.call(merged, key) ? merged[key] : [];
    categoryMapping[key] = kept.length > 0 ? [...kept] : [...topics];
  }
  return { ...compiled, knowledge: { ...compiled.knowledge, categoryMapping } };
}
