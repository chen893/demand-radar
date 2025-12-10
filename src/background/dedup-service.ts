/**
 * 需求去重分析服务
 * v2.1: 使用 LLM 分析需求库中的相似需求，提供分组建议
 */

import type { Demand } from "@/shared/types/demand";
import { llmService } from "./llm";
import { configRepo } from "@/storage";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

/**
 * 去重分析结果
 */
export interface DuplicateAnalysisResult {
  groups: Array<{
    suggestedName: string; // 分组名称
    demandIds: string[]; // 属于这一组的需求 ID
    reason: string; // 归组理由
    commonPainPoints: string[]; // 共同痛点
  }>;
  uniqueDemands: string[]; // 没有找到相似项的需求 ID
  analyzedAt: Date; // 分析时间
  totalAnalyzed: number; // 分析的需求总数
}

/**
 * 用于去重分析的需求数据
 */
interface DemandForDedup {
  id: string;
  title: string;
  description: string;
  targetUser: string;
  keyDifferentiators: string[];
}

/**
 * 去重分析输出结构
 */
const DedupResultSchema = z.object({
  groups: z.array(
    z.object({
      suggestedName: z.string(),
      demandIds: z.array(z.string()),
      reason: z.string(),
      commonPainPoints: z.array(z.string()),
    })
  ),
  uniqueDemands: z.array(z.string()),
});

/**
 * 去重分析服务类
 */
export class DedupService {
  /**
   * 分析需求库中的相似需求
   */
  async analyze(demands: Demand[]): Promise<DuplicateAnalysisResult> {
    // 检查需求数量
    if (demands.length < 5) {
      throw new Error("需要至少 5 个需求才能进行去重分析");
    }

    // 获取 LLM 配置
    const config = await configRepo.getAppConfig();
    if (!config.llm?.apiKey) {
      throw new Error("请先配置 API Key");
    }

    // 配置 LLM 服务
    llmService.setConfig(config.llm);

    // 准备数据
    const demandsForAnalysis = this.prepareDemandsForAnalysis(demands);

    // 生成 Prompt
    const prompt = this.generatePrompt(demandsForAnalysis);

    try {
      // 调用 LLM 分析
      const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0.3,
      });

      const structuredModel = model.withStructuredOutput(DedupResultSchema, {
        strict: true,
      });

      const result = await structuredModel.invoke(prompt);

      // 转换为标准格式
      return {
        groups: result.groups,
        uniqueDemands: result.uniqueDemands,
        analyzedAt: new Date(),
        totalAnalyzed: demands.length,
      };
    } catch (error) {
      console.error("[DedupService] 分析失败:", error);
      throw new Error("去重分析失败，请重试");
    }
  }

  /**
   * 准备需求数据用于分析
   */
  private prepareDemandsForAnalysis(demands: Demand[]): DemandForDedup[] {
    return demands.map((demand) => ({
      id: demand.id,
      title: demand.solution.title,
      description: demand.solution.description.slice(0, 200), // 截断至 200 字
      targetUser: demand.solution.targetUser,
      keyDifferentiators: demand.solution.keyDifferentiators.slice(0, 3), // 只取前 3 个
    }));
  }

  /**
   * 生成去重分析 Prompt
   */
  private generatePrompt(demands: DemandForDedup[]): string {
    const demandsText = demands
      .map((d) => {
        return `
ID: ${d.id}
标题: ${d.title}
描述: ${d.description}
目标用户: ${d.targetUser}
差异点: ${d.keyDifferentiators.join(", ")}`;
      })
      .join("\n---\n");

    return `你是一个产品需求分析专家。请分析以下产品方向列表，找出指向**同一产品机会**的相似方向。

【输入】
${demandsText}

【判断标准】
将以下情况视为「同一产品机会」：
1. 解决同一个核心问题（如「PDF 合并」和「PDF 批处理」都是 PDF 处理需求）
2. 目标用户群体相同或高度重叠
3. 核心差异点有 2 个以上相同

【输出要求】
以 JSON 格式输出：
{
  "groups": [
    {
      "suggestedName": "分组名称（如「PDF 处理工具需求」）",
      "demandIds": ["id1", "id2", "id3"],
      "reason": "为什么认为这些是同一方向（一句话）",
      "commonPainPoints": ["共同痛点1", "共同痛点2"]
    }
  ],
  "uniqueDemands": ["id4", "id5"]
}

【注意事项】
1. 只有确信是同一方向时才归为一组，不确定时保持独立
2. 每组至少 2 个需求
3. 一个需求只能属于一个分组
4. 分组名称应简洁明了，便于用户理解
5. 仅输出 JSON，不要包含其他文本`;
  }
}

/**
 * 去重服务单例
 */
export const dedupService = new DedupService();
