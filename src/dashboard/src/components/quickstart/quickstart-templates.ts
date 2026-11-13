/**
 * Pre-written Quickstart scenario seeds — same five templates the
 * marketing landing page surfaces as `?prompt=` chips, but exported as
 * structured data so the dashboard's SeedInput can mount them in a
 * dropdown picker. Visitors who land directly on /sim no longer have
 * to bounce back to the landing page to grab a sample prompt.
 *
 * If the landing-page chip list changes, mirror the change here. The
 * label is what shows in the dropdown; the seedText is the full prompt
 * that lands in the textarea on selection.
 *
 * @module paracosm/dashboard/quickstart/quickstart-templates
 */

export interface QuickstartTemplate {
  /** Stable id used for telemetry + as the React key. */
  id: string;
  /** Short "What if …?" label that appears in the dropdown. */
  label: string;
  /** Full seed text that populates the WRITE textarea on selection. */
  seedText: string;
}

export const QUICKSTART_TEMPLATES: ReadonlyArray<QuickstartTemplate> = [
  {
    "id": "hurricane-evacuation",
    "label": "如果沿海市长只有 36 小时组织台风前疏散，会怎样？",
    "seedText": "一座拥有 80 万人口的沿海都市，预计将在 36 小时后遭遇四级飓风登陆。市长必须决定是否立即全面疏散，或按照风险分区逐步撤离。三个城区共用一座跨海大桥，区域医院需要转运重症患者，燃料储备有限，老旧堤防存在失效风险。应急管理部门负责预警、避难所与撤离顺序，公共卫生部门评估医院和弱势群体需求，交通部门安排公交与道路容量，公用事业部门维持供电供水，宣传部门发布清晰一致的信息。请比较不同领导风格下的伤亡风险、撤离完成率、居民信任、基础设施损失和财政支出，考虑天气预测变化、交通拥堵和居民不愿撤离等情况，模拟从准备到灾后初期的决策过程。"
  },
  {
    "id": "saas-mid-tier",
    "label": "如果开发者工具 SaaS 增加每月 14 美元的中间档套餐，会怎样？",
    "seedText": "StackPulse 是提供日志、指标和链路追踪的开发者 SaaS，主要服务于融资 B 至 D 轮、工程团队规模为 5 至 50 人的初创企业。公司拟在免费套餐与每月 29 美元的专业套餐之间增加每月 14 美元的中间档，开放专业套餐约 60% 的功能。中间档日志保留 7 天、链路采样比例为 10%，专业档日志保留 30 天并支持完整采样。现有付费用户为 18 万人，以工程经理和可靠性工程师为主，他们需要在 15 分钟内排查线上故障，并向企业客户证明服务可靠性。现有专业档用户享有 90 天原待遇保护。竞争对手包括 Datadog、Honeycomb 和自托管 Grafana。请由定价、增长、客户成功、财务和工程部门共同分析，模拟六个月内免费转付费、专业档降级、平均收入和流失率的变化。"
  },
  {
    "id": "ai-lab-early-release",
    "label": "如果 AI 实验室提前六周发布前沿模型，会怎样？",
    "seedText": "一家 AI 实验室需要决定是否将前沿多模态模型提前六周发布。两位评估人员在长时程智能体任务中发现 4.2% 的规范投机行为，并在偏好优化训练下观察到潜在内部目标的早期信号。另一家实验室能力较弱的模型即将按计划上线，有望获得约 2.4 亿美元的企业年度经常性收入。提前发布可能赢得客户和开发者生态，继续评估则可能降低安全事故与治理风险，但会增加算力成本和商业机会损失。对齐、能力研究、政策治理、基础设施与传播部门分别提出建议。请模拟六周到后续商业化阶段的多轮决策，比较谨慎评估型与竞争进取型领导者的选择，跟踪安全评估覆盖、能力表现、收入、用户信任和监管压力，并考虑竞争对手行动和新发现的模型缺陷。"
  },
  {
    "id": "generation-ship-fuel-leak",
    "label": "如果世代飞船在航行第 18 年发现燃料泄漏，会怎样？",
    "seedText": "一艘承载 2400 名乘客的世代飞船正在执行计划为期 40 年的星际航行，在第 18 年发现主反应堆系统存在缓慢燃料泄漏。工程人员建议进行舱外维修，虽然可能及时恢复推力，但有人员伤亡和扩大损坏的风险。指挥团队的另一种方案是降低推力继续航行，这可能使旅程延长 14 年，增加生命保障、医疗、食物和代际治理的压力。请让工程、生命保障、医疗、心理和指挥部门分别评估建议，比较不同人格指挥官如何权衡维修风险、剩余燃料、人口健康、士气和资源储备。模拟多个关键时间点的决策，并考虑设备老化、乘客对延期的不满、新生人口和技术人员退休造成的技能缺口，评估飞船最终抵达目标星系的可行性与代价。"
  },
  {
    "id": "city-congestion-pricing",
    "label": "如果一座城市试行 12 个月交通拥堵收费，会怎样？",
    "seedText": "一座拥有 65 万人口的中等城市，计划在市中心试行 12 个月交通拥堵收费。工作日早 6 点至晚 7 点，车辆进入中央商务区需支付高峰期 9 美元、非高峰期 3 美元的费用。收费收入用于建设两条快速公交线路，并为低收入乘客提供 30% 的公共交通票价减免。居民、通勤者、小商户、公交运营方和市政府对方案有不同利益诉求。交通部门分析车流和公交承载力，财政部门核算收入与成本，商业部门跟踪商户收入，公共政策部门评估公平性，传播部门负责沟通。请按季度模拟实施过程，比较道路拥堵、车辆行驶里程、公交客流、商户营收、低收入群体负担和公众支持度，考虑车辆绕行、公交建设延误及政治压力，并在试点结束时决定延续、调整或终止政策。"
  }
];
