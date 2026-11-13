export type DashboardEconomicsProfileId =
  | 'economy'
  | 'balanced'
  | 'quality'
  | 'deterministic_first';

export type DashboardServerMode = 'local_demo' | 'hosted_demo' | 'platform_api';

export const ECONOMICS_PROFILE_OPTIONS: Array<{
  value: DashboardEconomicsProfileId;
  label: string;
  description: string;
}> = [
  {
    value: 'economy',
    label: "经济",
    description: "最低费用：按需研究、经济型结论评估及更严格的费用控制。",
  },
  {
    value: 'balanced',
    label: "均衡",
    description: "适用于常规运行的默认组合，兼顾质量和费用。",
  },
  {
    value: 'quality',
    label: "高质量",
    description: '优先提高战略角色与结论汇总的质量，适用于更重视质量的运行。',
  },
  {
    value: 'deterministic_first',
    label: "优先确定性计算",
    description: '跳过结论汇总与实时搜索升级，降低结果波动和费用。',
  },
];

export function describeServerMode(mode: DashboardServerMode): { label: string; description: string } {
  switch (mode) {
    case 'hosted_demo':
      return {
        label: "托管演示",
        description: '由服务器承担费用，运行次数受限，并使用经济配置的费用保护。',
      };
    case 'platform_api':
      return {
        label: "平台 API",
        description: '启用需要认证的 /api/v1/* 接口，使用平台服务配置。',
      };
    case 'local_demo':
    default:
      return {
        label: "本地演示",
        description: '单进程本地服务器，适合探索产品功能。',
      };
  }
}
