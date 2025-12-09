/**
 * Service Worker 消息处理器
 * 处理 Side Panel、Content Script 和其他组件之间的消息通信
 */

import { llmService, type AnalysisResult } from "./llm";
import {
  extractionRepo,
  demandRepo,
  configRepo,
  capacityManager,
  db,
} from "@/storage";
import { piiFilter } from "@/shared/utils/pii-filter";
import {
  MessageType,
  type Message,
  type MessageResponse,
  type AnalysisResultPayload,
  type AnalysisErrorPayload,
} from "@/shared/types/messages";
import type { Extraction } from "@/shared/types/extraction";
import type { Demand, DemandInput } from "@/shared/types/demand";
import type { LLMConfig } from "@/shared/types/config";
import { ERROR_CODES } from "@/shared/constants";
import { generateId, truncateText } from "@/shared/utils/text-utils";

/**
 * 消息处理器类
 * 负责路由和处理所有扩展内部消息
 */
export class MessageHandler {
  /**
   * 主消息路由
   */
  async handleMessage(
    message: Message,
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    console.log("[Background] Received message:", message.type);

    try {
      switch (message.type) {
        // 分析相关
        case MessageType.ANALYZE_CURRENT_PAGE:
          return await this.handleAnalyzeCurrentPage(sender.tab?.id);

        case MessageType.QUICK_SAVE_CURRENT_PAGE:
          return await this.handleQuickSave(sender.tab?.id);

        // LLM 配置
        case MessageType.TEST_LLM_CONNECTION:
          return await this.handleTestConnection(message.payload as LLMConfig);

        case MessageType.GET_CONFIG:
          return await this.handleGetConfig();

        case MessageType.UPDATE_CONFIG:
          return await this.handleUpdateConfig(message.payload as LLMConfig);

        // 需求操作
        case MessageType.SAVE_DEMANDS:
          return await this.handleSaveDemands(message.payload as DemandInput[]);

        case MessageType.GET_DEMANDS:
          return await this.handleGetDemands(message.payload as { query?: string; starred?: boolean; archived?: boolean });

        case MessageType.GET_DEMAND_BY_ID:
          return await this.handleGetDemandById(message.payload as string);

        case MessageType.UPDATE_DEMAND:
          return await this.handleUpdateDemand(message.payload as { id: string; updates: Partial<Demand> });

        case MessageType.DELETE_DEMAND:
          return await this.handleDeleteDemand(message.payload as string);

        case MessageType.SEARCH_DEMANDS:
          return await this.handleSearchDemands(message.payload as string);

        // 提取记录操作
        case MessageType.GET_EXTRACTIONS:
          return await this.handleGetExtractions();

        case MessageType.GET_EXTRACTION_BY_ID:
          return await this.handleGetExtractionById(message.payload as string);

        case MessageType.DELETE_EXTRACTION:
          return await this.handleDeleteExtraction(message.payload as string);

        // 存储操作
        case MessageType.GET_STORAGE_USAGE:
          return await this.handleGetStorageUsage();

        case MessageType.EXPORT_DATA:
          return await this.handleExportData();

        case MessageType.CLEAR_DATA:
          return await this.handleClearData();

        // 页面状态
        case MessageType.PAGE_INFO_UPDATED:
          return this.handlePageInfoUpdated(message.payload);

        default:
          return {
            success: false,
            error: `Unknown message type: ${message.type}`,
          };
      }
    } catch (error) {
      console.error("[Background] Message handling error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 处理分析当前页面请求
   */
  private async handleAnalyzeCurrentPage(
    tabId?: number
  ): Promise<MessageResponse> {
    if (!tabId) {
      return { success: false, error: "No active tab" };
    }

    // 检查 LLM 配置
    const config = await configRepo.get();
    if (!config?.llmConfig?.apiKey) {
      this.broadcastToPanel({
        type: MessageType.ANALYSIS_ERROR,
        payload: {
          code: ERROR_CODES.API_KEY_NOT_CONFIGURED,
          message: "请先配置 API Key",
          action: "settings",
        } as AnalysisErrorPayload,
      });
      return { success: false, error: "LLM not configured" };
    }

    // 配置 LLM 服务
    llmService.setConfig(config.llmConfig);

    // 通知开始分析
    this.broadcastToPanel({
      type: MessageType.ANALYSIS_STARTED,
    });

    try {
      // 1. 请求 Content Script 提取内容
      const extractionResult = await this.sendToContentScript(tabId, {
        type: MessageType.EXTRACT_CONTENT,
      });

      if (!extractionResult.success) {
        throw new Error(extractionResult.error || "Content extraction failed");
      }

      const extraction = extractionResult.data;
      const contentText = extraction.content.body;

      // 2. 检查存储容量
      const capacityCheck = await capacityManager.canStore(contentText.length);
      if (!capacityCheck.allowed) {
        this.broadcastToPanel({
          type: MessageType.ANALYSIS_ERROR,
          payload: {
            code: ERROR_CODES.STORAGE_FULL,
            message: capacityCheck.warning || "存储已满",
            action: "cleanup",
          } as AnalysisErrorPayload,
        });
        return { success: false, error: "Storage full" };
      }

      // 3. PII 脱敏（仅发送给 LLM 前执行）
      const sanitizedContent = piiFilter.sanitize(contentText);

      // 4. 截断内容（防止超长）
      const { text: truncatedContent, truncated } = truncateText(sanitizedContent, 20000);

      // 5. 调用 LLM 分析
      const analysisResult = await llmService.analyze(truncatedContent);

      // 6. 创建提取记录
      const extractionId = generateId();
      const extractionRecord: Extraction = {
        id: extractionId,
        url: extraction.content.metadata.url,
        title: extraction.content.title,
        platform: extraction.platform,
        originalText: contentText, // 保存原文（未脱敏）
        summary: analysisResult.summary,
        analysisStatus: "completed",
        demandCount: analysisResult.demands.length,
        savedDemandCount: 0,
        truncated,
        originalLength: contentText.length,
        capturedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await extractionRepo.create(extractionRecord);

      // 7. 构建返回的需求列表（添加 ID 和来源信息）
      const demandsWithMeta: AnalysisResultPayload = {
        extractionId,
        summary: analysisResult.summary,
        demands: analysisResult.demands.map((demand) => ({
          id: generateId(),
          solution: demand.solution,
          validation: demand.validation,
        })),
      };

      // 8. 通知分析完成
      this.broadcastToPanel({
        type: MessageType.ANALYSIS_COMPLETE,
        payload: demandsWithMeta,
      });

      return { success: true, data: demandsWithMeta };
    } catch (error) {
      console.error("[Background] Analysis error:", error);

      const errorPayload = this.classifyError(error);
      this.broadcastToPanel({
        type: MessageType.ANALYSIS_ERROR,
        payload: errorPayload,
      });

      return { success: false, error: errorPayload.message };
    }
  }

  /**
   * 处理快速保存请求
   */
  private async handleQuickSave(tabId?: number): Promise<MessageResponse> {
    if (!tabId) {
      return { success: false, error: "No active tab" };
    }

    try {
      // 请求 Content Script 提取内容
      const extractionResult = await this.sendToContentScript(tabId, {
        type: MessageType.EXTRACT_CONTENT,
      });

      if (!extractionResult.success) {
        throw new Error(extractionResult.error || "Content extraction failed");
      }

      const extraction = extractionResult.data;
      const contentText = extraction.content.body;

      // 检查存储容量
      const capacityCheck = await capacityManager.canStore(contentText.length);
      if (!capacityCheck.allowed) {
        this.broadcastToPanel({
          type: MessageType.QUICK_SAVE_ERROR,
          payload: {
            code: ERROR_CODES.STORAGE_FULL,
            message: capacityCheck.warning || "存储已满",
          },
        });
        return { success: false, error: "Storage full" };
      }

      // 创建提取记录（待分析状态）
      const extractionId = generateId();
      const { text: truncatedText, truncated } = truncateText(contentText, 20000);

      const extractionRecord: Extraction = {
        id: extractionId,
        url: extraction.content.metadata.url,
        title: extraction.content.title,
        platform: extraction.platform,
        originalText: truncated ? truncatedText : contentText,
        summary: "",
        analysisStatus: "pending",
        demandCount: 0,
        savedDemandCount: 0,
        truncated,
        originalLength: contentText.length,
        capturedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await extractionRepo.create(extractionRecord);

      // 通知保存完成
      this.broadcastToPanel({
        type: MessageType.QUICK_SAVE_COMPLETE,
        payload: { extractionId },
      });

      return { success: true, data: { extractionId } };
    } catch (error) {
      console.error("[Background] Quick save error:", error);

      this.broadcastToPanel({
        type: MessageType.QUICK_SAVE_ERROR,
        payload: {
          code: ERROR_CODES.UNKNOWN,
          message: error instanceof Error ? error.message : "保存失败",
        },
      });

      return { success: false, error: String(error) };
    }
  }

  /**
   * 测试 LLM 连接
   */
  private async handleTestConnection(
    config: LLMConfig
  ): Promise<MessageResponse> {
    try {
      llmService.setConfig(config);
      const success = await llmService.testConnection();
      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  /**
   * 获取配置
   */
  private async handleGetConfig(): Promise<MessageResponse> {
    const config = await configRepo.get();
    return { success: true, data: config };
  }

  /**
   * 更新配置
   */
  private async handleUpdateConfig(
    llmConfig: LLMConfig
  ): Promise<MessageResponse> {
    await configRepo.setLLMConfig(llmConfig);
    llmService.setConfig(llmConfig);
    return { success: true };
  }

  /**
   * 保存需求
   */
  private async handleSaveDemands(
    demandsInput: DemandInput[]
  ): Promise<MessageResponse> {
    try {
      // 转换为 CreateDemandParams 格式
      const createParams = demandsInput.map((input) => ({
        extractionId: input.extractionId,
        solution: input.solution,
        validation: input.validation,
        sourceUrl: input.sourceUrl || "",
        sourceTitle: input.sourceTitle || "",
        sourcePlatform: input.sourcePlatform || "generic",
        tags: input.tags || [],
      }));

      const demands = await demandRepo.createMany(createParams);

      // 更新提取记录的保存计数
      if (demands.length > 0 && demands[0].extractionId) {
        const extraction = await extractionRepo.getById(demands[0].extractionId);
        if (extraction) {
          await extractionRepo.update(demands[0].extractionId, {
            savedDemandCount: extraction.savedDemandCount + demands.length,
          });
        }
      }

      return { success: true, data: { savedCount: demands.length } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save demands",
      };
    }
  }

  /**
   * 获取需求列表
   */
  private async handleGetDemands(
    options?: { query?: string; starred?: boolean; archived?: boolean }
  ): Promise<MessageResponse> {
    let demands: Demand[];

    if (options?.query) {
      demands = await demandRepo.search(options.query);
    } else if (options?.starred) {
      demands = await demandRepo.getStarred();
    } else if (options?.archived) {
      demands = await demandRepo.getArchived();
    } else {
      demands = await demandRepo.getAll();
    }

    return { success: true, data: demands };
  }

  /**
   * 获取单个需求
   */
  private async handleGetDemandById(id: string): Promise<MessageResponse> {
    const demand = await demandRepo.getById(id);
    if (!demand) {
      return { success: false, error: "Demand not found" };
    }
    return { success: true, data: demand };
  }

  /**
   * 更新需求
   */
  private async handleUpdateDemand(payload: {
    id: string;
    updates: Partial<Demand>;
  }): Promise<MessageResponse> {
    await demandRepo.update(payload.id, payload.updates);
    return { success: true };
  }

  /**
   * 删除需求
   */
  private async handleDeleteDemand(id: string): Promise<MessageResponse> {
    await demandRepo.delete(id);
    return { success: true };
  }

  /**
   * 搜索需求
   */
  private async handleSearchDemands(query: string): Promise<MessageResponse> {
    const demands = await demandRepo.search(query);
    return { success: true, data: demands };
  }

  /**
   * 获取提取记录列表
   */
  private async handleGetExtractions(): Promise<MessageResponse> {
    const extractions = await extractionRepo.getAll();
    return { success: true, data: extractions };
  }

  /**
   * 获取单个提取记录
   */
  private async handleGetExtractionById(id: string): Promise<MessageResponse> {
    const extraction = await extractionRepo.getById(id);
    if (!extraction) {
      return { success: false, error: "Extraction not found" };
    }
    return { success: true, data: extraction };
  }

  /**
   * 删除提取记录
   */
  private async handleDeleteExtraction(id: string): Promise<MessageResponse> {
    // 同时删除关联的需求
    const demands = await demandRepo.getByExtractionId(id);
    if (demands.length > 0) {
      await demandRepo.deleteMany(demands.map((d) => d.id));
    }
    await extractionRepo.delete(id);
    return { success: true };
  }

  /**
   * 获取存储使用情况
   */
  private async handleGetStorageUsage(): Promise<MessageResponse> {
    const usage = await capacityManager.getUsage();
    return { success: true, data: usage };
  }

  /**
   * 导出数据
   */
  private async handleExportData(): Promise<MessageResponse> {
    const extractions = await extractionRepo.getAll();
    const demands = await demandRepo.getAll();
    const config = await configRepo.get();

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      extractions,
      demands,
      // 不导出 API Key
      config: config
        ? {
            siteWhitelist: config.siteWhitelist,
            siteBlacklist: config.siteBlacklist,
          }
        : null,
    };

    return { success: true, data: exportData };
  }

  /**
   * 清空数据
   */
  private async handleClearData(): Promise<MessageResponse> {
    await db.extractions.clear();
    await db.demands.clear();
    return { success: true };
  }

  /**
   * 处理页面信息更新
   */
  private handlePageInfoUpdated(payload: unknown): MessageResponse {
    // 转发给 Side Panel
    this.broadcastToPanel({
      type: MessageType.PAGE_INFO_UPDATED,
      payload,
    });
    return { success: true };
  }

  /**
   * 向 Content Script 发送消息
   */
  private async sendToContentScript(
    tabId: number,
    message: Message
  ): Promise<MessageResponse> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          resolve(response || { success: false, error: "No response" });
        }
      });
    });
  }

  /**
   * 广播消息给 Side Panel
   */
  private broadcastToPanel(message: Message): void {
    chrome.runtime.sendMessage(message).catch(() => {
      // Side Panel 可能未打开，忽略错误
    });
  }

  /**
   * 错误分类
   */
  private classifyError(error: unknown): AnalysisErrorPayload {
    const errorObj = error as { status?: number; code?: string; message?: string };

    // HTTP 状态码错误
    if (errorObj.status) {
      switch (errorObj.status) {
        case 401:
          return {
            code: ERROR_CODES.API_KEY_INVALID,
            message: "API Key 无效，请检查设置",
            action: "settings",
          };
        case 429:
          return {
            code: ERROR_CODES.QUOTA_EXCEEDED,
            message: "API 调用额度已用尽",
            action: "quota",
          };
        case 500:
        case 502:
        case 503:
          return {
            code: ERROR_CODES.NETWORK_ERROR,
            message: "服务暂时不可用，请稍后重试",
            action: "retry",
          };
      }
    }

    // 网络错误
    if (error instanceof TypeError && String(error).includes("fetch")) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: "网络连接失败，请检查网络",
        action: "retry",
      };
    }

    // 解析错误
    if (errorObj.code === ERROR_CODES.PARSE_ERROR) {
      return {
        code: ERROR_CODES.PARSE_ERROR,
        message: "分析结果解析失败",
        action: "retry",
      };
    }

    // 默认错误
    return {
      code: ERROR_CODES.UNKNOWN,
      message: errorObj.message || "分析失败，请重试",
      action: "retry",
    };
  }
}

/**
 * 消息处理器单例
 */
export const messageHandler = new MessageHandler();
