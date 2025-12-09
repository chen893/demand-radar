import type { ProviderPreset, SiteFilterConfig } from "./types/config";

/**
 * 存储配置常量
 */
export const STORAGE_CONFIG = {
  // 单条限制
  SINGLE_RECORD_LIMIT: 500 * 1024, // 单条 500KB

  // 总容量限制
  TOTAL_SOFT_LIMIT: 50 * 1024 * 1024, // 软限制 50MB（警告）
  TOTAL_HARD_LIMIT: 100 * 1024 * 1024, // 硬限制 100MB（阻止新增）

  // 阈值
  WARNING_THRESHOLD: 0.8, // 80% 时警告

  // 截断配置
  MAX_ORIGINAL_TEXT_LENGTH: 20000, // 原文最大字符数
  MAX_SUMMARY_LENGTH: 500, // 摘要最大字符数
  MAX_COMMENTS_COUNT: 50, // 最大评论数
} as const;

/**
 * LLM 服务商预设配置
 */
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyPrefix: "sk-",
    docUrl: "https://platform.openai.com/api-keys",
  },
  google: {
    name: "Google (Gemini)",
    defaultModel: "gemini-2.0-flash",
    keyPrefix: "AI",
    docUrl: "https://aistudio.google.com/app/apikey",
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    keyPrefix: "sk-",
    docUrl: "https://platform.deepseek.com/api_keys",
  },
  custom: {
    name: "自定义",
    defaultModel: "",
    keyPrefix: "",
    docUrl: "",
  },
} as const;

/**
 * 默认站点过滤配置
 */
export const DEFAULT_SITE_FILTER: SiteFilterConfig = {
  mode: "whitelist",
  whitelist: ["*.reddit.com", "*.zhihu.com"],
  blacklist: ["*.bank.*", "mail.*", "*.gov.*", "*/login*", "*/account*"],
};

/**
 * 平台检测模式
 */
export const PLATFORM_PATTERNS = {
  reddit: /^https?:\/\/(www\.|old\.)?reddit\.com/,
  zhihu: /^https?:\/\/(www\.)?zhihu\.com/,
} as const;

/**
 * 错误码定义
 */
export const ERROR_CODES = {
  API_KEY_NOT_CONFIGURED: "E001",
  API_KEY_INVALID: "E002",
  QUOTA_EXCEEDED: "E003",
  NETWORK_ERROR: "E004",
  EXTRACTION_FAILED: "E005",
  PARSE_ERROR: "E006",
  STORAGE_FULL: "E007",
  TIMEOUT: "E008",
  UNKNOWN: "E999",
} as const;

/**
 * 错误消息映射
 */
export const ERROR_MESSAGES: Record<
  string,
  { title: string; action: string; actionType: "settings" | "retry" | "none" }
> = {
  [ERROR_CODES.API_KEY_NOT_CONFIGURED]: {
    title: "请先配置 API Key",
    action: "前往设置",
    actionType: "settings",
  },
  [ERROR_CODES.API_KEY_INVALID]: {
    title: "API Key 无效，请检查设置",
    action: "检查配置",
    actionType: "settings",
  },
  [ERROR_CODES.QUOTA_EXCEEDED]: {
    title: "API 调用额度已用尽",
    action: "检查账户",
    actionType: "none",
  },
  [ERROR_CODES.NETWORK_ERROR]: {
    title: "网络连接失败",
    action: "重试",
    actionType: "retry",
  },
  [ERROR_CODES.EXTRACTION_FAILED]: {
    title: "内容提取失败",
    action: "使用快速保存",
    actionType: "none",
  },
  [ERROR_CODES.PARSE_ERROR]: {
    title: "分析结果异常",
    action: "重试",
    actionType: "retry",
  },
  [ERROR_CODES.STORAGE_FULL]: {
    title: "存储已满",
    action: "清理数据",
    actionType: "none",
  },
  [ERROR_CODES.TIMEOUT]: {
    title: "请求超时",
    action: "重试",
    actionType: "retry",
  },
  [ERROR_CODES.UNKNOWN]: {
    title: "未知错误",
    action: "重试",
    actionType: "retry",
  },
};

/**
 * 分析埋点事件
 */
export const ANALYTICS_EVENTS = {
  INSTALL: "install",
  CONFIG_LLM: "config_llm",
  FIRST_ANALYZE: "first_analyze",
  ANALYZE: "analyze",
  ANALYZE_FAIL: "analyze_fail",
  QUICK_SAVE: "quick_save",
  SAVE_DEMAND: "save_demand",
  SEARCH: "search",
  EXPORT: "export",
  STORAGE_WARNING: "storage_warning",
} as const;
