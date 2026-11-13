import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredModel, normalizeProviderModel } from '../../../src/engine/provider/model-config.js';

test('provider defaults ignore blanks and keep credentials separate from model selection', () => {
  const env = { OPENAI_MODEL: ' qwen3.8-flash-next ', ANTHROPIC_MODEL: '  ', OPENAI_API_KEY: 'secret' };
  assert.equal(configuredModel('openai', env), 'qwen3.8-flash-next');
  assert.equal(configuredModel('anthropic', env), undefined);
  assert.equal(configuredModel('openai', {}), undefined);
});

test('custom model IDs including gateway namespaces survive provider normalization', () => {
  for (const model of ['qwen3.8-flash-next', 'openrouter/qwen', 'org/model', 'local-model:latest']) {
    assert.equal(normalizeProviderModel('openai', ` ${model} `), model);
  }
  assert.equal(normalizeProviderModel('openai', 'claude-sonnet-4-6'), undefined);
  assert.equal(normalizeProviderModel('anthropic', 'gpt-5.4'), undefined);
  assert.equal(normalizeProviderModel('anthropic', 'o3'), undefined);
  assert.equal(normalizeProviderModel('openai', '  '), undefined);
});
