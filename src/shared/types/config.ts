/**
 * LLM 服务商类型
 */
export type LLMProvider = "openai" | "google" | "deepseek" | "custom";

/**
 * LLM 配置
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string; // 自定义 API 地址（可选）
  modelName?: string; // 自定义模型名（可选）
}

/**
 * 服务商预设配置
 */
export interface ProviderPreset {
  name: string;
  baseUrl?: string;
  defaultModel: string;
  keyPrefix: string;
  docUrl: string;
}

/**
 * 站点过滤配置
 */
export interface SiteFilterConfig {
  mode: "whitelist" | "blacklist" | "all"; // MVP 默认 whitelist
  whitelist: string[]; // 仅在这些站点启用
  blacklist: string[]; // 在这些站点禁用
}

/**
 * 应用配置
 */
export interface AppConfig {
  llm: LLMConfig | null;
  siteFilter: SiteFilterConfig;
  analyticsEnabled: boolean;
  firstLaunchCompleted: boolean;
}

/**
 * 配置存储项
 */
export interface ConfigItem {
  key: string;
  value: unknown;
}
