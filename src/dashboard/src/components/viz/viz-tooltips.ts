/**
 * One-line plain-English tooltip text for every labeled element on the
 * VIZ tab. Centralized here so a future i18n pass has one file to
 * translate. SwarmViz, VizLegendBar, HighlightStrip, and the Tile
 * outline labels all read from this table.
 *
 * Copy budget: 10–160 chars per entry. Longer text belongs in the
 * full-legend popover, not in a hover tooltip.
 *
 * @module viz/viz-tooltips
 */
export const VIZ_TOOLTIPS = {
  'tab.living': "此回合仍然存活、显示在场景网格中的成员。",
  'tab.mood': "各决策者的综合情绪分布：充满希望／平静／焦虑／消极。",
  'tab.forge': "成员本回合在 V8 沙箱中动态创建的计算工具。",
  'tab.ecology': "资源与环境指标：功率、食物、水和辐射。",
  'tab.divergence': "各回合中两侧各项指标的差值。",
  'badge.forge': "本回合的工具创建尝试，点击工具创建查看详情。",
  'badge.divergence': "本回合出现指标分歧，点击分歧查看对比。",
  'stat.morale': "全部存活成员的综合士气（0～100%）。",
  'stat.moodMix': "按士气加权的四档情绪分布。",
  'stat.alive': "当前回合此侧的存活成员。",
  'stat.age': "存活成员年龄分布（低于 20 岁／20～40 岁／40～60 岁／60 岁以上）。",
  'stat.paired': "已建立伴侣关系的存活成员。",
  'stat.earth': "在地球出生的成员，与场景内出生的成员区分。",
  'stat.native': "在场景所在地出生的成员（如火星或月球出生）。",
  'stat.depts': "按部门统计人数，悬停扇区查看部门名称。",
  'chip.rising': "综合士气较上一回合上升。",
} as const;

export type VizTooltipKey = keyof typeof VIZ_TOOLTIPS;
