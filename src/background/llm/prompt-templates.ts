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

【任务】
- 提炼不超过 3 个产品方向，优先输出价值最高的方向。
- 每个方向都要有可验证的依据，不要虚构或外推。

【输出格式（仅 JSON）】
请只输出一个 JSON 对象，不要添加 Markdown 代码块或额外解释，字段定义如下：
{
  "summary": "页面内容摘要，100-200 字，覆盖主要讨论点",
  "demands": [
    {
      "solution": {
        "title": "产品名称（1 句话）",
        "description": "详细描述，2-3 句话",
        "targetUser": "目标用户",
        "keyDifferentiators": ["差异点1", "差异点2"]
      },
      "validation": {
        "painPoints": ["用户痛点，引用原文语境"],
        "competitors": ["竞品名称，如无填空数组"],
        "competitorGaps": ["竞品不足或缺口"],
        "quotes": ["原文直接引用，逐条列出，勿编造"]
      }
    }
  ]
}

【注意事项】
1. 所有字符串使用双引号，数组允许为空但不要使用 null。
2. title/description/targetUser/keyDifferentiators/painPoints/quotes 必须源于输入内容，不要凭空生成。
3. 若未识别到产品方向，demands 返回空数组，summary 仍需输出。`;

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
 * v2.1 去重分析 Prompt（结构化输出）
 */
export const DEDUP_ANALYSIS_PROMPT = `
你是一个产品需求分析专家。请分析以下产品方向列表，找出指向**同一产品机会**的相似方向。

【输入】
{demands}

【判断标准】
1. 解决同一个核心问题
2. 目标用户群体相同或高度重叠
3. 核心差异点有 2 个以上相同

【输出格式（仅 JSON）】
- 仅输出一个 JSON 对象，禁止附加解释、Markdown 代码块或注释。
- 字段：
  - groups：相似需求的分组数组；每组至少包含 2 个需求。
    - suggestedName：分组名称，概括共同问题或场景。
    - demandIds：输入中出现的 ID，按原始顺序排列，不要重复。
    - reason：简要说明相似性，需提及共同问题/用户/差异点。
    - commonPainPoints：共同痛点列表，若无法确定则返回 []。
  - uniqueDemands：未出现在任何分组中的 ID 数组，按输入顺序。
- 没有相似项时，groups 为 []，uniqueDemands 包含全部 ID。
示例（请勿添加额外字段）：
{
  "groups": [
    {
      "suggestedName": "示例分组",
      "demandIds": ["id1", "id2"],
      "reason": "两者都解决同一核心问题",
      "commonPainPoints": ["痛点A"]
    }
  ],
  "uniqueDemands": ["id3"]
}
`;

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
