import { readFileSync } from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { ARIA, pairRunFrames } from '../support/pair-run.js';
import { framesToSimEvents } from '../support/run-frames.js';

const scenario = JSON.parse(readFileSync(new URL('../../scenarios/mars.json', import.meta.url), 'utf8'));
const draft = JSON.parse(readFileSync(new URL('../../scenarios/submarine.json', import.meta.url), 'utf8'));
const citation = { text: scenario.labels.name, url: scenario.sourceUrl };
const events = framesToSimEvents(pairRunFrames()).map(event =>
  event.type === 'specialist_done' && event.leader === ARIA.name
    && event.data?.department === 'engineering' && event.data.turn === 1
    ? { ...event, data: { ...event.data, citations: 1, citationList: [citation] } }
    : event,
);
const savedRun = {
  schemaVersion: 3,
  scenario: { id: scenario.id, version: scenario.version, shortName: scenario.labels.shortName },
  events,
  results: [],
  verdict: null,
};

async function loadSavedRun(page: Page) {
  await page.goto('/sim?tab=sim');
  await expect(page.getByRole('status', { name: /^已连接\./ }).first()).toBeVisible();
  await page.getByRole('button', { name: '运行', exact: true }).click();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('menuitem', { name: /从文件加载/ }).click(),
  ]);
  await chooser.setFiles({
    name: 'saved-run.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(savedRun)),
  });
  const preview = page.getByRole('dialog', { name: '加载仿真' });
  await preview.getByRole('button', { name: /^(Load|仍然加载|替换当前仿真)$/ }).click();
  await expect(preview).toBeHidden();
}

/** Observe the native anchor click while allowing the browser to download the file. */
async function downloadJsonFrom(page: Page, button: Locator, filename: string) {
  const lifecycle = await page.evaluateHandle(() => {
    const state = { attachedAtClick: false, revokedAfterClick: null as boolean | null };
    const click = HTMLAnchorElement.prototype.click;
    const revoke = URL.revokeObjectURL;
    const revoked = new Set<string>();
    URL.revokeObjectURL = (url) => {
      revoked.add(url);
      revoke.call(URL, url);
    };
    HTMLAnchorElement.prototype.click = function () {
      if (!this.download) {
        click.call(this);
        return;
      }
      const url = this.href;
      state.attachedAtClick = this.isConnected;
      HTMLAnchorElement.prototype.click = click;
      queueMicrotask(() => {
        state.revokedAfterClick = revoked.has(url);
        URL.revokeObjectURL = revoke;
      });
      click.call(this);
    };
    return state;
  });

  try {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await button.click();
        expect(await lifecycle.jsonValue(), 'the anchor is attached at click and its blob URL survives the handler')
          .toEqual({ attachedAtClick: true, revokedAfterClick: false });
      })(),
    ]);
    expect(download.suggestedFilename()).toBe(filename);
    return JSON.parse(readFileSync(await download.path(), 'utf8'));
  } finally {
    await lifecycle.dispose();
  }
}

test('Scenario Editor downloads the imported scenario through an attached link', async ({ page }) => {
  await page.goto('/sim?tab=settings');
  const editor = page.getByRole('textbox', { name: '场景 JSON 编辑器' });
  await expect(editor).toHaveValue(/"id"/);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: '导入 JSON 文件' }).click(),
  ]);
  await chooser.setFiles({
    name: 'submarine.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(draft)),
  });
  await expect(editor).toHaveValue(JSON.stringify(draft));

  const filename = `${draft.id}.json`;
  const data = await downloadJsonFrom(page, page.getByRole('button', { name: '导出 JSON 文件' }), filename);
  expect(data).toEqual(draft);
  await expect(page.getByText(`Exported ${filename}`, { exact: true })).toBeVisible();
});

test('References downloads the cited source through an attached link', async ({ page }) => {
  await loadSavedRun(page);
  await page.getByRole('button', { name: '打开参考资料（1 条来源）' }).click();
  const dialog = page.getByRole('dialog', { name: '参考资料 · 1' });
  const data = await downloadJsonFrom(page, dialog.getByRole('button', { name: '导出 JSON', exact: true }), 'paracosm-references.json');
  expect(data).toEqual([{
    ...citation,
    n: 1,
    departments: ['engineering'],
    actorNames: [ARIA.name],
  }]);
});

test('Save downloads the simulation through an attached link', async ({ page }) => {
  await loadSavedRun(page);
  await page.getByRole('button', { name: '打开运行操作菜单' }).click();
  const filename = `${savedRun.scenario.shortName}-${events.length}events.json`;
  const data = await downloadJsonFrom(page, page.getByRole('menuitem', { name: '保存', exact: true }), filename);
  const isoTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  expect(data).toEqual({
    ...savedRun,
    config: null,
    startedAt: expect.stringMatching(isoTime),
    completedAt: expect.stringMatching(isoTime),
  });
});

test('Toolbox shows its error when the browser cannot create the download URL', async ({ page }) => {
  await loadSavedRun(page);
  await page.getByRole('button', { name: /^打开动态工具箱/ }).click();
  const toolbox = page.getByRole('dialog', { name: /^动态工具箱，/ });
  await page.evaluate(() => {
    URL.createObjectURL = () => { throw new Error('Could not create the download URL'); };
  });
  await toolbox.getByRole('button', { name: '导出 JSON', exact: true }).click();
  await expect(toolbox.getByText('导出失败，请重试。', { exact: true }).filter({ visible: true })).toBeVisible();
});
