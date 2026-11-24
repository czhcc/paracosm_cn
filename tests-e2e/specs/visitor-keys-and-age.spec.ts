import { expect, test, type Page } from '@playwright/test';
import { mars, settingsBody } from '../../tests/cli/helpers/run-server.js';

const RUN_SERVER = 'http://127.0.0.1:3470';
const CONSENT_SERVER = 'http://127.0.0.1:3464';
const REPLAY_SERVER = 'http://127.0.0.1:3462';
const SLOT = 'paracosm:keyOverrides';
const LAST_LAUNCH = 'paracosm:lastLaunchConfig';
const MARKER = 'visitor-key-browser-fixture';
const SEARCH_MARKER = 'visitor-search-browser-fixture';
const AGE = "未满 18 岁须经父母或监护人同意。此服务不适用于 13 岁以下儿童。";
const TEACHERS = "教师可以自行运行仿真并在课堂上展示，或分享回放链接。回放仅播放已结束的运行，不会向 AI 模型发送新数据。学生自行开始运行须年满 13 岁，并取得父母或监护人的同意。";
const TERMS = "如果添加自己的 API 密钥，即确认该密钥归你所有，且服务商的条款允许你在此使用。";
const PRIVACY = "如果添加 API 密钥，我们会将其用于你启动的运行和聊天。浏览器标签页会保留密钥，直到关闭标签页或点击“清除我的密钥”。服务器仅在内存中保留使用中的密钥，停用后最多保留 30 分钟，随后清除。每个密钥只会发送给对应的服务商。";
const CHILDREN = 'Paracosm 面向一般公众，不面向 13 岁以下儿童，我们也不会明知而收集其个人信息。如果你认为有 13 岁以下儿童使用了本服务，请联系 team@frame.dev，我们会删除持有的相关信息。';
const PROVIDERS = ['openai', 'anthropic', 'serper', 'firecrawl', 'tavily', 'cohere'];
const field = (page: Page, provider: string) => page.locator(`#key-${provider}`);
const keyGroup = (page: Page) => page.getByRole('group', { name: 'API 密钥', exact: true });

test.skip(!!process.env.PARACOSM_E2E_BASE_URL, 'These checks need the fixture servers.');

async function stores(page: Page) {
  return page.evaluate(slot => ({
    local: localStorage.getItem(slot),
    session: sessionStorage.getItem(slot),
  }), SLOT);
}

async function savedLaunch(page: Page): Promise<unknown> {
  return page.evaluate(slot => JSON.parse(localStorage.getItem(slot) ?? 'null'), LAST_LAUNCH);
}

test('editing a key stores it for this tab and masks all key inputs from recordings and analytics', async ({ page }) => {
  const analytics: string[] = [];
  const vendors = /(?:clarity\.ms|posthog\.com|googletagmanager\.com|google-analytics\.com|plausible\.io|analytics\.manic\.agency)(?::\d+)?\//;
  page.on('request', request => {
    if (vendors.test(request.url()) || new URL(request.url()).pathname === '/api/event') {
      analytics.push(`${request.url()} ${JSON.stringify(request.headers())} ${request.postData() ?? ''}`);
    }
  });
  await page.route(vendors, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto(`${CONSENT_SERVER}/sim?tab=settings`);
  const clarity = page.waitForRequest(request => request.url().includes('clarity.ms/tag/'));
  await page.getByRole('button', { name: '全部接受', exact: true }).click();
  await clarity;

  await field(page, 'openai').pressSequentially(MARKER);
  await field(page, 'serper').fill(SEARCH_MARKER);
  await field(page, 'serper').blur();
  await expect.poll(() => stores(page)).toEqual({
    local: null,
    session: JSON.stringify({ openai: MARKER, serper: SEARCH_MARKER }),
  });
  for (const provider of PROVIDERS) {
    await expect(field(page, provider)).toHaveAttribute('type', 'password');
    await expect(field(page, provider)).toHaveAttribute('autocomplete', 'off');
    await expect(field(page, provider)).toHaveAttribute('data-clarity-mask', 'True');
    await expect(field(page, provider)).toHaveClass(/\bph-no-capture\b/);
  }
  await page.reload();
  await expect(field(page, 'openai')).toHaveValue(MARKER);
  await expect(field(page, 'serper')).toHaveValue(SEARCH_MARKER);
  expect(analytics.length).toBeGreaterThan(0);
  expect(analytics.join('\n')).not.toContain(MARKER);
  expect(analytics.join('\n')).not.toContain(SEARCH_MARKER);
});

test('the first dashboard load moves an old model and search key to tab storage', async ({ page }) => {
  const old = JSON.stringify({ openai: MARKER, tavily: SEARCH_MARKER });
  // Earlier releases also saved the keys inside the last launch, through Run again.
  const oldLaunch = JSON.stringify({ ...settingsBody(mars), apiKey: MARKER, tavilyKey: SEARCH_MARKER });
  await page.addInitScript(({ slot, old, launchSlot, oldLaunch }) => {
    localStorage.setItem(slot, old);
    localStorage.setItem(launchSlot, oldLaunch);
  }, { slot: SLOT, old, launchSlot: LAST_LAUNCH, oldLaunch });
  await page.goto(`${RUN_SERVER}/sim`);
  await expect(page.getByTestId('note-adults')).toBeAttached();
  await expect.poll(() => stores(page)).toEqual({ local: null, session: old });
  expect(await savedLaunch(page)).toEqual(settingsBody(mars));
  await page.getByRole('tab', { name: '设置' }).click();
  await expect(field(page, 'openai')).toHaveValue(MARKER);
  await expect(field(page, 'tavily')).toHaveValue(SEARCH_MARKER);
});

test('Run again sends the tab keys and keeps them out of the launch this device saves', async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route(`${RUN_SERVER}/setup`, async route => {
    bodies.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ redirect: '/sim' }) });
  });
  // A finished run, so the Run again row shows.
  await page.route('**/events', route => route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    body: 'event: connected\ndata: {}\n\nevent: complete\ndata: {}\n\n',
  }));
  await page.goto(`${RUN_SERVER}/sim?tab=settings`);
  await page.getByRole('button', { name: '全部拒绝', exact: true }).click();
  await field(page, 'openai').fill(MARKER);
  await field(page, 'serper').fill(SEARCH_MARKER);
  await page.evaluate(({ launchSlot, launch }) => { localStorage.setItem(launchSlot, launch); },
    { launchSlot: LAST_LAUNCH, launch: JSON.stringify({ ...settingsBody(mars), seed: 7 }) });

  const runAgain = page.getByRole('button', { name: /随机种子加 1 后重新运行/ });
  const watchUrl = `${RUN_SERVER}/sim?tab=sim`;
  await page.goto(watchUrl);
  await expect(runAgain).toBeEnabled();
  // The redirect returns to the same URL. Wait for the new document and
  // the replayed completion event before reading its storage.
  await Promise.all([
    page.waitForEvent('framenavigated', frame => frame === page.mainFrame() && frame.url() === watchUrl),
    runAgain.click(),
  ]);
  await expect(runAgain).toBeEnabled();

  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ seed: 8, apiKey: MARKER, serperKey: SEARCH_MARKER });
  const launch = await savedLaunch(page);
  expect(launch).toMatchObject({ seed: 8 });
  expect(JSON.stringify(launch)).not.toContain(MARKER);
  expect(JSON.stringify(launch)).not.toContain(SEARCH_MARKER);
  expect(await stores(page)).toEqual({
    local: null,
    session: JSON.stringify({ openai: MARKER, serper: SEARCH_MARKER }),
  });

  // Forgotten keys never ride along on the next Run again.
  await page.goto(`${RUN_SERVER}/sim?tab=settings`);
  await keyGroup(page).getByRole('button', { name: '清除我的密钥', exact: true }).click();
  await expect(keyGroup(page).getByRole('status')).toHaveText('密钥已清除，你的当前运行和聊天智能体也已清除。');
  await page.goto(`${RUN_SERVER}/sim?tab=sim`);
  await expect(runAgain).toBeEnabled();
  await runAgain.click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toMatchObject({ seed: 9 });
  expect(JSON.stringify(bodies[1])).not.toContain(MARKER);
  expect(JSON.stringify(bodies[1])).not.toContain(SEARCH_MARKER);
});

test('Forget my keys empties the fields and both stores and drops the held run', async ({ page }) => {
  await page.goto(`${RUN_SERVER}/sim?tab=settings`);
  await page.getByRole('button', { name: '全部拒绝', exact: true }).click();
  await field(page, 'openai').fill(MARKER);
  await field(page, 'serper').fill(SEARCH_MARKER);
  const run = await page.request.post(`${RUN_SERVER}/setup`, {
    data: { ...settingsBody(mars), apiKey: MARKER, serperKey: SEARCH_MARKER },
  });
  expect(run.ok()).toBe(true);
  const { runKey } = await run.json();
  expect(typeof runKey).toBe('string');
  const chat = await page.request.post(`${RUN_SERVER}/chat`, {
    data: { runKey, agentId: 'col-bruno-morales', message: 'What happened?', apiKey: MARKER },
  });
  expect(chat.ok()).toBe(true);
  expect(await chat.json()).toMatchObject({ firstMessage: true });
  await page.evaluate(({ slot, marker }) => { localStorage.setItem(slot, JSON.stringify({ openai: marker })); },
    { slot: SLOT, marker: MARKER });

  let forgotten: { status: number; body: unknown } | undefined;
  await page.route(`${RUN_SERVER}/forget-keys`, async route => {
    // Forward the real click's request and read the full server response
    // before the page processes the cleanup and refreshes its live stream.
    const answer = await route.fetch();
    forgotten = { status: answer.status(), body: await answer.json() };
    await route.fulfill({ response: answer });
  });
  await keyGroup(page).getByRole('button', { name: '清除我的密钥', exact: true }).click();
  await expect.poll(() => forgotten).toEqual({
    status: 200, body: { runConfigsDropped: 1, chatAgentsDropped: 1 },
  });
  await expect(keyGroup(page).getByRole('status')).toHaveText('密钥已清除，你的当前运行和聊天智能体也已清除。');
  for (const provider of PROVIDERS) await expect(field(page, provider)).toHaveValue('');
  expect(await stores(page)).toEqual({ local: null, session: null });
  const results = await page.request.get(`${RUN_SERVER}/results`);
  expect((await results.json()).runKey).toBeNull();
});

test('Settings, Terms, Privacy, the start path, footer and share help show the agreed words', async ({ page }) => {
  await page.goto(`${RUN_SERVER}/sim?tab=settings`);
  const lines = keyGroup(page).locator('[data-testid="visitor-key-notes"] p');
  await expect(lines).toHaveText([
    '使用自己的密钥运行时，费用按你与 OpenAI 或 Anthropic 的协议计入你的账户。',
    "每次启动运行或聊天时，密钥都会发送到服务器。使用期间仅保留在内存中，停止后最多保留 30 分钟，且始终不会写入磁盘或日志。",
    '当前浏览器标签页会保留密钥，直到标签页关闭。点击“清除我的密钥”可立即清除。',
    '请使用单独设置了支出上限的密钥，用完后在服务商处删除。',
    '也可以在自己的电脑上运行 Paracosm，这样密钥只会留在你的电脑上。',
  ]);
  await expect(lines.getByRole('link')).toHaveAttribute('href', '/#get-started');

  await page.goto(`${RUN_SERVER}/sim`);
  await expect(page.getByTestId('note-adults')).toHaveText(AGE);
  await expect(page.getByTestId('foot-adults')).toHaveText(AGE);

  await page.goto(`${RUN_SERVER}/#about`);
  await expect(page.locator('#about').getByText(TEACHERS, { exact: true })).toBeAttached();
  await expect(page.locator('#terms').getByText(TERMS, { exact: true })).toBeAttached();
  await expect(page.locator('#privacy').getByText(PRIVACY, { exact: true })).toBeAttached();
  await expect(page.locator('#privacy').getByText(CHILDREN, { exact: true })).toBeAttached();

  const chats: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/chat') chats.push(request.url());
  });
  await openShareNote(page);
  const note = page.getByRole('status', { name: '分享链接' });
  await expect(note.getByText(TEACHERS, { exact: true })).toBeVisible();

  await note.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('tab', { name: '聊天', exact: true }).click();
  await expect(page.getByText('开始自己的运行后，即可与其中的角色聊天。', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Agent chat', exact: true })).toHaveCount(0);
  expect(chats).toEqual([]);
});

async function openShareNote(page: Page) {
  const response = await page.request.get(`${REPLAY_SERVER}/sessions`);
  const { sessions } = await response.json() as { sessions: { id: string }[] };
  expect(sessions).toHaveLength(1);
  await page.goto(`${REPLAY_SERVER}/sim?replay=${encodeURIComponent(sessions[0].id)}&tab=sim`);
  await expect(page.getByRole('status').filter({ hasText: /^正在回放/i })).toBeVisible();
  await page.getByRole('button', { name: '打开运行操作菜单' }).click();
  await page.getByRole('menuitem', { name: /分享可视化链接/ }).click();
}
