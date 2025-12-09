import * as z from "zod";
import { ProviderFactory } from "./provider-factory";
import {
  SOLUTION_EXTRACTION_PROMPT,
  formatPrompt,
} from "./prompt-templates";
import type { LLMConfig } from "@/shared/types/config";
import { ERROR_CODES } from "@/shared/constants";

/**
 * Demand 结构的 Zod Schema (用于 LLM 结构化输出)
 */
const DemandSchema = z.object({
  solution: z.object({
    title: z.string().describe("产品名称（一句话描述）"),
    description: z.string().describe("详细描述（2-3句话）"),
    targetUser: z.string().describe("目标用户"),
    keyDifferentiators: z.array(z.string()).describe("核心差异点（3-5个）"),
  }),
  validation: z.object({
    painPoints: z.array(z.string()).describe("用户痛点"),
    competitors: z.array(z.string()).describe("竞品名称"),
    competitorGaps: z.array(z.string()).describe("竞品不足"),
    quotes: z.array(z.string()).describe("原文证据"),
  }),
});

/**
 * 分析结果的 Zod Schema
 */
const AnalysisResultSchema = z.object({
  summary: z.string().describe("页面内容摘要（100-200字）"),
  demands: z.array(DemandSchema).describe("产品方向列表（最多3个）"),
});

/**
 * 分析结果类型
 */
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * LLM 服务错误
 */
export class LLMServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "LLMServiceError";
  }
}

/**
 * LLM 服务类
 * 负责调用 LLM 进行内容分析
 */
export class LLMService {
  private config: LLMConfig | null = null;

  /**
   * 设置 LLM 配置
   */
  setConfig(config: LLMConfig): void {
    this.config = config;
  }

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig | null {
    return this.config;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new LLMServiceError(
        "LLM not configured",
        ERROR_CODES.API_KEY_NOT_CONFIGURED,
        false
      );
    }
    return ProviderFactory.testConnection(this.config);
  }

  /**
   * 分析内容并提取产品方向
   */
  async analyze(content: string): Promise<AnalysisResult> {
    if (!this.config) {
      throw new LLMServiceError(
        "LLM not configured",
        ERROR_CODES.API_KEY_NOT_CONFIGURED,
        false
      );
    }

    try {
      const model = ProviderFactory.create(this.config);

      // 使用 withStructuredOutput 获取结构化输出
      const modelWithStructure = model.withStructuredOutput(AnalysisResultSchema, {
        name: "extract_product_opportunities",
      });

      // 格式化 Prompt
      const prompt = formatPrompt(SOLUTION_EXTRACTION_PROMPT, { content });

      // 调用 LLM
      const result = await modelWithStructure.invoke(prompt);

      return result as AnalysisResult;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 流式分析内容（用于实时反馈）
   */
  async *analyzeStream(content: string): AsyncGenerator<string> {
    if (!this.config) {
      throw new LLMServiceError(
        "LLM not configured",
        ERROR_CODES.API_KEY_NOT_CONFIGURED,
        false
      );
    }

    try {
      const model = ProviderFactory.create(this.config);

      // 格式化 Prompt
      const prompt = formatPrompt(SOLUTION_EXTRACTION_PROMPT, { content });

      // 流式输出
      const stream = await model.stream(prompt);

      for await (const chunk of stream) {
        if (typeof chunk.content === "string") {
          yield chunk.content;
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 解析流式输出的 JSON 结果
   */
  parseStreamResult(fullText: string): AnalysisResult | null {
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return AnalysisResultSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse stream result:", error);
      return null;
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: unknown): LLMServiceError {
    console.error("LLM Service Error:", error);

    // 网络错误
    if (error instanceof TypeError && String(error).includes("fetch")) {
      return new LLMServiceError(
        "Network error",
        ERROR_CODES.NETWORK_ERROR,
        true
      );
    }

    // HTTP 错误
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status: number }).status;

      switch (status) {
        case 401:
          return new LLMServiceError(
            "Invalid API key",
            ERROR_CODES.API_KEY_INVALID,
            false
          );
        case 429:
          return new LLMServiceError(
            "Quota exceeded",
            ERROR_CODES.QUOTA_EXCEEDED,
            false
          );
        case 500:
        case 502:
        case 503:
          return new LLMServiceError(
            "Service unavailable",
            ERROR_CODES.NETWORK_ERROR,
            true
          );
      }
    }

    // 解析错误
    if (error instanceof z.ZodError) {
      return new LLMServiceError(
        "Failed to parse LLM response",
        ERROR_CODES.PARSE_ERROR,
        true
      );
    }

    // 其他错误
    return new LLMServiceError(
      error instanceof Error ? error.message : String(error),
      ERROR_CODES.UNKNOWN,
      false
    );
  }
}

/**
 * LLM 服务单例
 */
export const llmService = new LLMService();

// 导出类型和模板
export { AnalysisResultSchema, DemandSchema };
export { formatPrompt, SOLUTION_EXTRACTION_PROMPT } from "./prompt-templates";
export { ProviderFactory } from "./provider-factory";
