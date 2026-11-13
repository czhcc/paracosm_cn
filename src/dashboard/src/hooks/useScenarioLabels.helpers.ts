/**
 * Pure helpers behind `useScenarioLabels`. Split out of the hook so the
 * derivation logic can be unit-tested without pulling in
 * `useScenarioContext` (which transitively imports React components +
 * SCSS modules that node:test/tsx cannot resolve).
 *
 * The hook at `./useScenarioLabels.ts` is a thin `useMemo` wrapper over
 * `deriveLabels`.
 */

/** Variant bundle for a scenario's user-facing nouns. Everything the
 *  dashboard's copy surface needs, derived once per scenario load. */
export interface ScenarioLabels {
  /** Plural lower-case population noun (e.g. "colonists", "crew"). */
  people: string;
  /** Singular lower-case population noun (e.g. "colonist", "crew member"). */
  person: string;
  /** Capitalized plural ("Colonists", "Crew"). */
  People: string;
  /** Capitalized singular ("Colonist", "Crew member"). */
  Person: string;
  /** Singular lower-case settlement noun (e.g. "colony", "habitat"). */
  place: string;
  /** Plural lower-case settlement noun (e.g. "colonies", "habitats"). */
  places: string;
  /** Capitalized singular ("Colony"). */
  Place: string;
  /** Capitalized plural ("Colonies"). */
  Places: string;
  /** Singular lower-case time-unit noun (e.g. "year", "day", "quarter", "tick"). */
  time: string;
  /** Plural lower-case time-unit noun (e.g. "years", "days", "quarters", "ticks"). */
  times: string;
  /** Capitalized singular ("Year", "Day", "Quarter", "Tick"). */
  Time: string;
  /** Capitalized plural ("Years", "Days", "Quarters", "Ticks"). */
  Times: string;
}

/**
 * Loose scenario-like shape `deriveLabels` accepts. A thin subset of
 * the full `ScenarioPackage` so the derivation can be called from
 * tests that don't want to import the entire engine.
 */
export interface ScenarioLabelsInput {
  labels?: {
    populationNoun?: string;
    settlementNoun?: string;
    timeUnitNoun?: string;
    timeUnitNounPlural?: string;
  } | null;
}

export function cap(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pluralize(noun: string): string {
  const n = noun.toLowerCase();
  if (n.endsWith('y') && !'aeiou'.includes(n[n.length - 2])) return n.slice(0, -1) + 'ies';
  if (n.endsWith('s') || n.endsWith('x') || n.endsWith('z') || n.endsWith('sh') || n.endsWith('ch')) return n + 'es';
  return n + 's';
}

export function singularize(noun: string): string {
  const n = noun.toLowerCase();
  if (n.endsWith('ies') && n.length > 4) return n.slice(0, -3) + 'y';
  if (n.endsWith('ses') || n.endsWith('xes') || n.endsWith('zes') || n.endsWith('shes') || n.endsWith('ches')) return n.slice(0, -2);
  if (n.endsWith('s') && !n.endsWith('ss')) return n.slice(0, -1);
  return n;
}

const UNIT_SUFFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];

/**
 * The default unit name of the leader in slot `idx`, in the scenario's own
 * word for a settlement: "Colony Alpha" on Mars, "Lab Alpha" at Atlas Lab.
 */
export function leaderUnit(scenario: ScenarioLabelsInput | null | undefined, idx: number): string {
  return `${deriveLabels(scenario).Place} ${UNIT_SUFFIXES[idx] ?? idx + 1}`;
}

/**
 * Pure derivation of the noun-variant bundle from a scenario-like
 * object. The hook is a `useMemo` wrapper that calls this.
 *
 * Defaults mirror paracosm's Mars heritage for population/settlement
 * (colonists / colony) but use a neutral `tick` / `ticks` for the
 * time-unit so scenarios that omit `timeUnitNoun` produce generic
 * labels rather than inheriting the Mars-specific "Year N" phrasing.
 */
export function deriveLabels(scenario: ScenarioLabelsInput | null | undefined): ScenarioLabels {
  const popPlural = (scenario?.labels?.populationNoun || 'colonists').toLowerCase();
  const popSingular = singularize(popPlural);
  const placeSingular = (scenario?.labels?.settlementNoun || 'colony').toLowerCase();
  const placePlural = pluralize(placeSingular);
  const timeSingular = (scenario?.labels?.timeUnitNoun || 'tick').toLowerCase();
  const timePlural = (scenario?.labels?.timeUnitNounPlural || pluralize(timeSingular)).toLowerCase();
  return {
    people: popPlural,
    person: popSingular,
    People: cap(popPlural),
    Person: cap(popSingular),
    place: placeSingular,
    places: placePlural,
    Place: cap(placeSingular),
    Places: cap(placePlural),
    time: timeSingular,
    times: timePlural,
    Time: cap(timeSingular),
    Times: cap(timePlural),
  };
}

/** 本地化派生的显示单位，时间协议本身仍保留英文枚举。 */
export function localizeScenarioLabels(labels: ScenarioLabels): ScenarioLabels {
  const words: Record<string, string> = { colonist: '居民', colonists: '居民', researcher: '研究员', researchers: '研究员', citizen: '市民', citizens: '市民', crew: '船员', 'crew member': '船员', operator: '操作员', operators: '操作员', member: '成员', members: '成员', patient: '患者', patients: '患者', employee: '员工', employees: '员工', colony: '殖民地', colonies: '殖民地', lab: '实验室', labs: '实验室', station: '站点', stations: '站点', habitat: '栖息地', habitats: '栖息地', settlement: '聚居地', settlements: '聚居地', year: '年', years: '年', quarter: '季度', quarters: '季度', month: '月', months: '月', week: '周', weeks: '周', day: '天', days: '天', hour: '小时', hours: '小时', tick: '时间步', ticks: '时间步', turn: '回合', turns: '回合' };
  return Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, words[value.toLowerCase()] ?? value.replace(/([\u3400-\u9fff])s$/, '$1')])) as unknown as ScenarioLabels;
}
