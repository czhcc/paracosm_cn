import type { LlmProvider, SimulationModelConfig } from '../../engine/types.js';
import { configuredModel, normalizeProviderModel } from '../../engine/provider/model-config.js';

export type SimulationEconomicsProfileId =
  | 'economy'
  | 'balanced'
  | 'quality'
  | 'deterministic_first'
  | 'custom';

export interface ResolvedEconomicsProfile {
  id: SimulationEconomicsProfileId;
  models: SimulationModelConfig;
  verdict: { mode: 'skip' | 'cheap' | 'balanced' | 'flagship'; model?: string };
  search: { mode: 'off' | 'gated' | 'adaptive' | 'aggressive'; maxSearches: number };
  batch: { maxConcurrency: number };
  compileSignature: string;
}

export interface EconomicsEnvelope {
  profileId: SimulationEconomicsProfileId;
  summary: string;
  estimatedCalls: number;
  estimatedPeakConcurrency: number;
}

interface ResolveEconomicsProfileInput {
  profileId?: SimulationEconomicsProfileId;
  provider: LlmProvider;
  baseModels: SimulationModelConfig;
  overrides?: Partial<SimulationModelConfig>;
  batchConcurrency?: number;
  env?: Record<string, string | undefined>;
}

const OPENAI_ECONOMY_MODELS: SimulationModelConfig = {
  departments: 'gpt-5.4-mini',
  commander: 'gpt-5.4-nano',
  director: 'gpt-5.4-nano',
  judge: 'gpt-5.4-mini',
  agentReactions: 'gpt-5.4-nano',
};

const OPENAI_QUALITY_MODELS: SimulationModelConfig = {
  departments: 'gpt-5.4-pro',
  commander: 'gpt-5.4',
  director: 'gpt-5.4',
  judge: 'gpt-5.4',
  agentReactions: 'gpt-5.4-mini',
};

const ANTHROPIC_ECONOMY_MODELS: SimulationModelConfig = {
  departments: 'claude-haiku-4-5-20251001',
  commander: 'claude-haiku-4-5-20251001',
  director: 'claude-haiku-4-5-20251001',
  judge: 'claude-haiku-4-5-20251001',
  agentReactions: 'claude-haiku-4-5-20251001',
};

const ANTHROPIC_QUALITY_MODELS: SimulationModelConfig = {
  departments: 'claude-opus-4-7',
  commander: 'claude-opus-4-7',
  director: 'claude-opus-4-7',
  judge: 'claude-sonnet-4-6',
  agentReactions: 'claude-sonnet-4-6',
};

function mergeModelOverrides(
  provider: LlmProvider,
  baseModels: SimulationModelConfig,
  overrides?: Partial<SimulationModelConfig>,
): SimulationModelConfig {
  return {
    commander: normalizeProviderModel(provider, overrides?.commander) ?? baseModels.commander,
    departments: normalizeProviderModel(provider, overrides?.departments) ?? baseModels.departments,
    judge: normalizeProviderModel(provider, overrides?.judge) ?? baseModels.judge,
    director: normalizeProviderModel(provider, overrides?.director ?? overrides?.commander) ?? baseModels.director,
    agentReactions: normalizeProviderModel(provider, overrides?.agentReactions) ?? baseModels.agentReactions,
  };
}

function selectProfileModels(
  provider: LlmProvider,
  profileId: SimulationEconomicsProfileId,
  baseModels: SimulationModelConfig,
): SimulationModelConfig {
  switch (profileId) {
    case 'economy':
      return provider === 'anthropic' ? ANTHROPIC_ECONOMY_MODELS : OPENAI_ECONOMY_MODELS;
    case 'quality':
      return provider === 'anthropic' ? ANTHROPIC_QUALITY_MODELS : OPENAI_QUALITY_MODELS;
    case 'balanced':
    case 'deterministic_first':
    case 'custom':
    default:
      return baseModels;
  }
}

export function resolveEconomicsProfile(
  input: ResolveEconomicsProfileInput,
): ResolvedEconomicsProfile {
  const id = input.profileId ?? 'balanced';
  const profileModels = selectProfileModels(input.provider, id, input.baseModels);
  const defaultModel = configuredModel(input.provider, input.env);
  const configuredModels = defaultModel ? {
    commander: defaultModel, departments: defaultModel, judge: defaultModel,
    director: defaultModel, agentReactions: defaultModel,
  } : profileModels;
  const models = mergeModelOverrides(input.provider, configuredModels, input.overrides);

  const policies: Record<
    SimulationEconomicsProfileId,
    Omit<ResolvedEconomicsProfile, 'id' | 'models' | 'compileSignature'>
  > = {
    // batch.maxConcurrency tunes how many actors the cohort batch runner
    // (runBatchSimulations) keeps in flight at once. Pair runs (2 actors)
    // ignore this — they always run both in parallel via Promise.all.
    // Higher = faster wall-clock, more LLM rate-limit pressure. Defaults
    // sized so a 300-actor run lands as ~38 batches of 8 with the
    // balanced profile (the SeedInput default), staying well within
    // OpenAI tier-1 RPM. Drop to 1 by passing `economics.batchConcurrency`
    // when running against a tight provider quota.
    economy: {
      verdict: { mode: 'cheap' },
      search: { mode: 'gated', maxSearches: 1 },
      batch: { maxConcurrency: 8 },
    },
    balanced: {
      verdict: { mode: 'balanced' },
      search: { mode: 'adaptive', maxSearches: 3 },
      batch: { maxConcurrency: 8 },
    },
    quality: {
      // Flagship models are heavier per call so we keep fewer in flight
      // to avoid bursty 429s on top-tier endpoints.
      verdict: { mode: 'flagship' },
      search: { mode: 'aggressive', maxSearches: 5 },
      batch: { maxConcurrency: 4 },
    },
    deterministic_first: {
      // No LLM calls in this path — kernel-only. Concurrency is bound
      // only by CPU, so we can fan out widely.
      verdict: { mode: 'skip' },
      search: { mode: 'off', maxSearches: 0 },
      batch: { maxConcurrency: 16 },
    },
    custom: {
      verdict: { mode: 'balanced' },
      search: { mode: 'adaptive', maxSearches: 3 },
      batch: { maxConcurrency: 4 },
    },
  };

  const policy = policies[id];

  return {
    id,
    models,
    verdict: defaultModel || normalizeProviderModel(input.provider, input.overrides?.judge)
      ? { ...policy.verdict, model: models.judge }
      : policy.verdict,
    search: policy.search,
    batch: {
      maxConcurrency: Math.max(1, input.batchConcurrency ?? policy.batch.maxConcurrency),
    },
    compileSignature: JSON.stringify({
      id,
      provider: input.provider,
      models,
      verdict: policy.verdict.mode,
      search: policy.search.mode,
      batchConcurrency: input.batchConcurrency ?? policy.batch.maxConcurrency,
    }),
  };
}

export function buildEconomicsEnvelope(
  profile: ResolvedEconomicsProfile,
  input: { turns: number; population: number; departments: number },
): EconomicsEnvelope {
  const departmentCalls = input.turns * Math.max(1, input.departments);
  const reactionCalls = input.turns * Math.max(1, Math.ceil(input.population / 10));
  const verdictCalls = profile.verdict.mode === 'skip' ? 0 : 1;

  return {
    profileId: profile.id,
    summary: `${profile.id} profile · ${profile.verdict.mode} verdict · ${profile.search.mode} search · ${profile.batch.maxConcurrency}x batch concurrency`,
    estimatedCalls: departmentCalls + reactionCalls + verdictCalls,
    estimatedPeakConcurrency: profile.batch.maxConcurrency,
  };
}
