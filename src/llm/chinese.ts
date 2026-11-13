/** 默认生成语言规则；结构化协议和可执行代码保持原有格式。 */
export const CHINESE_OUTPUT_INSTRUCTIONS = `语言要求：所有面向用户的自然语言内容均使用简体中文，包括场景名称、部门名称、角色介绍、事件、分析、决策理由、居民反应、聊天和总结。即使输入或参考资料为英文，也应使用中文归纳。保留 JSON 字段名、规定枚举、内部 ID、代码语法、工具标识、模型名、网址和引用信息。生成代码时，供用户阅读的字符串使用中文。严格遵守要求的 JSON、代码或纯文本格式，不额外添加解释。`;

/** 为新的模型请求添加中文生成约束，不修改输入资料或历史记录。 */
export function chinesePrompt(prompt: string): string {
  return `${prompt}\n\n${CHINESE_OUTPUT_INSTRUCTIONS}`;
}
