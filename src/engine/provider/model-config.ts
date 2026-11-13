import type { LlmProvider } from '../types.js';

/** Read the default model for a provider, including OpenAI-compatible gateways. */
export function configuredModel(
  provider: LlmProvider,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return env[provider === 'openai' ? 'OPENAI_MODEL' : 'ANTHROPIC_MODEL']?.trim() || undefined;
}

/** Keep custom model IDs while rejecting recognizable models of another provider. */
export function normalizeProviderModel(provider: LlmProvider, model?: string): string | undefined {
  const value = model?.trim();
  if (!value) return undefined;
  const knownProvider = value.startsWith('claude-') ? 'anthropic'
    : /^(gpt-|o\d)/.test(value) ? 'openai' : undefined;
  return knownProvider && knownProvider !== provider ? undefined : value;
}
