/**
 * The How it works card's six lines: the fourth names the run's turns and
 * the scenario's word for a settlement, or neither until the scenario has
 * loaded, and the sixth says how many leaders run at a time only when that
 * figure is given.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAWING_ALT, howItWorksLines } from '../../../src/dashboard/src/components/quickstart/first-screen/words.js';

/** A line as it reads, its no-break spaces as plain ones. */
const plain = (line: string): string => line.replace(/ /g, ' ');

test('the fourth line names the run’s turns and the scenario’s settlement', () => {
  const lines = howItWorksLines({ turns: 8, settlement: 'outpost' });
  assert.equal(lines.length, 6);
  assert.equal(plain(lines[3]), '第 8 回合结束后，结论会给出胜负或平局及理由，并为各个outpost的生存、繁荣、士气和创新分别打 0 至 10 分。');
  // The turn number stays with its word, and the score range on one line.
  assert.ok(lines[3].includes('第 8 回合'));
  assert.ok(lines[3].includes('0 至 10'));
});

test('before the scenario has loaded the fourth line names neither', () => {
  const expected = '最后一个回合结束后，结论会给出胜负或平局及理由，并为各个一方的生存、繁荣、士气和创新分别打 0 至 10 分。';
  assert.equal(plain(howItWorksLines()[3]), expected);
  // A settlement word that is blank reads as none.
  assert.equal(plain(howItWorksLines({ settlement: '  ' })[3]), expected);
  // A scenario's word is written in lower case, inside the sentence.
  assert.ok(plain(howItWorksLines({ turns: 6, settlement: 'Colony' })[3]).includes('各个colony的生存'));
});

test('the sixth line says how many run at a time only when the figure is given', () => {
  assert.equal(
    plain(howItWorksLines({ turns: 6, settlement: 'colony' })[5]),
    '有 3 位及以上决策者时，每位独立运行场景。报告会按士气、人口和死亡人数分四档排名。',
  );
  assert.equal(
    plain(howItWorksLines({ turns: 6, settlement: 'colony', batch: 8 })[5]),
    '有 3 位及以上决策者时，每位独立运行场景，每批并行 8 位。报告会按士气、人口和死亡人数分四档排名。',
  );
});

test('each drawing’s text alternative says the sample turn’s own figures', () => {
  assert.equal(DRAWING_ALT.bar, '回合示例：成功概率 80，达到阈值 36');
  assert.equal(DRAWING_ALT.stamp, '本回合结果：冒险成功，冒险选项取得成功');
  assert.equal(DRAWING_ALT.scores, '四项示例评分，满分 10 分：生存 7、繁荣 6、士气 8、创新 5');
});
