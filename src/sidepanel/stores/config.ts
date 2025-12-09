/**
 * 配置状态管理
 * 管理 LLM 配置和应用设置
 */

import { create } from "zustand";
import type { LLMConfig, AppConfig } from "@/shared/types/config";
import type { StorageUsage } from "@/storage/capacity-manager";
import { MessageType } from "@/shared/types/messages";
import { PROVIDER_PRESETS } from "@/shared/constants";

interface ConfigState {
  // 配置状态
  llmConfig: LLMConfig | null;
  siteWhitelist: string[];
  siteBlacklist: string[];
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;

  // 存储使用
  storageUsage: StorageUsage | null;

  // 连接测试
  isTesting: boolean;
  testResult: "success" | "error" | null;

  // 操作
  fetchConfig: () => Promise<void>;
  setLLMConfig: (config: LLMConfig) => Promise<void>;
  testConnection: (config: LLMConfig) => Promise<boolean>;
  fetchStorageUsage: () => Promise<void>;
  addToWhitelist: (site: string) => Promise<void>;
  removeFromWhitelist: (site: string) => Promise<void>;
  clearError: () => void;
  clearTestResult: () => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  // 初始状态
  llmConfig: null,
  siteWhitelist: [],
  siteBlacklist: [],
  isConfigured: false,
  isLoading: false,
  error: null,
  storageUsage: null,
  isTesting: false,
  testResult: null,

  // 获取配置
  fetchConfig: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_CONFIG,
      });

      if (response.success && response.data) {
        const config = response.data as AppConfig;
        set({
          llmConfig: config.llm,
          siteWhitelist: config.siteFilter.whitelist,
          siteBlacklist: config.siteFilter.blacklist,
          isConfigured: !!config.llm?.apiKey,
          isLoading: false,
        });
      } else {
        // 无配置，使用默认值
        set({
          llmConfig: null,
          siteWhitelist: ["*.reddit.com", "*.zhihu.com"],
          siteBlacklist: ["*.bank.*", "mail.*", "*.gov.*"],
          isConfigured: false,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "获取配置失败",
        isLoading: false,
      });
    }
  },

  // 设置 LLM 配置
  setLLMConfig: async (config) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_CONFIG,
        payload: config,
      });

      if (response.success) {
        set({
          llmConfig: config,
          isConfigured: !!config.apiKey,
        });
      } else {
        set({ error: response.error || "保存配置失败" });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "保存配置失败",
      });
    }
  },

  // 测试连接
  testConnection: async (config) => {
    set({ isTesting: true, testResult: null, error: null });

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.TEST_LLM_CONNECTION,
        payload: config,
      });

      const success = response.success;
      set({
        isTesting: false,
        testResult: success ? "success" : "error",
      });
      return success;
    } catch (error) {
      set({
        isTesting: false,
        testResult: "error",
        error: error instanceof Error ? error.message : "连接测试失败",
      });
      return false;
    }
  },

  // 获取存储使用情况
  fetchStorageUsage: async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_STORAGE_USAGE,
      });

      if (response.success) {
        set({ storageUsage: response.data });
      }
    } catch (error) {
      console.error("Failed to fetch storage usage:", error);
    }
  },

  // 添加到白名单
  addToWhitelist: async (site) => {
    const { siteWhitelist } = get();
    if (siteWhitelist.includes(site)) return;

    const newWhitelist = [...siteWhitelist, site];
    set({ siteWhitelist: newWhitelist });
    // TODO: 保存到存储
  },

  // 从白名单移除
  removeFromWhitelist: async (site) => {
    const { siteWhitelist } = get();
    const newWhitelist = siteWhitelist.filter((s) => s !== site);
    set({ siteWhitelist: newWhitelist });
    // TODO: 保存到存储
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 清除测试结果
  clearTestResult: () => {
    set({ testResult: null });
  },
}));

/**
 * 获取服务商显示名称
 */
export function getProviderDisplayName(provider: LLMConfig["provider"]): string {
  return PROVIDER_PRESETS[provider]?.name || provider;
}

/**
 * 获取服务商默认模型
 */
export function getProviderDefaultModel(provider: LLMConfig["provider"]): string {
  return PROVIDER_PRESETS[provider]?.defaultModel || "";
}

/**
 * 获取服务商文档链接
 */
export function getProviderDocUrl(provider: LLMConfig["provider"]): string {
  return PROVIDER_PRESETS[provider]?.docUrl || "";
}
