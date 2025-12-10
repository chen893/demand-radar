import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { LLMConfig } from "@/shared/types/config";
import { PROVIDER_PRESETS } from "@/shared/constants";

/**
 * LLM Provider 工厂
 * 根据配置创建对应的 LangChain Chat Model
 */
export class ProviderFactory {
  /**
   * 创建 LLM Provider 实例
   */
  static create(config: LLMConfig): BaseChatModel {
    switch (config.provider) {
      case "openai":
        return ProviderFactory.createOpenAI(config);

      case "google":
        return ProviderFactory.createGoogle(config);

      case "deepseek":
        return ProviderFactory.createDeepSeek(config);

      case "custom":
        return ProviderFactory.createCustom(config);

      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * 创建 OpenAI Provider
   */
  private static createOpenAI(config: LLMConfig): ChatOpenAI {
    return new ChatOpenAI({
      model: config.modelName || PROVIDER_PRESETS.openai.defaultModel,
      apiKey: config.apiKey,
      streaming: true,
      temperature: 0.7,
      maxTokens: 4096,
    });
  }

  /**
   * 创建 Google Gemini Provider
   */
  private static createGoogle(config: LLMConfig): ChatGoogleGenerativeAI {
    return new ChatGoogleGenerativeAI({
      model: config.modelName || PROVIDER_PRESETS.google.defaultModel,
      apiKey: config.apiKey,
      maxOutputTokens: 4096,
      temperature: 0.7,
    });
  }

  /**
   * 创建 DeepSeek Provider (使用 OpenAI 兼容 API)
   */
  private static createDeepSeek(config: LLMConfig): ChatOpenAI {
    return new ChatOpenAI({
      model: config.modelName || PROVIDER_PRESETS.deepseek.defaultModel,
      apiKey: config.apiKey,
      configuration: {
        baseURL: PROVIDER_PRESETS.deepseek.baseUrl,
      },
      streaming: true,
      temperature: 0.7,
      maxTokens: 4096,
    });
  }

  /**
   * 创建自定义 Provider (OpenAI 兼容)
   */
  private static createCustom(config: LLMConfig): ChatOpenAI {
    if (!config.baseUrl) {
      throw new Error("Custom provider requires baseUrl");
    }
    if (!config.modelName) {
      throw new Error("Custom provider requires modelName");
    }

    return new ChatOpenAI({
      model: config.modelName,
      apiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl,
      },
      streaming: true,
      temperature: 0.7,
      maxTokens: 4096,
    });
  }

  /**
   * 测试连接
   */
  static async testConnection(config: LLMConfig): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const model = ProviderFactory.create(config);
      await model.invoke("Hello", { signal: controller.signal });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("LLM connection test timed out");
      } else {
        console.error("LLM connection test failed:", error);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
