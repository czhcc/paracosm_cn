/**
 * Every word the forged tool view shows, in one place, so the components and
 * their tests read the same strings.
 */
import type { RecordOutcome } from '../../hooks/useToolRegistry';
import type { GlyphKind, StationId, StationState } from './forgeLine';

/** The five stations' names, in the order a forge passes them. */
export const STATION_WORDS: Readonly<Record<StationId, string>> = {
  request: '请求',
  code: '代码',
  tests: '测试',
  judge: '评审',
  added: '收录',
};

/** The one line a station shows when the record cannot say more. */
export const LINE_STATE_WORDS = {
  unknown: '未知',
  notReached: '未到达',
} as const;

/** How a station's button names its state to a screen reader: "Request: reached", "Code: Unknown". */
export const STATION_STATE_NAMES: Readonly<Record<StationState, string>> = {
  reached: '已到达',
  stopped: '在此停止',
  unknown: LINE_STATE_WORDS.unknown,
  notReached: LINE_STATE_WORDS.notReached,
};

export const stationName = (station: StationId, state: StationState): string =>
  `${STATION_WORDS[station]}: ${STATION_STATE_NAMES[state]}`;

/** The list the trace's stations sit in. */
export const STATIONS_LIST_NAME = '工具生成阶段';

/** Each outcome's word, always shown beside its glyph. */
export const OUTCOME_WORDS: Readonly<Record<GlyphKind, string>> = {
  passed: '通过',
  rejected: '评审拒绝',
  notJudged: '未经评审',
  refused: '已拒绝',
  failed: '失败',
  didNotPass: '未通过',
};

/** An actor's slot label on its tile: "A1" to "A300". */
export const actorLabel = (index: number): string => `A${index + 1}`;

/** The forges a strip holds past the cells it draws. */
export const stripMore = (n: number): string => `+${n}`;

// ── The trace ───────────────────────────────────────────────────────────

/** The trace's name as a dialog: "mars_landing_site_score, forged tool 1". */
export const traceDialogName = (toolName: string, n: number): string => `${toolName}，动态工具 ${n}`;

/** The tool's number in the header row: "Forged tool 5". */
export const forgedToolLabel = (n: number): string => `动态工具 ${n}`;

export const CLOSE_TRACE = '关闭工具详情';

/** Copy link to this tool, in the header row, and what it says of the copy. */
export const COPY_LINK = {
  key: '复制此工具的链接',
  copied: '链接已复制。持有链接的人可以查看工具详情并回放运行。',
  failed: '复制失败，请手动选中并复制链接。',
  offline: '当前处于离线状态',
} as const;

/** The look key's names, the page header's own. */
export const LOOK_KEY_NAMES = {
  toLight: '切换为浅色模式',
  toDark: '切换为深色模式',
} as const;

/** The one label at the top of every trace. */
export const AI_WRITTEN_LABEL = '由 AI 模型在本次 Paracosm 运行期间生成';

/** What happened to a forge, in one sentence, as far as the run's record says. */
export const RECORD_OUTCOME_SENTENCES: Readonly<Record<RecordOutcome, string>> = {
  passed: '已通过模型评审。',
  did_not_pass: '未通过。运行记录未说明工具生成停在哪个阶段。',
};

/** Under the head of a forge that did not pass: the reason its run recorded, or that it recorded none. */
export const RECORDED_REASON = {
  heading: '运行记录中的原因',
  limit: '运行记录最多保留此原因的前 240 个字符。',
  none: '运行记录未提供原因。',
} as const;

/** The one line of a station whose evidence the run did not record. */
export const NOT_RECORDED = {
  code: '本次运行未记录代码。',
  tests: '本次运行未记录测试。',
} as const;

/** Judge's one line on an approved forge, the confidence to two places: "Approved · confidence 0.98 out of 1". */
export const judgeApprovedLine = (confidence: number): string =>
  `已批准 · 置信度 ${confidence.toFixed(2)}（满分 1）`;

/** Added's one line on an approved forge: "Used 3 times", "Used 1 time". */
export const usedTimes = (n: number): string => `使用 ${n} 次`;

// ── The stations, opened ─────────────────────────────────────────────────

/** The key at the line's head: its label, and its name for a screen reader. */
export const OPEN_ALL = {
  open: '全部展开',
  close: '全部收起',
  openName: '展开所有阶段',
  closeName: '收起所有阶段',
} as const;

/** The actor a tool was forged under, by its tile's label and name: "A1 Aria Chen, The Visionary · engineering · turn 1 · for “Landfall”". */
export function actorLine(parts: {
  label: string; name: string; archetype: string; department: string; turn: number; eventTitle: string;
}): string {
  const who = parts.archetype ? `${parts.label} ${parts.name}, ${parts.archetype}` : `${parts.label} ${parts.name}`;
  return [
    who,
    parts.department,
    `第 ${parts.turn} 回合`,
    parts.eventTitle ? `用于“${parts.eventTitle}”` : '',
  ].filter(Boolean).join(' · ');
}

/** The link from Request to the event the tool was made for. */
export const goToEvent = (eventTitle: string): string => `前往事件：${eventTitle}`;

/** Request: what the tool does and its declared fields. */
export const REQUEST_WORDS = {
  whatItDoes: '工具用途',
  inputFields: '输入字段',
  outputFields: '输出字段',
  columns: ['字段', '类型', '必填', '说明'],
  rawJson: '原始 JSON',
  noInputFields: '此工具未声明输入字段。',
  noOutputFields: '此工具未声明输出字段。',
  /** A field the record names with no schema to give its type. */
  notRecorded: '未记录',
  yes: '是',
  no: '否',
} as const;

/** Judge on the run's record: the verdict's confidence, and no words of the judge's own. */
export const JUDGE_WORDS = {
  heading: '评审意见',
  notice: '此代码由模型评审，复用前请自行检查其安全性。',
  meterName: '评审置信度',
  wordsNotRecorded: '本次运行未记录评审意见。',
} as const;

/** "The judge's confidence: 0.98 out of 1", the confidence to two places. */
export const judgeConfidence = (confidence: number): string =>
  `评审置信度：${confidence.toFixed(2)}（满分 1）`;

/** Added on the run's record: each history row with the output its run recorded. */
export const ADDED_WORDS = {
  output: '运行记录中的输出',
  testNotRecorded: '未记录此次工具生成的测试。',
  notUsed: '生成后尚未使用。',
} as const;

/** One row of a tool's history: "Turn 1 · engineering · “Landfall”". */
export function historyRowLine(turn: number, department: string, eventTitle: string): string {
  return [`第 ${turn} 回合`, department, eventTitle ? `“${eventTitle}”` : ''].filter(Boolean).join(' · ');
}

// ── Record ──────────────────────────────────────────────────────────────

/** Record, the key at the line's foot, and what it opens on a run with no trace. */
export const RECORD_WORDS = {
  key: '记录',
  rawRecord: '原始记录',
  copy: '复制记录',
  copied: '已复制',
  copyFailed: '复制失败，请手动选中并复制记录。',
  download: '下载 JSON',
  downloadFailed: '下载失败。请重试，或复制记录。',
  showInEventLog: '在事件日志中查看',
  unreadable: '无法显示此记录。',
} as const;

/** The file Download JSON saves: "mars_landing_site_score-trace.json". */
export const recordFileName = (toolName: string): string => `${toolName}-trace.json`;

// ── Attempts ────────────────────────────────────────────────────────────

/** The keys either side of the attempt line. */
export const ATTEMPT_WORDS = {
  previous: '上一次尝试',
  next: '下一次尝试',
} as const;

/** The attempt line on the latest attempt: "2 of 2". */
export const attemptCount = (n: number, total: number): string => `${n} / ${total}`;

/** The attempt line on an earlier attempt, and its name on every attempt: "Attempt 1 of 2". */
export const attemptOfTotal = (n: number, total: number): string => `第 ${n} 次尝试，共 ${total} 次`;

/** Another attempt's row where it leaves the line: "Attempt 1 · Did not pass". */
export const attemptRow = (n: number, outcome: string): string => `第 ${n} 次尝试 · ${outcome}`;

// ── The forged toolbox ──────────────────────────────────────────────────

/** A count as the toolbox writes it: "3,612". */
export const countWord = (n: number): string => n.toLocaleString('en-US');

/** The toolbox's title, the forge view's one run of capitals. */
export const TOOLBOX_TITLE = '动态工具箱';

/** The toolbox's name as a dialog: "Forged toolbox, 12 tools". */
export const toolboxDialogName = (tools: number): string => `动态工具箱，${countWord(tools)} 个工具`;

/** The key the Viz tab's FORGE mode shows beside its mode pills: "Forged toolbox · 286". */
export const vizToolboxKey = (tools: number): string => `动态工具箱 · ${countWord(tools)}`;

export const CLOSE_TOOLBOX = '关闭工具箱';

/**
 * The count line, on the run's record: "12 tools from 13 forges (1 re-forge)
 * · 9 passed · 4 did not pass". The outcomes count forges and add up to
 * them; the bracket shows only when a tool was forged more than once; an
 * outcome with no forge is left out; a run of more than two actors ends
 * "· 24 actors".
 */
export function toolboxCountLine(
  counts: { tools: number; forges: number; reforges: number; passed: number; didNotPass: number },
  actors: number,
): string {
  const reforged = counts.reforges > 0 ? `（${countWord(counts.reforges)} 次重新生成）` : '';
  return [
    `${countWord(counts.forges)} 次生成产生 ${countWord(counts.tools)} 个工具${reforged}`,
    counts.passed > 0 ? `${countWord(counts.passed)} 次通过` : '',
    counts.didNotPass > 0 ? `${countWord(counts.didNotPass)} 次未通过` : '',
    actors > 2 ? `${countWord(actors)} 位决策者` : '',
  ].filter(Boolean).join(' · ');
}

/** The filter: its name, the word before the menu's choice, and each choice's word. */
export const SHOW_WORDS = {
  name: '显示',
  menuLead: '显示：',
  all: '全部',
  passed: OUTCOME_WORDS.passed,
  did_not_pass: OUTCOME_WORDS.didNotPass,
} as const;

/** Find a tool: its label, its placeholder and its clear keys. */
export const FIND_WORDS = {
  label: '搜索工具',
  placeholder: '工具名称…',
  clear: '清除',
  clearName: '清除搜索',
} as const;

/** What the list says when it holds no row. */
export const TOOLBOX_EMPTY = {
  noTools: '本次运行中各部门均未生成工具。',
  everyToolPassed: '本次运行中所有工具均已通过。',
} as const;

/** A search that matches no tool: "No tool matches “zzz”." */
export const noToolMatches = (query: string): string => `找不到符合“${query}”的工具。`;

export const EXPORT_JSON = '导出 JSON';

/** The file Export JSON saves. */
export const TOOLBOX_FILE_NAME = 'paracosm-toolbox.json';

/**
 * A row's meta line after its actor: "engineering · turn 1 · used 1 time ·
 * 1 re-forge". The uses show on a tool that was added, the re-forges on a
 * tool forged more than once.
 */
export function toolMetaLine(parts: { department: string; turn: number; uses: number | null; reforges: number }): string {
  return [
    parts.department,
    `第 ${parts.turn} 回合`,
    parts.uses === null ? '' : `使用 ${countWord(parts.uses)} 次`,
    parts.reforges > 0 ? `重新生成 ${countWord(parts.reforges)} 次` : '',
  ].filter(Boolean).join(' · ');
}

/** The other actors that forged a tool of this name: "Same name: A2, A9", and past three, "Same name in 5 other actors". */
export function sameName(labels: string[]): string {
  return labels.length > 3 ? `另有 ${countWord(labels.length)} 位决策者生成了同名工具` : `同名工具：${labels.join('、')}`;
}

/**
 * A row's name for a screen reader: "mars_landing_site_score, Passed, made
 * by A1 Aria Chen", and on a tool forged again, ", forged 2 times".
 */
export function toolRowName(parts: { name: string; outcome: string; actorLabel: string; actorName: string; forges: number }): string {
  const made = `${parts.name}，${parts.outcome}，由 ${parts.actorLabel} ${parts.actorName} 生成`;
  return parts.forges > 1 ? `${made}，共生成 ${countWord(parts.forges)} 次` : made;
}

// ── The toolbox's groups ────────────────────────────────────────────────

/** Group, the menu that folds the rows: its name, and each grouping's word. */
export const GROUP_WORDS = {
  name: '分组',
  actor: '决策者',
  department: '部门',
  none: '不分组',
} as const;

/** The Group key's label: "Group: Actor". */
export const groupKeyLabel = (group: 'actor' | 'department' | 'none'): string => `分组：${GROUP_WORDS[group]}`;

/** The key that opens or closes every fold. */
export const OPEN_ALL_GROUPS = {
  open: '展开所有分组',
  close: '收起所有分组',
} as const;

/** An actor's fold head: its name and archetype, "Ines Duarte · The Strategist". */
export const actorFoldTitle = (name: string, archetype: string): string => (archetype ? `${name} · ${archetype}` : name);

/**
 * A fold head's count line, its outcomes as the toolbox's count line has
 * them: "14 tools from 16 forges · 13 passed · 3 did not pass". An outcome
 * with no forge is left out.
 */
export function foldCountLine(counts: { tools: number; forges: number; passed: number; didNotPass: number }): string {
  return [
    `${countWord(counts.forges)} 次生成产生 ${countWord(counts.tools)} 个工具`,
    counts.passed > 0 ? `${countWord(counts.passed)} 次通过` : '',
    counts.didNotPass > 0 ? `${countWord(counts.didNotPass)} 次未通过` : '',
  ].filter(Boolean).join(' · ');
}

/** An actor that forged no tool: its fold head's words. */
export const NO_TOOLS = '没有工具';

/** An actor whose reports cannot be read: "A7's tools could not be read." */
export const actorToolsUnreadable = (label: string): string => `无法读取 ${label} 的工具。`;

/** An actor whose registry is full: "50 tools: the most one actor's registry holds". */
export const registryFull = (limit: number): string => `每位决策者最多可注册 ${countWord(limit)} 个工具`;

/**
 * An actor's fold head as a screen reader names it: "A7 Ines Duarte, The
 * Strategist, 14 tools, 2 did not pass".
 */
export function actorFoldName(parts: {
  label: string; name: string; archetype: string;
  tools: number; didNotPass: number; unreadable: boolean;
}): string {
  const who = [`${parts.label} ${parts.name}`, parts.archetype].filter(Boolean);
  if (parts.unreadable) return [...who, actorToolsUnreadable(parts.label)].join(', ');
  if (parts.tools === 0) return [...who, NO_TOOLS].join(', ');
  return [
    ...who,
    `${countWord(parts.tools)} 个工具`,
    parts.didNotPass > 0 ? `${countWord(parts.didNotPass)} 次未通过` : '',
  ].filter(Boolean).join(', ');
}

/** A department's fold head as a screen reader names it: "engineering, 58 tools, 12 did not pass". */
export function departmentFoldName(name: string, counts: { tools: number; didNotPass: number }): string {
  return [
    name,
    `${countWord(counts.tools)} 个工具`,
    counts.didNotPass > 0 ? `${countWord(counts.didNotPass)} 次未通过` : '',
  ].filter(Boolean).join(', ');
}

/** What Export JSON says while it writes a large file, and when it fails. */
export const exportingTools = (tools: number): string => `正在导出 ${countWord(tools)} 个工具…`;
export const EXPORT_FAILED = '导出失败，请重试。';

// ── The actor picker ────────────────────────────────────────────────────

/** The actor picker's words: its name as a dialog, its search, its keys and its states. */
export const ACTOR_PICKER_WORDS = {
  dialogName: '选择决策者',
  listName: '决策者',
  findLabel: '搜索决策者',
  findPlaceholder: '姓名、角色类型或 A 编号…',
  clearSearchName: '清除决策者搜索',
  sortName: '排序',
  sortLead: '排序：',
  selectShown: '选择当前显示的决策者',
  clear: '清除',
  done: '完成',
  showAll: '显示全部',
  waiting: '等待开始',
  unreadable: '无法读取决策者。',
} as const;

/** Each of the picker's sorts, as its menu names it after "Sort:". */
export const SORT_WORDS = {
  run: '运行顺序',
  tools: '工具数最多',
  didNotPass: '未通过次数最多',
} as const;

/** The toolbox's Actors key: "Actors: All 24", or "Actors: 4 of 24" while some actors are chosen. */
export const actorsKeyLabel = (picked: number | null, actors: number): string =>
  (picked === null ? `决策者：全部 ${countWord(actors)} 位` : `决策者：${countWord(picked)} / ${countWord(actors)}`);

/** How many actors the toolbox shows: "Showing 4 of 24 actors". */
export const showingActors = (picked: number, actors: number): string => `显示 ${countWord(picked)} / ${countWord(actors)} 位决策者`;

/**
 * The count line while some actors are chosen: "Showing 4 of 24 actors ·
 * 50 tools from 59 forges (9 re-forges) · 47 passed · 12 did not pass",
 * counting the chosen actors' tools and forges.
 */
export function chosenCountLine(
  picked: number,
  actors: number,
  counts: { tools: number; forges: number; reforges: number; passed: number; didNotPass: number },
): string {
  return `${showingActors(picked, actors)} · ${toolboxCountLine(counts, 0)}`;
}

/** An actor's counts in the picker: "14 tools · 2 did not pass", the second part left out when every forge passed. */
export function pickerCounts(counts: { tools: number; didNotPass: number }): string {
  if (counts.tools === 0) return NO_TOOLS;
  return [
    `${countWord(counts.tools)} 个工具`,
    counts.didNotPass > 0 ? `${countWord(counts.didNotPass)} 次未通过` : '',
  ].filter(Boolean).join(' · ');
}

/** A search that matches no actor: "No actor matches “zzz”." */
export const noActorMatches = (query: string): string => `找不到符合“${query}”的决策者。`;
