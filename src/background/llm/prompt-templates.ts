/**
 * LLM Prompt 模板
 * 用于解决方案提炼和需求去重分析
 */

/**
 * 解决方案提炼 Prompt
 */
export const SOLUTION_EXTRACTION_PROMPT = `# 角色
你是产品机会分析专家，擅长从用户讨论中识别未被满足的需求和潜在产品方向。

# 输入
{content}

# 任务
从输入内容中提炼 0-3 个产品方向，按以下优先级排序：
1. 痛点强度：用户表达的挫败感/抱怨程度
2. 出现频次：多人提及或反复讨论的问题
3. 现有方案缺陷：明确指出竞品不足之处

# 核心约束
- **证据优先**：所有字段必须有原文依据，禁止推测或虚构
- **宁缺毋滥**：找不到有效信号时，demands 返回空数组
- **精准引用**：quotes 必须是原文片段，保留原始表述

# 输出
仅输出 JSON，禁止 Markdown 代码块、注释或额外文字。
{
  "summary": "string, 100-200字, 客观概括讨论主题和关键观点",
  "demands": [
    {
      "solution": {
        "title": "string, 产品方向名称, 10字以内",
        "description": "string, 产品定位描述, 50-100字",
        "targetUser": "string, 目标用户画像",
        "keyDifferentiators": ["string, 核心差异点, 2-4项"]
      },
      "validation": {
        "painPoints": ["string, 用户痛点, 需对应原文语境"],
        "competitors": ["string, 提及的竞品, 无则为空数组"],
        "competitorGaps": ["string, 竞品缺陷或用户不满"],
        "quotes": ["string, 原文直接引用, 支撑上述分析"]
      }
    }
  ]
}

# 边界情况处理
- 内容与产品需求无关（如纯技术讨论/闲聊）→ demands 为空，summary 说明内容性质
- 痛点模糊或缺乏共识 → 不输出该方向
- 竞品未提及 → competitors 和 competitorGaps 为空数组`;

/**
 * 去重分析 Prompt
 */
export const DEDUP_ANALYSIS_PROMPT = `# 角色
你是产品需求分析专家，负责识别指向同一产品机会的重复/相似需求。

# 输入
{demands}

# 相似性判断（满足任意 2 条即可归为一组）
1. **问题同源**：解决的核心用户问题本质相同（表述不同但指向同一痛点）
2. **用户重叠**：目标用户群体相同或有 70%+ 重叠
3. **方案趋同**：产品形态或解决思路高度相似
4. **差异点交集**：keyDifferentiators 有 2+ 项语义相近

# 分组原则
- 每组 ≥ 2 个需求，同一需求只能归入一个组
- 优先合并相似度最高的需求对，再扩展组内成员
- 存疑时倾向于不合并（避免过度聚合）

# 输出
仅输出 JSON，禁止 Markdown 代码块、注释或额外文字。
{
  "groups": [
    {
      "suggestedName": "string, 分组名称, 概括共同问题/场景",
      "demandIds": ["string, 需求ID, 按输入顺序, 不重复"],
      "reason": "string, 相似性依据, 需引用具体字段内容",
      "commonPainPoints": ["string, 共同痛点, 无法确定则为空数组"]
    }
  ],
  "uniqueDemands": ["string, 未归组的需求ID, 按输入顺序"]
}

# 边界情况
- 输入 ≤ 1 条需求 → groups 为空，uniqueDemands 包含全部 ID
- 无相似需求 → groups 为空，uniqueDemands 包含全部 ID
- 所有需求都相似 → uniqueDemands 为空数组`;

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
