/**
 * LLM Prompt 模板
 * 用于解决方案提炼和需求去重分析
 */

/**
 * 解决方案提炼 Prompt
 */
export const SOLUTION_EXTRACTION_PROMPT = `你是一个产品机会分析专家。请从以下用户讨论内容中提炼可能的产品方向。

【输入内容】
{content}

【输出要求】
请分析内容并提取产品机会。对于每个识别到的产品方向，需要提供：

1. 解决方案（solution）：
   - title: 产品名称（一句话描述）
   - description: 详细描述（2-3句话，说明是什么产品）
   - targetUser: 目标用户（谁会用这个产品）
   - keyDifferentiators: 核心差异点（3-5个，说明与现有方案的不同）

2. 验证依据（validation）：
   - painPoints: 用户痛点（从原文中识别的痛点）
   - competitors: 竞品名称（用户提到的现有工具）
   - competitorGaps: 竞品不足（现有工具的问题）
   - quotes: 原文证据（直接引用用户原话，必须是原文中的内容）

3. 摘要（summary）：页面内容摘要（100-200字）

【注意事项】
1. keyDifferentiators 应该是具体的、可执行的差异点
2. quotes 必须是原文中的实际内容，不要编造
3. 如果内容中没有明显的产品机会，返回空数组
4. 最多输出 3 个产品方向，优先输出最有价值的
5. 使用中文输出`;

/**
 * 需求去重分析 Prompt (P1 功能)
 */
export const DEDUPLICATION_PROMPT = `你是一个产品需求分析专家。请分析以下产品方向列表，找出指向同一产品机会的相似方向。

【输入】
{demands}

【输出要求】
找出相似的需求并分组，对于每组：
- suggestedName: 分组名称（如「PDF 工具需求」）
- demandIds: 属于这一组的需求 ID 列表
- reason: 为什么认为这些是同一方向

对于没有重复的需求，放入 uniqueDemands 数组。

【判断标准】
- 解决同一个核心问题
- 目标用户群体相同
- 核心差异点高度重叠`;

/**
 * 格式化 Prompt（替换占位符）
 */
export function formatPrompt(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}
