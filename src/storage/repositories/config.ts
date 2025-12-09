import { db } from "./db";
import type {
  AppConfig,
  LLMConfig,
  SiteFilterConfig,
} from "@/shared/types/config";
import { DEFAULT_SITE_FILTER } from "@/shared/constants";

/**
 * 配置键名
 */
const CONFIG_KEYS = {
  LLM: "llm_config",
  SITE_FILTER: "site_filter",
  ANALYTICS_ENABLED: "analytics_enabled",
  FIRST_LAUNCH_COMPLETED: "first_launch_completed",
} as const;

/**
 * 配置仓储类
 * 负责应用配置的存储和读取
 */
export class ConfigRepository {
  /**
   * 获取配置项
   */
  private async get<T>(key: string, defaultValue: T): Promise<T> {
    const item = await db.config.get(key);
    return item ? (item.value as T) : defaultValue;
  }

  /**
   * 设置配置项
   */
  private async set<T>(key: string, value: T): Promise<void> {
    await db.config.put({ key, value });
  }

  /**
   * 获取 LLM 配置
   */
  async getLLMConfig(): Promise<LLMConfig | null> {
    return this.get<LLMConfig | null>(CONFIG_KEYS.LLM, null);
  }

  /**
   * 设置 LLM 配置
   */
  async setLLMConfig(config: LLMConfig): Promise<void> {
    await this.set(CONFIG_KEYS.LLM, config);
  }

  /**
   * 清除 LLM 配置
   */
  async clearLLMConfig(): Promise<void> {
    await db.config.delete(CONFIG_KEYS.LLM);
  }

  /**
   * 获取站点过滤配置
   */
  async getSiteFilter(): Promise<SiteFilterConfig> {
    return this.get<SiteFilterConfig>(CONFIG_KEYS.SITE_FILTER, DEFAULT_SITE_FILTER);
  }

  /**
   * 设置站点过滤配置
   */
  async setSiteFilter(config: SiteFilterConfig): Promise<void> {
    await this.set(CONFIG_KEYS.SITE_FILTER, config);
  }

  /**
   * 添加站点到白名单
   */
  async addToWhitelist(site: string): Promise<void> {
    const config = await this.getSiteFilter();
    if (!config.whitelist.includes(site)) {
      config.whitelist.push(site);
      await this.setSiteFilter(config);
    }
  }

  /**
   * 从白名单移除站点
   */
  async removeFromWhitelist(site: string): Promise<void> {
    const config = await this.getSiteFilter();
    config.whitelist = config.whitelist.filter((s) => s !== site);
    await this.setSiteFilter(config);
  }

  /**
   * 添加站点到黑名单
   */
  async addToBlacklist(site: string): Promise<void> {
    const config = await this.getSiteFilter();
    if (!config.blacklist.includes(site)) {
      config.blacklist.push(site);
      await this.setSiteFilter(config);
    }
  }

  /**
   * 从黑名单移除站点
   */
  async removeFromBlacklist(site: string): Promise<void> {
    const config = await this.getSiteFilter();
    config.blacklist = config.blacklist.filter((s) => s !== site);
    await this.setSiteFilter(config);
  }

  /**
   * 获取分析埋点是否启用
   */
  async getAnalyticsEnabled(): Promise<boolean> {
    return this.get<boolean>(CONFIG_KEYS.ANALYTICS_ENABLED, true);
  }

  /**
   * 设置分析埋点是否启用
   */
  async setAnalyticsEnabled(enabled: boolean): Promise<void> {
    await this.set(CONFIG_KEYS.ANALYTICS_ENABLED, enabled);
  }

  /**
   * 获取是否已完成首次启动
   */
  async getFirstLaunchCompleted(): Promise<boolean> {
    return this.get<boolean>(CONFIG_KEYS.FIRST_LAUNCH_COMPLETED, false);
  }

  /**
   * 设置已完成首次启动
   */
  async setFirstLaunchCompleted(completed: boolean): Promise<void> {
    await this.set(CONFIG_KEYS.FIRST_LAUNCH_COMPLETED, completed);
  }

  /**
   * 获取完整应用配置
   */
  async getAppConfig(): Promise<AppConfig> {
    const [llm, siteFilter, analyticsEnabled, firstLaunchCompleted] =
      await Promise.all([
        this.getLLMConfig(),
        this.getSiteFilter(),
        this.getAnalyticsEnabled(),
        this.getFirstLaunchCompleted(),
      ]);

    return {
      llm,
      siteFilter,
      analyticsEnabled,
      firstLaunchCompleted,
    };
  }

  /**
   * 检查 LLM 是否已配置
   */
  async isLLMConfigured(): Promise<boolean> {
    const config = await this.getLLMConfig();
    return config !== null && config.apiKey.length > 0;
  }
}

/**
 * 配置仓储单例
 */
export const configRepo = new ConfigRepository();
