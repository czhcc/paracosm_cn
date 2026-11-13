import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCompileCliOptions } from '../../src/cli/compile-cli-options.js';

test('parseCompileCliOptions captures the compiler path and enrichment flags', () => {
  const options = parseCompileCliOptions([
    'scenarios/submarine.json',
    '--provider', 'openai',
    '--model', 'gpt-5.4',
    '--no-cache',
    '--cache-dir', '.tmp/cache',
    '--seed-url', 'https://example.com/ocean-station',
    '--max-searches', '7',
    '--no-web-search',
  ]);

  assert.equal(options.scenarioPath, 'scenarios/submarine.json');
  assert.equal(options.provider, 'openai');
  assert.equal(options.model, 'gpt-5.4');
  assert.equal(options.cache, false);
  assert.equal(options.cacheDir, '.tmp/cache');
  assert.equal(options.seedUrl, 'https://example.com/ocean-station');
  assert.equal(options.maxSearches, 7);
  assert.equal(options.webSearch, false);
});

test('parseCompileCliOptions defaults to the compiler runtime defaults', () => {
  const options = parseCompileCliOptions([]);

  assert.equal(options.scenarioPath, undefined);
  assert.equal(options.provider, 'anthropic');
  assert.equal(options.model, 'claude-sonnet-4-6');
  assert.equal(options.cache, true);
  assert.equal(options.cacheDir, '.paracosm/cache');
  assert.equal(options.webSearch, true);
});

test('OpenAI compiler uses its configured custom model unless --model overrides it', () => {
  const previous = process.env.OPENAI_MODEL;
  process.env.OPENAI_MODEL = 'qwen3.8-flash-next';
  try {
    assert.equal(parseCompileCliOptions(['--provider', 'openai']).model, 'qwen3.8-flash-next');
    assert.equal(parseCompileCliOptions(['--model', 'other-model', '--provider', 'openai']).model, 'other-model');
  } finally {
    if (previous === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previous;
  }
});
