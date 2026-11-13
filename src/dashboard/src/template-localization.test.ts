import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { departmentLabel, displayLabel, localizeTemplate, roleLabel, metricLabel } from './template-localization.js';
import { deriveLabels, localizeScenarioLabels } from './hooks/useScenarioLabels.helpers.js';

test('all seven repository scenarios ship Chinese role instructions and visible metric labels', () => {
  const files = ['atlas-lab', 'corporate-quarterly', 'dual-superintelligence-council', 'lunar', 'mars', 'submarine', 't2d-glp1-protocol'];
  let count = 0;
  for (const file of files) {
    const scenario = JSON.parse(readFileSync(new URL(`../../../scenarios/${file}.json`, import.meta.url), 'utf8'));
    const roles = [...scenario.departments, ...scenario.presets.flatMap((p: { leaders?: unknown[] }) => p.leaders ?? [])];
    assert.equal(roles.length, 7, file);
    for (const role of roles) {
      assert.match(role.instructions, /[\u4e00-\u9fff]/, `${file}: ${role.role ?? role.name}`);
      assert.doesNotMatch(role.instructions, /You (are|speak|chair|direct)/, file);
      count++;
    }
    for (const metric of scenario.metrics) assert.match(metric.label, /[\u4e00-\u9fff]/, `${file}: ${metric.id}`);
    const hooks = scenario.dataDrivenHooks ?? {};
    if (hooks.directorInstructions) assert.match(hooks.directorInstructions, /[\u4e00-\u9fff]/, `${file}: director`);
    if (typeof hooks.reactionTemplate === 'string') {
      assert.match(hooks.reactionTemplate, /[\u4e00-\u9fff]/, `${file}: reactions`);
      assert.ok(hooks.reactionTemplate.includes('{{role}}'));
      assert.ok(hooks.reactionTemplate.includes('{{department}}'));
    }
    for (const milestone of hooks.milestones ?? []) {
      assert.match(milestone.event.title, /[\u4e00-\u9fff]/);
      assert.match(milestone.event.crisis, /[\u4e00-\u9fff]/);
      assert.ok(milestone.event.options.some((option: { id: string }) => option.id === milestone.event.riskyOptionId));
    }
  }
  assert.equal(count, 49);
});

test('cached instructions from other scenarios resolve to their Chinese shipped defaults', () => {
  const lunar = JSON.parse(readFileSync(new URL('../../../scenarios/lunar.json', import.meta.url), 'utf8'));
  const legacy = 'You are Commander Sarah Lindgren, "The Pioneer." You balance ambition with crew safety. You push boundaries but respect engineering limits. You communicate openly. Your HEXACO profile drives your leadership style.';
  assert.equal(localizeTemplate(legacy), lunar.presets[0].leaders[0].instructions);
  const legacyDepartment = 'You are the VP of Sales. You analyze pipeline coverage, ACV trends, close rates, sales cycle length, and territory productivity. You argue for commission structure and GTM bets that move bookings this quarter while protecting next-quarter pipeline.';
  const corporate = JSON.parse(readFileSync(new URL('../../../scenarios/corporate-quarterly.json', import.meta.url), 'utf8'));
  assert.equal(localizeTemplate(legacyDepartment), corporate.departments[0].instructions);
});

test('Mars department and commander instructions ship in Chinese, including cached preset compatibility', () => {
  const mars = JSON.parse(readFileSync(new URL('../../../scenarios/mars.json', import.meta.url), 'utf8'));
  const leaders = mars.presets.find((p: { id: string }) => p.id === 'default').leaders;
  const roles = [...mars.departments, ...leaders];
  assert.equal(roles.length, 7);
  for (const role of roles) {
    assert.match(role.instructions, /^你是/);
    assert.match(role.instructions, /简体中文/);
    assert.doesNotMatch(role.instructions, /You are/);
  }
  const cachedInstructions = 'You are Aria Chen, "The Visionary." You lead by inspiration. You value openness to experience and bold experimentation. You tolerate mess if it leads to breakthroughs. You spin setbacks as learning opportunities. You rally people with charisma. Your HEXACO profile drives your leadership style.';
  assert.equal(localizeTemplate(cachedInstructions), leaders[0].instructions);
  assert.equal(localizeTemplate('A custom user instruction'), 'A custom user instruction');
});

test('template localization preserves protocol identifiers and does not mutate its source', () => {
  const source = {
    id: 'atlas-lab',
    labels: { name: 'Atlas Lab', timeUnitNoun: 'month' },
    departments: [{ id: 'engineering', label: 'Engineering' }],
  };
  const result = localizeTemplate(source);
  assert.equal(result.id, 'atlas-lab');
  assert.equal(result.labels.name, '阿特拉斯实验室');
  assert.equal(result.labels.timeUnitNoun, 'month');
  assert.equal(result.departments[0].id, 'engineering');
  assert.equal(result.departments[0].label, '工程部');
  assert.equal(source.labels.name, 'Atlas Lab');
});

test('display names cover department identifiers and mood enums, retaining custom labels', () => {
  assert.equal(departmentLabel('engineering'), '工程部');
  assert.equal(displayLabel('focused'), '专注');
  assert.equal(displayLabel('anxious'), '焦虑');
  assert.equal(displayLabel('自定义部门'), '自定义部门');
  assert.equal(displayLabel('custom-department'), 'custom-department');
});

test('scenario display units are Chinese without changing the engine time unit', () => {
  const source = { labels: { populationNoun: 'researchers', settlementNoun: 'lab', timeUnitNoun: 'month' } };
  const labels = localizeScenarioLabels(deriveLabels(source));
  assert.equal(labels.person, '研究员');
  assert.equal(labels.People, '研究员');
  assert.equal(labels.Place, '实验室');
  assert.equal(labels.time, '月');
  assert.equal(labels.Times, '月');
  assert.equal(source.labels.timeUnitNoun, 'month');
});


test('generated roster labels are Chinese without changing custom roles or stored identifiers', () => {
  assert.equal(roleLabel('Junior Astrophysics Specialist'), '初级天体物理专家');
  assert.equal(roleLabel('Senior Life Support Specialist'), '高级生命保障专家');
  assert.equal(roleLabel('Lead Clinical Psychology Specialist'), '首席临床心理专家');
  assert.equal(roleLabel('Junior 综合事务 Specialist'), '初级综合事务专家');
  assert.equal(roleLabel('Custom Research Fellow'), 'Custom Research Fellow');
  assert.equal(roleLabel('Junior Custom Trade Specialist'), 'Junior Custom Trade Specialist');
  assert.equal(departmentLabel('science'), '科研部');
  assert.equal(departmentLabel('administration'), '行政部');
  assert.equal(displayLabel('defiant'), '抗拒');
  assert.equal(displayLabel('technological'), '技术');
  assert.equal(metricLabel('foodMonthsReserve'), '食物储备（月）');
  assert.equal(metricLabel('customMetric'), 'customMetric');
});
