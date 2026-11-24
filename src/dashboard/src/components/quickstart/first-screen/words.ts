/**
 * Every word the Run tab's first screen shows, as constants and as
 * functions that fill in the run's figures. A number never breaks from its
 * unit: a no-break space (U+00A0) stands between them. Quotes and
 * apostrophes are curly, and an ellipsis is the one character.
 *
 * @module paracosm/dashboard/quickstart/first-screen/words
 */

/** A no-break space: a number and its unit stay on one line. */
export const NBSP = '\u00a0';

/** The page's title, as the browser's tab shows it. */
export const PAGE_TITLE = '观看 AI 决策者运行同一场景 | Paracosm';

/** The page's description, in the same words as its title. */
export const PAGE_DESCRIPTION = '阅读每位 AI 决策者的指令和完整提示词，并排比较，再观看 2 至 300 位决策者逐回合运行同一场景。';

/** The short capital mark over the scenario's name. */
export const SCENARIO_MARK = '场景';

/** The place a scenario that names none is said to be. */
export const FALLBACK_PLACE = '此场景';

/** A count and its unit, kept together: "6 turns", "1 turn". */
export function countOf(n: number, one: string, many: string): string {
  return `${n}${NBSP}${n === 1 ? one : many}`;
}

/**
 * The three sentences under the scenario's name: what the AI leaders do,
 * what Start does and what ends the run, written for the run's size. A pair
 * ends in a verdict; 3 to 300 leaders end in a report that ranks them. While
 * no free run is left and Start is replaced, the middle sentence, which
 * names Start, is left out. The last two words stay on one line, so the
 * paragraph never ends on a single word.
 */
export function scenarioSentences(o: { n: number; turns: number; place?: string; atLimit: boolean }): string {
  const place = o.place?.trim() || FALLBACK_PLACE;
  const leaders = o.n <= 2 ? '两位 AI 决策者' : `${o.n}${NBSP}位 AI 决策者`;
  const first = `${leaders}各自遵循自己的指令，在${place}中运行${countOf(o.turns, '回合', '回合')}。`;
  const press = '点击开始，观看他们如何决策。';
  const end = o.n <= 2
    ? '结束时将公布胜负及理由。'
    : '结束时将按士气、人口和死亡人数给出排名。';
  return o.atLimit ? `${first} ${end}` : `${first} ${press} ${end}`;
}

/** Said beside the broken-link mark while the page asks for the scenario again. */
export const scenarioError = '场景加载失败，正在重试。';

/** Said beside the broken-link mark while the page is offline. */
export const scenarioOffline = '当前处于离线状态，恢复网络后将加载场景。';

/** The key that asks for the scenario at once. */
export const tryNow = '立即重试';

/** The same key while it asks. */
export const trying = '正在重试…';

/** The placeholder name the loading shape is drawn over; never shown. */
export const LOADING_NAME = '场景名称';

/* The leaders (a pair). */

/** A leader's place figure as a screen reader says it: "Leader 1". */
export const placeSpoken = (place: number): string => `决策者 ${place}`;

/** The name a leader's card takes while the scenario writes no leaders: "Leader 1". */
export const unnamedLeader = (place: number): string => `决策者 ${place}`;

/**
 * A switch key's spoken name. It holds the words the key shows, the place
 * figure and the name, so a person who says what they see is understood:
 * "Show leader 1 Aria Chen". A leader named by its place alone, whose key
 * shows no separate figure: "Show Leader 1".
 */
export const showLeader = (name: string, place?: number): string =>
  (place === undefined ? `显示${name}` : `显示决策者 ${place} ${name}`);

/** The spoken name of the two leaders' part of the screen. */
export const LEADERS_SPOKEN = '决策者';

/** The short capital mark over a leader's six scores. */
export const SCORES_MARK = '人格评分';

/** The short capital mark over a leader's written orders. */
export const ORDERS_MARK = '决策指令';

/** The six scores' names, in the order every block of scores draws them. */
export const TRAIT_NAMES = {
  openness: '开放性',
  conscientiousness: '尽责性',
  extraversion: '外向性',
  agreeableness: '宜人性',
  emotionality: '情绪性',
  honestyHumility: '诚实－谦逊',
} as const;

/** The quiet line over each block of six scores: what the two ticks on a bar mark. */
export const MIDDLE_BAND = `中间区间 0.35${NBSP}至${NBSP}0.65`;

/** The note under a leader's orders. */
export const HEXACO_NOTE = 'HEXACO 是六维人格模型。上方是这位决策者的各项评分。';

/** Said on each card of a scenario that writes no leaders. */
export const NO_WRITTEN_LEADERS = '此场景暂无预设决策者。点击开始后，Paracosm 会为你生成。';

/** The placeholder words the loading shapes of a leader's card are drawn over; never shown. */
export const LOADING_LEADER = {
  name: '决策者姓名',
  title: '决策者职务',
  orders: '你是本次运行的决策者。按照你的原则权衡每一个选项。局势不利时，也要坚持你的行事方式、如实判断并带领成员行动。六项人格评分会影响你的每次决策。',
} as const;

/* The shared colony panel (before Start). */

/** The panel's header mark, in the grid's own type. */
export const TURN_ZERO_MARK = '第 0 回合';

/**
 * The panel's figures: "5 key people". The panel states no count of
 * departments: the scenario line's figures state the departments the run
 * uses, and that is the one count of them on the screen.
 */
export function colonyFigures(o: { keyPeople: number }): string {
  return countOf(o.keyPeople, '位重点成员', '位重点成员');
}

/**
 * The panel's caption: every colony starts from the same people, the key
 * people among them. A pair says "Both colonies"; 3 to 300 leaders say how
 * many colonies.
 */
export function colonyCaption(o: { leaders: number; population: number; keyPeople: number }): string {
  const colonies = o.leaders <= 2 ? '两侧' : `所有 ${o.leaders} 组`;
  const among = countOf(o.keyPeople, '位重点成员', '位重点成员');
  return `${colonies}从相同的 ${countOf(o.population, '位成员', '位成员')}开始，其中有 ${among}。决策者的选择会让各组逐渐分化。`;
}

/** The panel's spoken name, the text alternative of its drawing. */
export function colonySpoken(o: { population: number; keyPeople: number }): string {
  const people = `${o.population} 位成员`;
  return `第 0 回合：${people}中有 ${o.keyPeople} 位重点成员，所有决策者的初始状态相同`;
}

/** Said in the panel's frame when the scenario names no key people. */
export const NO_KEY_PEOPLE = '此场景没有指定重点成员。群体网格将在运行开始后绘制。';

/** The key line under the field: each word beside its glyph. */
export const COLONY_KEY = { department: '部门', person: '成员', featured: '重点成员' } as const;

/* The run's size. */

/** The short capital mark over the leaders, beside the run's size. */
export const LEADERS_MARK = '决策者';

/** The run's size in words: "2 leaders". */
export const leadersCount = (n: number): string => countOf(n, '位决策者', '位决策者');

/** Said under the size of a run on the host's keys. */
export const freeSizeLine = (o: { free: number; max: number }): string =>
  `免费运行包含 ${leadersCount(o.free)}。使用自己的 API 密钥可运行最多 ${o.max} 位决策者。`;

/** The spoken name of the field that holds the size. */
export const NUMBER_OF_LEADERS = '决策者人数';

/** The spoken names of the two keys beside the field. */
export const FEWER_LEADERS = '减少决策者';
export const MORE_LEADERS = '增加决策者';

/** Said while a typed size is out of range or not a whole number. */
export const chooseSize = (o: { min: number; max: number }): string => `请选择 ${o.min} 至 ${o.max} 位决策者。`;

/** Said beside the fewer key at the fewest leaders a run takes. */
export const fewestLine = (min: number): string => `每次运行至少需要 ${min} 位决策者。`;

/** Said beside the more key at the most leaders a run takes. */
export const mostLine = (max: number): string => `每次运行最多支持 ${max} 位决策者。`;

/** Said under the size when the server's settings did not load. */
export const SETTINGS_NOT_READ = '无法读取服务器设置。点击开始时，服务器会检查决策者人数。';

/** Said over the two written leaders of a run of 3 or more. */
export const writesAllLeaders = (n: number): string =>
  `开始运行时，Paracosm 会根据该场景生成全部 ${n} 位决策者，替换此处的两位。`;

/* Start, its run line and its notice. */

/** Who pays for a run: the host's keys, the visitor's own key, or the server it runs on. */
type WhoPays = 'host' | 'own' | 'server';

/** The first line of the Start key; set in capitals by its style. */
export const START = '开始';

/** Half minutes as a figure: 3.5 reads "3½", 4 reads "4", 0.5 reads "½". */
export function minutesFigure(minutes: number): string {
  const whole = Math.floor(minutes);
  const half = minutes - whole >= 0.5;
  if (whole === 0) return half ? '½' : '0';
  return half ? `${whole}½` : String(whole);
}

/** Half minutes as a screen reader says them, with their unit: "3 and a half minutes", "4 minutes", "half a minute". */
export function minutesSpoken(minutes: number): string {
  const whole = Math.floor(minutes);
  const half = minutes - whole >= 0.5;
  if (whole === 0) return half ? '半分钟' : '0 分钟';
  if (half) return `${whole} 分半钟`;
  return `${whole} 分钟`;
}

/** Whose keys a run is on, as Start's second line ends. */
const onWhoseKeys = (who: 'own' | 'server'): string => (who === 'own' ? '使用你的 API 密钥' : '使用服务器的 API 密钥');

/**
 * Start's second line: the run's length, and from 3 leaders its size. A run
 * on the host's keys says about how long it takes; a run on the visitor's
 * key or a self-hosted server, which has not been timed, says whose keys.
 */
export function startSecondLine(o: { who: WhoPays; size: number; turns: number; minutes: number }): string {
  const turns = countOf(o.turns, '回合', '回合');
  if (o.who === 'host') {
    const unit = '分钟';
    return `${turns}，约 ${minutesFigure(o.minutes)}${NBSP}${unit}`;
  }
  const leaders = o.size > 2 ? `${leadersCount(o.size)}，` : '';
  return `${leaders}${turns}，${onWhoseKeys(o.who)}`;
}

/** Start's spoken name: "Start Mars Genesis: 6 turns, about 3 and a half minutes". Plain spaces, as a name is matched. */
export function startSpoken(o: { scenario: string; who: WhoPays; size: number; turns: number; minutes: number }): string {
  const turns = `${o.turns} 回合`;
  if (o.who === 'host') return `${START} ${o.scenario}：${turns}，约 ${minutesSpoken(o.minutes)}`;
  const leaders = o.size > 2 ? `${o.size} 位决策者，` : '';
  return `${START} ${o.scenario}：${leaders}${turns}，${onWhoseKeys(o.who)}`;
}

/** The key while the day's count is read, and while nothing is known yet. */
export const CHECKING_FREE_RUNS = '正在查询免费次数…';

/** The key from the press until the page opens the run. */
export const STARTING = '正在开始…';

/** The key while Paracosm writes the run's leaders. */
export const writingLeaders = (k: number): string => `正在生成 ${leadersCount(k)}…`;

/** The key while the page is offline, and the words beside it. */
export const YOU_ARE_OFFLINE = '当前处于离线状态';
export const START_WHEN_ONLINE = '恢复网络后可以开始。';

/** Said above Start when a run did not start and the page knows no nearer cause. */
export const RUN_DID_NOT_START = '运行未能开始，请再次点击开始。';

/** The run line's last word: a pair ends in a verdict, 3 to 300 leaders in a report. */
export const RUN_END = { verdict: '结论', report: '报告' } as const;

/** The notice's first sentence before a run on the host's keys. */
export const NOTICE_FREE = '本次运行免费，费用由演示站承担。';

/** The first sentence of the note that says what the leaders are. */
export const AI_AGENTS = '决策者是 AI 智能体。';

/**
 * The day's count of free runs for this internet address, with the time
 * they reset when the server gave one. The clock time stays on one line.
 */
export function noticeCount(o: { remaining: number; limit: number; resetTime?: string }): string {
  const reset = o.resetTime ? ` 免费次数将在 ${o.resetTime.replace(/ /g, NBSP)} 重置。` : '';
  return `此 IP 地址今天还剩 ${o.remaining} 次免费运行，共 ${o.limit} 次，由使用该地址的访客共享。${reset}新运行或创建分支会消耗一次。`;
}

/** The count when it could not be read. */
export const NOTICE_COUNT_UNAVAILABLE = '暂时无法查询今日剩余免费次数。';

/** What comes after the day's free runs; the replay clause shows only while the saved-run list holds a run. */
export const noticeAfter = (hasSavedRun: boolean): string => (hasSavedRun
  ? '免费次数用完后，你可以免费回放已有运行，或在设置中添加自己的 API 密钥继续运行。模型服务商会向你计费。'
  : '免费次数用完后，可在设置中添加自己的 API 密钥继续运行。模型服务商会向你计费。');

/** The first sentence of the notice before a run on the visitor's own key; the provider is named when the saved key tells which. */
export const ownKeyPays = (provider?: string): string =>
  `本次运行使用你的 ${provider ? `${provider} ` : ''}API 密钥，由模型服务商向你计费。`;

/** The notice before a run on the visitor's own key. */
export const noticeOwnKey = (provider?: string): string =>
  `${ownKeyPays(provider)} 使用自己的密钥不消耗免费次数，也不受演示版规模限制。`;

/** The notice on a server that is not the hosted demo. */
export const NOTICE_SERVER = '本次运行使用服务器的 API 密钥。';

/**
 * The estimate of what a run of 3 or more leaders costs, and what it rests
 * on. On the visitor's key it names the provider and models they saved,
 * where they saved both.
 */
export function estimateLine(o: { who: 'own' | 'server'; usd: string; provider?: string; models?: string }): string {
  if (o.who === 'server') {
    return `预计使用服务器密钥的费用约为 ${o.usd}${NBSP}美元，按托管演示经济模型的四次双人运行均值估算。实际费用取决于服务器使用的模型。`;
  }
  const uses = o.provider && o.models ? ` 本次运行使用设置中的 ${o.provider}（${o.models}），实际费用按所用模型计费。` : '';
  return `预计使用你的密钥的费用约为 ${o.usd}${NBSP}美元，按演示版经济模型的四次双人运行均值估算。${uses}`;
}

/** Said in Start's place while this internet address has no free run left today. */
export const atLimitReset = (resetTime?: string): string => (resetTime
  ? `此 IP 地址今天的免费次数已用完，将于 ${resetTime.replace(/ /g, NBSP)} 重置。`
  : '此 IP 地址今天的免费次数已用完。');

/** The second paragraph at the limit; its first sentence shows only while the saved-run list holds a run. */
export const atLimitAfter = (hasSavedRun: boolean): string =>
  `${hasSavedRun ? '你可以免费回放已保存的运行。' : ''}要立即开始新运行，请在设置中添加自己的 API 密钥。模型服务商会向你计费，运行规模不受演示版限制。`;

/** The filled key in Start's place, and the link beside Start, that replays the visitor's own last run. */
export const WATCH_LAST_RUN = '回放上次运行';

/** The filled key in Start's place that replays the team's run, when this browser has none of its own. */
export const WATCH_TEAM_RUN = '观看团队的示例运行';

/** The team's run key's second line: its scenario and turn count, each written only when the run names it. */
export function teamRunLine(o: { scenario?: string; turns?: number }): string {
  const turns = o.turns === undefined ? '' : countOf(o.turns, '回合', '回合');
  return [o.scenario, turns].filter(Boolean).join(', ');
}

/** The team's run key's spoken name: "Watch our team’s run: Mars Genesis, 6 turns". Plain spaces, as a name is matched. */
export function teamRunSpoken(o: { scenario?: string; turns?: number }): string {
  const turns = o.turns === undefined ? '' : `${o.turns} 回合`;
  const about = [o.scenario, turns].filter(Boolean).join(', ');
  return about ? `${WATCH_TEAM_RUN}: ${about}` : WATCH_TEAM_RUN;
}

/** The link under the key at the limit, to Settings' API key field. */
export const ADD_KEY_IN_SETTINGS = '在设置中添加 API 密钥';

/** Said above Start when the request did not reach the server. */
export const COULD_NOT_REACH = '无法连接服务器。请检查网络连接并再次点击开始。';

/** Said above Start when the server answered that it is busy. */
export const SERVER_BUSY = '服务器正忙，请稍后重新开始。';

/** Said above Start when every run slot on the server is in use. */
export const SLOTS_IN_USE = '服务器运行名额已满，请稍后重新开始。';

/** Said at the limit, in the replay key's place, when the saved-run list did not load. */
export const SAVED_RUNS_NOT_LOADED = '未能加载已保存的运行。';

/** The key beside it that asks for the list again. */
export const TRY_AGAIN = '重试';

/* How it works: the one card the header's key opens. */

/** The card's title, and the name of the header's key that opens it. */
export const HOW_IT_WORKS = '工作原理';

/** The card's key that closes it. */
export const CLOSE = '关闭';

/**
 * The card's six lines: the rules of a run. The fourth names the run's
 * turns and the scenario's word for a settlement; until the scenario has
 * loaded it reads "After the last turn" and "each side". The sixth says how
 * many leaders run at a time only where the server has said so: a figure it
 * has not sent is left out.
 */
export function howItWorksLines(o: { turns?: number; settlement?: string; batch?: number } = {}): string[] {
  const after = o.turns === undefined ? '最后一个回合结束后' : `第${NBSP}${o.turns}${NBSP}回合结束后`;
  const settlement = o.settlement?.trim().toLowerCase() || '一方';
  const atATime = o.batch === undefined ? '' : `，每批并行 ${o.batch} 位`;
  return [
    '每位决策者依据卡片上的指令行动。点击“查看完整提示词”可阅读模型收到的全部内容。',
    '每个回合中，AI 决策者阅读事件和部门报告，在冒险选项与稳妥选项间作出选择并给出理由。冒险选项的成功概率达到人格设定的阈值时，决策者会选择它。只有在赔率遗漏重要事实时才会例外，并说明该事实。',
    '“冒险”或“稳妥”表示所选方案，“成功”或“失败”表示结果。',
    `${after}，结论会给出胜负或平局及理由，并为各个${settlement}的生存、繁荣、士气和创新分别打 0${NBSP}至${NBSP}10 分。`,
    '有两位决策者时，可自行选择你认为获胜的一方，选择不会改变仿真。',
    `有 3 位及以上决策者时，每位独立运行场景${atATime}。报告会按士气、人口和死亡人数分四档排名。`,
  ];
}

/** The mark over each of the card's three drawings: together they show one sample turn. */
export const SAMPLE_TURN = '回合示例';

/** The sample turn's figures: the leader's bar, and the bold option's chance, which reaches it. */
export const SAMPLE_BAR = 36;
export const SAMPLE_CHANCE = 80;

/** The words on the first drawing. */
export const sampleBar = `阈值${NBSP}${SAMPLE_BAR}`;
export const sampleChance = `概率${NBSP}${SAMPLE_CHANCE}`;

/** The stamp the sample turn earns, as the run screen prints it. */
export const SAMPLE_STAMP = '冒险成功';

/** The sample turn's four scores out of 10, in the order a verdict gives them. */
export const SAMPLE_SCORES = [
  ['生存', 7],
  ['繁荣', 6],
  ['士气', 8],
  ['创新', 5],
] as const;

/** What each drawing says to a screen reader, in the order of their lines. */
export const DRAWING_ALT = {
  bar: `回合示例：成功概率 ${SAMPLE_CHANCE}，达到阈值 ${SAMPLE_BAR}`,
  stamp: `本回合结果：${SAMPLE_STAMP}，冒险选项取得成功`,
  scores: `四项示例评分，满分 10 分：${SAMPLE_SCORES.map(([name, value]) => `${name} ${value}`).join('、')}`,
} as const;

/* Other scenarios: one list of the server's scenarios under Start. */

/** The list's heading. */
export const OTHER_SCENARIOS = '其他场景';

/** The heading over the scenarios compiled or stored in this browser, after the bundled ones. */
export const YOURS = '你的场景';

/** The row of the scenario the first screen shows. */
export const ON_SCREEN_NOW = '当前场景';

/** The key that opens the rows past the first ones, with how many scenarios a press can load. */
export const showAll = (count: number): string => `显示全部 ${count} 个场景`;

/** The same key once every row is open. */
export const SHOW_FEWER = '收起';

/** A row's spoken name: what a press of it does. */
export const loadScenario = (name: string): string => `加载“${name}”`;

/** The spoken name of the row whose scenario is on screen. */
export const onScreenSpoken = (name: string): string => `“${name}”是当前场景`;

/** A row while its scenario loads. */
export const loadingScenario = (name: string): string => `正在加载“${name}”…`;

/** A row whose switch failed. */
export const scenarioDidNotLoad = (name: string): string => `未能加载“${name}”。`;

/** Said under the heading when the list did not load. */
export const SCENARIOS_DID_NOT_LOAD = '未能加载其他场景。';

/** Said on a row chosen while the page is offline. */
export const CHOOSE_WHEN_ONLINE = '当前处于离线状态。恢复网络后请重新选择。';

/** A row's figures: the departments a run of it uses. */
export const departmentsLine = (n: number): string => countOf(n, '个部门', '个部门');

/** The key on a row of Yours that opens its details, where a compiled scenario is renamed or deleted. */
export const VIEW_DETAIL = '查看详情';
export const viewDetailSpoken = (name: string): string => `查看“${name}”详情`;

/* Write your own scenario: the paste form, kept under the list. */

/** The paste form's heading. */
export const WRITE_YOUR_OWN = '编写自己的场景';

/** The paste form's key on a run on the host's keys. */
export const GENERATE_AND_RUN = '生成并运行';

/** Start's sentence while a draft of 200 characters or more waits in the paste form. */
export const heldDraft = (scenario: string): string =>
  `下方有一份场景草稿。你可以运行草稿，也可以清除草稿后运行“${scenario}”。`;

/** The link to the draft, and the key that clears it. */
export const GO_TO_DRAFT = '前往草稿';
export const CLEAR_DRAFT = '清除草稿';

/* The notes and the foot. */

/** Under the leaders' heading row. */
export const NOTE_FICTIONAL = '决策者均为虚构角色。';

/** Above Start's notice, as two lines. */
export const NOTE_AI = '决策者是 AI 智能体，其发言由语言模型生成，可能有误。';
export const NOTE_ADULTS = '未满 18 岁须经父母或监护人同意。此服务不适用于 13 岁以下儿童。';

/** The foot's navigation, for a screen reader. */
export const SITE_LINKS = '站点链接';

/** The key that holds Docs, GitHub and npm when the foot's links do not fit one row. */
export const MORE_LINKS = '更多链接';

/** The foot's links. */
export const FOOT_LINKS = [
  { label: '文档', href: '/docs' },
  { label: 'GitHub', href: 'https://github.com/framerslab/paracosm' },
  { label: 'npm', href: 'https://www.npmjs.com/package/paracosm' },
  { label: '隐私', href: '/#privacy' },
] as const;

/** The foot's licence line. */
export const LICENCE_LINE = 'Paracosm · Apache-2.0 · Frame.dev';
