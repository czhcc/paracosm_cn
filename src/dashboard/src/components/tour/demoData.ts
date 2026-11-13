/**
 * Pre-built demo simulation data representing 3 turns of a Mars Genesis run.
 * Used by the guided tour to populate the dashboard with realistic data
 * so users can see every component in action before running their own sim.
 *
 * Field shapes match exactly what EventCard, Badge, DivergenceRail, and
 * StatsBar expect. Structured outcomes enable proper badge rendering.
 */

import type { SimEvent } from '../../hooks/useSSE';

/**
 * Generate a small but visually-rich agent roster for a tour snapshot.
 * Picked to be just large enough that SwarmViz draws a recognizable
 * canvas (cells + glyphs + departments) without bloating the demo
 * bundle. Without these, useVizSnapshots returned empty arrays, maxTurn
 * stayed 0, and SwarmViz fell back to its empty-state placeholder ("Run
 * a simulation to see the colony visualization") — leaving the tour's
 * Viz step looking blank to first-time visitors.
 */
function buildDemoAgents(side: 'A' | 'B', turn: number): Array<Record<string, unknown>> {
  // Mars Genesis's departments (scenarios/mars.json).
  const departments = ['medical', 'engineering', 'agriculture', 'psychology', 'governance'];
  const ranks = ['junior', 'senior', 'lead', 'chief'] as const;
  const moods = ['neutral', 'optimistic', 'tense', 'focused', 'anxious', 'confident'];
  const firstA = ['Aria', 'Diego', 'Yuki', 'Kira', 'Marco', 'Lila', 'Theo', 'Nia', 'Omar', 'Saanvi', 'Felix', 'Mira'];
  const firstB = ['Ren', 'Iris', 'Kenji', 'Anya', 'Tomas', 'Zara', 'Vinh', 'Lena', 'Hugo', 'Priya', 'Jonah', 'Mei'];
  const lastA = ['Vasquez', 'Park', 'Okafor', 'Reyes', 'Singh', 'Cohen', 'Mwangi', 'Roy', 'Tate', 'Lopez', 'Bauer', 'Akin'];
  const lastB = ['Tanaka', 'Brandt', 'Kim', 'Nilsson', 'Diaz', 'Patel', 'Foley', 'Volkov', 'Cruz', 'Hossain', 'Mukherjee', 'Park'];
  const firstNames = side === 'A' ? firstA : firstB;
  const lastNames = side === 'A' ? lastA : lastB;
  return Array.from({ length: 14 }, (_, i) => {
    const aliveBias = ((i * 7 + turn * 3) % 13) > 1; // most alive, a few not
    return {
      agentId: `${side.toLowerCase()}-${i}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      department: departments[i % departments.length],
      role: i === 0 ? "部门负责人" : (ranks[(i + turn) % ranks.length] === 'lead' ? "高级专家" : 'Specialist'),
      rank: ranks[(i + turn) % ranks.length],
      alive: aliveBias,
      marsborn: i % 5 === 0,
      psychScore: 0.55 + ((i * 11 + turn * 7) % 35) / 100,
      age: 28 + ((i * 3 + turn) % 22),
      generation: i % 5 === 0 ? 1 : 0,
      childrenIds: i % 6 === 2 ? [`${side.toLowerCase()}-${(i + 7) % 14}`] : [],
      featured: i < 3,
      mood: moods[(i + turn) % moods.length],
      shortTermMemory: [`第 ${turn} 回合：执行部门任务`],
    };
  });
}

const DEMO_SNAPSHOTS: SimEvent[] = [1, 2, 3].flatMap(turn => [
  {
    type: 'systems_snapshot',
    leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn, time: 2034 + turn,
      agents: buildDemoAgents('A', turn),
      population: 100, morale: 0.85 + turn * 0.01, foodReserve: 18 - turn * 0.5,
      births: turn === 2 ? 1 : 0, deaths: turn === 3 ? 1 : 0,
    },
  } as SimEvent,
  {
    type: 'systems_snapshot',
    leader: '指挥官田中弘',
    data: {
      turn, time: 2034 + turn,
      agents: buildDemoAgents('B', turn),
      population: 100, morale: 0.88 + turn * 0.005, foodReserve: 18 - turn * 0.3,
      births: turn === 3 ? 1 : 0, deaths: 0,
    },
  } as SimEvent,
]);

export const DEMO_EVENTS: SimEvent[] = [
  // ── Status: initialize the simulation ──────────────────────────────
  {
    type: 'status',
    leader: '',
    data: {
      phase: 'parallel',
      maxTurns: 6,
      actors: [
        {
          name: '指挥官埃琳娜·瓦斯奎兹',
          archetype: "愿景家",
          unit: "奥林匹斯基地",
          hexaco: { openness: 0.92, conscientiousness: 0.40, extraversion: 0.80, agreeableness: 0.55, emotionality: 0.25, honestyHumility: 0.65 },
          instructions: "你通过愿景鼓舞团队，重视开放性与大胆实验，愿意容忍有助于突破的不确定性。",
          quote: "边疆属于勇敢的人。",
        },
        {
          name: '指挥官田中弘',
          archetype: "工程师",
          unit: "子午线站",
          hexaco: { openness: 0.30, conscientiousness: 0.95, extraversion: 0.35, agreeableness: 0.70, emotionality: 0.60, honestyHumility: 0.90 },
          instructions: "你以精确与证据领导团队，重视尽责性和成熟方法，拒绝未经验证的方案。",
          quote: "每个系统都有承受极限，必须了解它。",
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // TURN 1 — LEADER A
  // ════════════════════════════════════════════════════════════════════
  {
    type: 'turn_start',
    leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1, time: 2035,
      title: "沙尘暴季节开始",
      crisis: '一场来自希腊盆地的大型沙尘暴正在逼近，未来数月将威胁太阳能板效率和室外作业。',
      category: 'environmental', emergent: false,
      turnSummary: "火星沙尘暴季节提前到来，殖民地迎来首个重大环境挑战。",
      metrics: { population: 100, morale: 0.85, foodMonthsReserve: 18, waterLitersPerDay: 800, powerKw: 400, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 0 },
    },
  },
  { type: 'specialist_start', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 1, department: 'engineering', title: "工程分析" } },
  {
    type: 'specialist_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1, department: 'engineering',
      summary: "沙尘暴高峰期太阳能板输出将下降 40%～60%。建议部署防尘罩并切换至核能备份。",
      forgedTools: [{ name: 'dust_accumulation_model', description: "根据风速与颗粒密度预测太阳能阵列积尘速度", approved: true, confidence: 0.91, mode: 'computational' }],
      citations: 2, citationList: [{ text: "火星沙尘暴光学厚度模型", url: 'https://doi.org/10.1029/2019JE006102' }],
    },
  },
  { type: 'specialist_start', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 1, department: 'medical', title: "医疗分析" } },
  {
    type: 'specialist_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1, department: 'medical',
      summary: "粉尘渗入会危害呼吸系统。建议加强空气过滤，将每轮舱外活动限制为 2 小时。",
      forgedTools: [], citations: 1,
    },
  },
  { type: 'decision_pending', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 1 } },
  {
    type: 'decision_made', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1,
      decision: "顶着风暴积极扩建。为全部太阳能阵列部署试验性防尘涂层，并安排加班，在风暴高峰前完成温室穹顶。",
      rationale: "风暴迫使我们提升能力。若能在风暴中维持供电，就能提前数月证明自给能力。",
      selectedPolicies: ['expand_solar', 'mandatory_overtime'],
    },
  },
  {
    type: 'outcome', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1,
      outcome: 'risky_success',
      _decision: "顶着风暴积极扩建。为全部太阳能阵列部署试验性防尘涂层，并安排加班，在风暴高峰前完成温室穹顶。",
      _rationale: "风暴迫使我们提升能力。若能在风暴中维持供电，就能提前数月证明自给能力。",
      _policies: ['expand_solar', 'mandatory_overtime'],
      _toolCount: 1, _citeCount: 3,
    },
  },
  {
    type: 'agent_reactions', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1,
      totalReactions: 14,
      reactions: [
        { name: 'Erik Lindqvist', role: "总工程师", department: 'engineering', mood: 'anxious', quote: "这些涂层尚未经过大规模验证，一次连锁故障就可能毁掉整个西侧阵列。", hexaco: { O: 0.45, C: 0.88, E: 0.35, A: 0.62, Em: 0.55, HH: 0.80 }, boneDensity: 94, radiation: 12, psychScore: 72, intensity: 0.78 },
        { name: 'Dr. Yuki Tanaka', role: "首席医疗官", department: 'medical', mood: 'negative', quote: "沙尘事件期间还安排加班，她在用长期健康换取短期收益。", hexaco: { O: 0.60, C: 0.75, E: 0.50, A: 0.80, Em: 0.70, HH: 0.85 }, boneDensity: 96, radiation: 8, psychScore: 68, intensity: 0.82 },
      ],
    },
  },
  {
    type: 'bulletin', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 1,
      posts: [
        { name: "殖民地公告", role: "官方", department: 'governance', post: "瓦斯奎兹指挥官下令为全部太阳能设施部署试验性防尘涂层。工程团队实行双班制，争取赶在风暴高峰前完工。", mood: 'anxious', likes: 18, replies: 7 },
      ],
    },
  },
  {
    type: 'turn_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: { turn: 1, metrics: { population: 100, morale: 0.78, foodMonthsReserve: 17.5, waterLitersPerDay: 790, powerKw: 340, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 2 } },
  },

  // ════════════════════════════════════════════════════════════════════
  // TURN 1 — LEADER B
  // ════════════════════════════════════════════════════════════════════
  {
    type: 'turn_start',
    leader: '指挥官田中弘',
    data: {
      turn: 1, time: 2035,
      title: "沙尘暴季节开始",
      crisis: '一场来自希腊盆地的大型沙尘暴正在逼近，未来数月将威胁太阳能板效率和室外作业。',
      category: 'environmental', emergent: false,
      turnSummary: "火星沙尘暴季节提前到来，殖民地迎来首个重大环境挑战。",
      metrics: { population: 100, morale: 0.85, foodMonthsReserve: 18, waterLitersPerDay: 800, powerKw: 400, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 0 },
    },
  },
  { type: 'specialist_start', leader: '指挥官田中弘', data: { turn: 1, department: 'engineering', title: "工程分析" } },
  {
    type: 'specialist_done', leader: '指挥官田中弘',
    data: {
      turn: 1, department: 'engineering',
      summary: "建议立即执行节电措施，将非必要系统切换待机，并加强栖息舱密封以防粉尘渗入。",
      forgedTools: [{ name: 'power_budget_optimizer', description: "按优先权重在各部门间分配有限电力的线性规划工具", approved: true, confidence: 0.94, mode: 'optimization' }],
      citations: 3,
    },
  },
  { type: 'specialist_start', leader: '指挥官田中弘', data: { turn: 1, department: 'agriculture', title: "农业分析" } },
  {
    type: 'specialist_done', leader: '指挥官田中弘',
    data: {
      turn: 1, department: 'agriculture',
      summary: "太阳能减少意味着补光时间缩短。建议改用耐寒作物轮作，优先种植高热量品种。",
      forgedTools: [], citations: 1,
    },
  },
  { type: 'decision_pending', leader: '指挥官田中弘', data: { turn: 1 } },
  {
    type: 'decision_made', leader: '指挥官田中弘',
    data: {
      turn: 1,
      decision: "全面进入节约模式。非必要用电减少 40%，暂停全部室外施工，安排强制室内休息，保护现有资源。",
      rationale: "不能让未经考验的风暴破坏基础设施。在条件改善前，节约可以保住安全余量。",
      selectedPolicies: ['power_conservation', 'construction_halt', 'indoor_mandate'],
    },
  },
  {
    type: 'outcome', leader: '指挥官田中弘',
    data: {
      turn: 1,
      outcome: 'conservative_success',
      _decision: "全面进入节约模式。非必要用电减少 40%，暂停全部室外施工，安排强制室内休息，保护现有资源。",
      _rationale: "不能让未经考验的风暴破坏基础设施。在条件改善前，节约可以保住安全余量。",
      _policies: ['power_conservation', 'construction_halt', 'indoor_mandate'],
      _toolCount: 1, _citeCount: 4,
    },
  },
  {
    type: 'agent_reactions', leader: '指挥官田中弘',
    data: {
      turn: 1,
      totalReactions: 14,
      reactions: [
        { name: 'Carlos Fernandez', role: "高级地质学家", department: 'engineering', mood: 'resigned', quote: "又一个月无法开展野外工作，存放的表土样品正在退化。", hexaco: { O: 0.82, C: 0.60, E: 0.55, A: 0.50, Em: 0.40, HH: 0.70 }, boneDensity: 91, radiation: 18, psychScore: 65, intensity: 0.60 },
        { name: 'Amara Osei', role: "农业主管", department: 'agriculture', mood: 'positive', quote: "轮作决定很明智，耐寒品种的产量甚至超过预期。", hexaco: { O: 0.55, C: 0.78, E: 0.65, A: 0.85, Em: 0.50, HH: 0.75 }, boneDensity: 97, radiation: 6, psychScore: 82, intensity: 0.55 },
      ],
    },
  },
  {
    type: 'bulletin', leader: '指挥官田中弘',
    data: {
      turn: 1,
      posts: [
        { name: "殖民地公告", role: "官方", department: 'governance', post: "沙尘暴临近，田中指挥官启动全面节约措施，暂停全部室外作业，电力储备为 95%。", mood: 'neutral', likes: 31, replies: 4 },
      ],
    },
  },
  {
    type: 'turn_done', leader: '指挥官田中弘',
    data: { turn: 1, metrics: { population: 100, morale: 0.87, foodMonthsReserve: 17.8, waterLitersPerDay: 800, powerKw: 395, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 0 } },
  },

  // ════════════════════════════════════════════════════════════════════
  // TURN 2 — LEADER A
  // ════════════════════════════════════════════════════════════════════
  {
    type: 'turn_start',
    leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2, time: 2036,
      title: "水循环装置污染",
      crisis: '主水循环系统检测到微量高氯酸盐污染。备用滤芯虽能拦截污染物，但已按额定容量的 150% 运转。',
      category: 'infrastructure', emergent: true,
      turnSummary: "沙尘暴期间的作业引发涌现危机：密集的舱外活动使细小浮土进入进气系统。",
      metrics: { population: 100, morale: 0.78, foodMonthsReserve: 17, waterLitersPerDay: 650, powerKw: 360, infrastructureModules: 3, lifeSupportCapacity: 118, scienceOutput: 4 },
    },
  },
  { type: 'specialist_start', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 2, department: 'engineering', title: "工程分析" } },
  {
    type: 'specialist_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2, department: 'engineering',
      summary: "主循环装置需要完全拆解并消毒，预计 48 小时。可仅用备用装置运行，但必须严格限水。",
      forgedTools: [
        { name: 'perchlorate_diffusion_simulator', description: "模拟不同流速下污染物在水管中的扩散", approved: true, confidence: 0.88, mode: 'simulation' },
        { name: 'filter_lifespan_predictor', description: "根据污染负荷估算备用滤芯剩余可用时长", approved: true, confidence: 0.92, mode: 'predictive' },
      ],
      citations: 4,
    },
  },
  { type: 'specialist_start', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 2, department: 'medical', title: "医疗分析" } },
  {
    type: 'specialist_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2, department: 'medical',
      summary: "当前检测到的高氯酸盐暴露水平可能在数周内影响甲状腺。建议立即进行血液检查并补充碘化钾。",
      forgedTools: [], citations: 2,
    },
  },
  { type: 'decision_pending', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 2 } },
  {
    type: 'decision_made', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2,
      decision: "双线推进：开展消毒，同时钻探新的应急水井。将科研团队转向水源勘探，彻底解决问题。",
      rationale: "修复循环装置只能争取时间，无法消除根本隐患。第二个独立水源可避免单点故障。",
      selectedPolicies: ['emergency_drilling', 'science_redirect'],
    },
  },
  {
    type: 'outcome', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2,
      outcome: 'risky_success',
      _decision: "双线推进：开展消毒，同时钻探新的应急水井。将科研团队转向水源勘探，彻底解决问题。",
      _rationale: "修复循环装置只能争取时间，无法消除根本隐患。第二个独立水源可避免单点故障。",
      _policies: ['emergency_drilling', 'science_redirect'],
      _toolCount: 2, _citeCount: 6,
      deaths: 2,
    },
  },
  {
    type: 'agent_reactions', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2,
      totalReactions: 14,
      reactions: [
        { name: 'Dr. Yuki Tanaka', role: "首席医疗官", department: 'medical', mood: 'negative', quote: "限水期间有两人死亡，本应等循环装置修好后再打井。", hexaco: { O: 0.60, C: 0.75, E: 0.50, A: 0.80, Em: 0.72, HH: 0.85 }, boneDensity: 96, radiation: 10, psychScore: 58, intensity: 0.91 },
        { name: 'Carlos Fernandez', role: "高级地质学家", department: 'engineering', mood: 'positive', quote: "地下冰的发现改变了一切，这个成果可以发表。殖民地就建在水库之上。", hexaco: { O: 0.85, C: 0.60, E: 0.58, A: 0.50, Em: 0.38, HH: 0.70 }, boneDensity: 91, radiation: 20, psychScore: 70, intensity: 0.74 },
      ],
    },
  },
  {
    type: 'bulletin', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 2,
      posts: [
        { name: "殖民地公告", role: "官方", department: 'governance', post: "应急钻探在地下 12 米处发现冰层。限水期间两位居民遇难。瓦斯奎兹指挥官表示：“这是为生存投资。”", mood: 'negative', likes: 42, replies: 19 },
      ],
    },
  },
  {
    type: 'turn_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: { turn: 2, metrics: { population: 98, morale: 0.68, foodMonthsReserve: 16, waterLitersPerDay: 850, powerKw: 350, infrastructureModules: 4, lifeSupportCapacity: 116, scienceOutput: 8 }, deaths: 2 },
  },

  // ════════════════════════════════════════════════════════════════════
  // TURN 2 — LEADER B
  // ════════════════════════════════════════════════════════════════════
  {
    type: 'turn_start',
    leader: '指挥官田中弘',
    data: {
      turn: 2, time: 2036,
      title: "水循环装置污染",
      crisis: '主水循环系统检测到微量高氯酸盐污染。备用滤芯虽能拦截污染物，但已按额定容量的 150% 运转。',
      category: 'infrastructure', emergent: true,
      turnSummary: "日常维护期间，大气中的沙尘暴残留物沉积在进气口，引发涌现危机。",
      metrics: { population: 100, morale: 0.87, foodMonthsReserve: 17.5, waterLitersPerDay: 650, powerKw: 390, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 0 },
    },
  },
  { type: 'specialist_start', leader: '指挥官田中弘', data: { turn: 2, department: 'engineering', title: "工程分析" } },
  {
    type: 'specialist_done', leader: '指挥官田中弘',
    data: {
      turn: 2, department: 'engineering',
      summary: "建议隔离污染区段、冲洗主系统，并安装冗余前置滤芯后再恢复运行。",
      forgedTools: [{ name: 'water_quality_monitor', description: "持续追踪各管段高氯酸盐浓度，并设置告警阈值", approved: true, confidence: 0.96, mode: 'monitoring' }],
      citations: 2,
    },
  },
  { type: 'decision_pending', leader: '指挥官田中弘', data: { turn: 2 } },
  {
    type: 'decision_made', leader: '指挥官田中弘',
    data: {
      turn: 2,
      decision: "有序开展消毒。隔离受污染管道，逐段冲洗系统，安装三重冗余过滤。供水严格限制为正常配额的 80%，不走捷径。",
      rationale: "水源污染威胁生存。必须彻底修复、逐段验证，并防止再次发生。",
      selectedPolicies: ['water_rationing', 'system_overhaul'],
    },
  },
  {
    type: 'outcome', leader: '指挥官田中弘',
    data: {
      turn: 2,
      outcome: 'conservative_success',
      _decision: "有序开展消毒。隔离受污染管道，逐段冲洗系统，安装三重冗余过滤。供水严格限制为正常配额的 80%，不走捷径。",
      _rationale: "水源污染威胁生存。必须彻底修复、逐段验证，并防止再次发生。",
      _policies: ['water_rationing', 'system_overhaul'],
      _toolCount: 1, _citeCount: 2,
    },
  },
  {
    type: 'agent_reactions', leader: '指挥官田中弘',
    data: {
      turn: 2,
      totalReactions: 14,
      reactions: [
        { name: 'James Mueller', role: "总工程师", department: 'engineering', mood: 'positive', quote: "三重冗余设计很出色，从一开始就该这样建设。", hexaco: { O: 0.40, C: 0.92, E: 0.30, A: 0.65, Em: 0.45, HH: 0.88 }, boneDensity: 92, radiation: 15, psychScore: 78, intensity: 0.65 },
        { name: 'Dr. Priya Singh', role: "殖民地心理师", department: 'psychology', mood: 'positive', quote: "士气稳定，大家信任流程，也感到安全。", hexaco: { O: 0.70, C: 0.68, E: 0.72, A: 0.90, Em: 0.65, HH: 0.82 }, boneDensity: 98, radiation: 5, psychScore: 88, intensity: 0.50 },
      ],
    },
  },
  {
    type: 'bulletin', leader: '指挥官田中弘',
    data: {
      turn: 2,
      posts: [
        { name: "殖民地公告", role: "官方", department: 'governance', post: "田中指挥官完成 72 小时消毒，水质纯度超过基线，无人员伤亡，并安装了新的三重过滤系统。", mood: 'positive', likes: 47, replies: 6 },
      ],
    },
  },
  {
    type: 'turn_done', leader: '指挥官田中弘',
    data: { turn: 2, metrics: { population: 100, morale: 0.89, foodMonthsReserve: 17, waterLitersPerDay: 820, powerKw: 388, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 1 } },
  },

  // ════════════════════════════════════════════════════════════════════
  // TURN 3 — LEADER A
  // ════════════════════════════════════════════════════════════════════
  {
    type: 'turn_start',
    leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3, time: 2037,
      title: "第一代火星新生儿",
      crisis: '三位居民怀孕。殖民地需要决定分娩流程、教育设施，以及是否分配稀缺资源建设儿科专区。',
      category: 'social', emergent: true,
      turnSummary: "殖民地正准备迎接第一代在火星出生的人类，这是一个里程碑时刻。",
      metrics: { population: 98, morale: 0.72, foodMonthsReserve: 15, waterLitersPerDay: 850, powerKw: 370, infrastructureModules: 4, lifeSupportCapacity: 116, scienceOutput: 12 },
    },
  },
  { type: 'specialist_start', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 3, department: 'medical', title: "医疗分析" } },
  {
    type: 'specialist_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3, department: 'medical',
      summary: "火星 0.38g 重力对胎儿发育的影响尚不明确。建议配置离心辅助分娩设施并持续监测。",
      forgedTools: [{ name: 'low_gravity_gestation_model', description: "模拟离心辅助条件下火星重力对骨骼与器官发育轨迹的影响", approved: true, confidence: 0.85, mode: 'biomedical' }],
      citations: 5,
    },
  },
  { type: 'specialist_start', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 3, department: 'psychology', title: "心理分析" } },
  {
    type: 'specialist_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3, department: 'psychology',
      summary: "殖民地士气高涨。首批新生儿象征希望与长久定居，建议举行公开庆祝和命名仪式。",
      forgedTools: [], citations: 1,
    },
  },
  { type: 'decision_pending', leader: '指挥官埃琳娜·瓦斯奎兹', data: { turn: 3 } },
  {
    type: 'decision_made', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3,
      decision: "全力支持。将 4 号模块改为儿科与教育专区，批准离心辅助分娩设施，并将“奠基日”设为殖民地节日。",
      rationale: "这些孩子就是使命本身。若火星无法养育下一代，其他成果就失去了意义。",
      selectedPolicies: ['pediatric_wing', 'founding_day', 'centrifuge_birth'],
    },
  },
  {
    type: 'outcome', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3,
      outcome: 'risky_success',
      _decision: "全力支持。将 4 号模块改为儿科与教育专区，批准离心辅助分娩设施，并将“奠基日”设为殖民地节日。",
      _rationale: "这些孩子就是使命本身。若火星无法养育下一代，其他成果就失去了意义。",
      _policies: ['pediatric_wing', 'founding_day', 'centrifuge_birth'],
      _toolCount: 1, _citeCount: 6,
    },
  },
  {
    type: 'agent_reactions', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3,
      totalReactions: 14,
      reactions: [
        { name: 'Dr. Yuki Tanaka', role: "首席医疗官", department: 'medical', mood: 'hopeful', quote: "我第一次感觉到，我们正在建设长久的家园。离心设施的数据非常出色。", hexaco: { O: 0.62, C: 0.75, E: 0.52, A: 0.80, Em: 0.68, HH: 0.85 }, boneDensity: 95, radiation: 12, psychScore: 74, intensity: 0.70 },
        { name: 'Erik Lindqvist', role: "总工程师", department: 'engineering', mood: 'positive', quote: "4 号模块改造很大胆，但可以做到。我第一次看到大家主动报名加班。", hexaco: { O: 0.46, C: 0.88, E: 0.36, A: 0.63, Em: 0.52, HH: 0.80 }, boneDensity: 93, radiation: 14, psychScore: 76, intensity: 0.62 },
      ],
    },
  },
  {
    type: 'bulletin', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: {
      turn: 3,
      posts: [
        { name: "殖民地公告", role: "官方", department: 'governance', post: "已确认三例妊娠。瓦斯奎兹指挥官承诺建设完整儿科设施，并宣布设立奠基日：“这些孩子就是使命本身。”", mood: 'hopeful', likes: 63, replies: 22 },
      ],
    },
  },
  {
    type: 'turn_done', leader: '指挥官埃琳娜·瓦斯奎兹',
    data: { turn: 3, metrics: { population: 98, morale: 0.82, foodMonthsReserve: 14, waterLitersPerDay: 840, powerKw: 365, infrastructureModules: 4, lifeSupportCapacity: 114, scienceOutput: 16 } },
  },

  // ════════════════════════════════════════════════════════════════════
  // TURN 3 — LEADER B
  // ════════════════════════════════════════════════════════════════════
  {
    type: 'turn_start',
    leader: '指挥官田中弘',
    data: {
      turn: 3, time: 2037,
      title: "第一代火星新生儿",
      crisis: '三位居民怀孕。殖民地需要决定分娩流程、教育设施，以及是否分配稀缺资源建设儿科专区。',
      category: 'social', emergent: true,
      turnSummary: "殖民地正准备迎接第一代在火星出生的人类，这是一个里程碑时刻。",
      metrics: { population: 100, morale: 0.89, foodMonthsReserve: 16.5, waterLitersPerDay: 820, powerKw: 385, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 2 },
    },
  },
  { type: 'specialist_start', leader: '指挥官田中弘', data: { turn: 3, department: 'medical', title: "医疗分析" } },
  {
    type: 'specialist_done', leader: '指挥官田中弘',
    data: {
      turn: 3, department: 'medical',
      summary: "低重力妊娠数据不足。建议采用适配火星的地球标准流程并加强监测，未经同行评审不得采用试验干预。",
      forgedTools: [{ name: 'prenatal_risk_matrix', description: "按孕期阶段综合重力、辐射、营养与心理因素的加权风险评估", approved: true, confidence: 0.93, mode: 'clinical' }],
      citations: 6,
    },
  },
  { type: 'decision_pending', leader: '指挥官田中弘', data: { turn: 3 } },
  {
    type: 'decision_made', leader: '指挥官田中弘',
    data: {
      turn: 3,
      decision: "采取审慎方案。扩建现有医疗舱用于孕产照护，不使用试验性离心设施，遵循地球标准流程并加强监测。",
      rationale: "不能对孕妇实施未经验证的干预，必须采用成熟的医学方法。",
      selectedPolicies: ['medical_expansion', 'standard_protocols', 'enhanced_monitoring'],
    },
  },
  {
    type: 'outcome', leader: '指挥官田中弘',
    data: {
      turn: 3,
      outcome: 'conservative_success',
      _decision: "采取审慎方案。扩建现有医疗舱用于孕产照护，不使用试验性离心设施，遵循地球标准流程并加强监测。",
      _rationale: "不能对孕妇实施未经验证的干预，必须采用成熟的医学方法。",
      _policies: ['medical_expansion', 'standard_protocols', 'enhanced_monitoring'],
      _toolCount: 1, _citeCount: 6,
    },
  },
  {
    type: 'agent_reactions', leader: '指挥官田中弘',
    data: {
      turn: 3,
      totalReactions: 14,
      reactions: [
        { name: 'Dr. Sarah Anderson', role: "首席医疗官", department: 'medical', mood: 'positive', quote: "这个决定正确。医学教材都强调先采用成熟流程，等积累健康分娩数据后再创新。", hexaco: { O: 0.50, C: 0.82, E: 0.45, A: 0.75, Em: 0.60, HH: 0.90 }, boneDensity: 95, radiation: 9, psychScore: 84, intensity: 0.55 },
        { name: 'Dr. Priya Singh', role: "殖民地心理师", department: 'psychology', mood: 'positive', quote: "沉稳的信心发挥了作用，大家感到被照顾，而非被当作试验对象。", hexaco: { O: 0.70, C: 0.68, E: 0.72, A: 0.90, Em: 0.62, HH: 0.82 }, boneDensity: 98, radiation: 5, psychScore: 90, intensity: 0.48 },
      ],
    },
  },
  {
    type: 'bulletin', leader: '指挥官田中弘',
    data: {
      turn: 3,
      posts: [
        { name: "殖民地公告", role: "官方", department: 'governance', post: "医疗舱正在扩建孕产照护设施。田中指挥官拒绝试验性离心设施，采用成熟的地球流程：“我们信任已知的科学。”", mood: 'positive', likes: 38, replies: 5 },
      ],
    },
  },
  {
    type: 'turn_done', leader: '指挥官田中弘',
    data: { turn: 3, metrics: { population: 100, morale: 0.90, foodMonthsReserve: 16, waterLitersPerDay: 815, powerKw: 382, infrastructureModules: 3, lifeSupportCapacity: 120, scienceOutput: 3 } },
  },
  // systems_snapshot events feed SwarmViz's living-canvas. Without
  // these, the Viz step of the tour shows only the empty placeholder.
  ...DEMO_SNAPSHOTS,
];
