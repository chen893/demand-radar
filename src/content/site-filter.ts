/**
 * 站点过滤器
 * 管理白名单/黑名单，决定是否允许在特定页面上进行分析
 */

/**
 * 站点匹配规则
 */
interface SiteRule {
  pattern: string;
  type: "whitelist" | "blacklist";
}

/**
 * 默认白名单（允许分析的站点）
 */
const DEFAULT_WHITELIST: string[] = [
  "*.reddit.com",
  "*.zhihu.com",
];

/**
 * 默认黑名单（禁止分析的站点）
 */
const DEFAULT_BLACKLIST: string[] = [
  // 敏感站点
  "*.bank.*",
  "*.banking.*",
  "*bank.com",
  "*bank.cn",
  // 邮箱
  "mail.*",
  "*.mail.*",
  "webmail.*",
  "outlook.*",
  "gmail.com",
  // 政府/官方
  "*.gov.*",
  "*.gov",
  // 登录页面
  "*/login*",
  "*/signin*",
  "*/auth*",
  // 支付页面
  "*/checkout*",
  "*/payment*",
  "*/pay*",
  // 账户管理
  "*/account*",
  "*/settings*",
  "*/profile*",
];

/**
 * 站点过滤器类
 */
export class SiteFilter {
  private whitelist: string[];
  private blacklist: string[];
  private customWhitelist: string[] = [];

  constructor(
    whitelist: string[] = DEFAULT_WHITELIST,
    blacklist: string[] = DEFAULT_BLACKLIST
  ) {
    this.whitelist = whitelist;
    this.blacklist = blacklist;
  }

  /**
   * 设置配置
   */
  setConfig(whitelist: string[], blacklist: string[]): void {
    this.whitelist = whitelist;
    this.blacklist = blacklist;
  }

  /**
   * 添加自定义白名单（用户授权的通用网页）
   */
  addCustomWhitelist(pattern: string): void {
    if (!this.customWhitelist.includes(pattern)) {
      this.customWhitelist.push(pattern);
    }
  }

  /**
   * 移除自定义白名单
   */
  removeCustomWhitelist(pattern: string): void {
    this.customWhitelist = this.customWhitelist.filter((p) => p !== pattern);
  }

  /**
   * 获取自定义白名单
   */
  getCustomWhitelist(): string[] {
    return [...this.customWhitelist];
  }

  /**
   * 检查 URL 是否允许分析
   */
  isAllowed(url: string): { allowed: boolean; reason?: string } {
    try {
      const urlObj = new URL(url);
      const fullUrl = urlObj.href;
      const hostname = urlObj.hostname;

      // 1. 首先检查黑名单（黑名单优先级最高）
      if (this.matchPatterns(fullUrl, hostname, this.blacklist)) {
        return {
          allowed: false,
          reason: "此页面被安全策略禁止分析",
        };
      }

      // 2. 检查默认白名单
      if (this.matchPatterns(fullUrl, hostname, this.whitelist)) {
        return { allowed: true };
      }

      // 3. 检查自定义白名单（用户授权的通用网页）
      if (this.matchPatterns(fullUrl, hostname, this.customWhitelist)) {
        return { allowed: true };
      }

      // 4. 默认不允许（需要用户授权）
      return {
        allowed: false,
        reason: "此网站需要您的授权才能分析",
      };
    } catch (error) {
      return {
        allowed: false,
        reason: "无效的 URL",
      };
    }
  }

  /**
   * 检查是否为已知平台（Reddit/知乎）
   */
  isKnownPlatform(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return (
        hostname.includes("reddit.com") || hostname.includes("zhihu.com")
      );
    } catch {
      return false;
    }
  }

  /**
   * 检查是否需要用户授权（通用网页）
   */
  needsAuthorization(url: string): boolean {
    if (this.isKnownPlatform(url)) {
      return false;
    }

    const result = this.isAllowed(url);
    if (result.allowed) {
      return false;
    }

    // 如果不在黑名单中，则需要授权
    try {
      const urlObj = new URL(url);
      return !this.matchPatterns(urlObj.href, urlObj.hostname, this.blacklist);
    } catch {
      return false;
    }
  }

  /**
   * 检查 URL 是否匹配模式列表
   */
  private matchPatterns(
    fullUrl: string,
    hostname: string,
    patterns: string[]
  ): boolean {
    for (const pattern of patterns) {
      if (this.matchPattern(fullUrl, hostname, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查 URL 是否匹配单个模式
   * 支持的模式：
   * - *.domain.com - 匹配所有子域名
   * - domain.com - 精确匹配域名
   * - *keyword* - 匹配包含关键词的 URL
   * - /path* - 匹配路径前缀
   */
  private matchPattern(
    fullUrl: string,
    hostname: string,
    pattern: string
  ): boolean {
    // 路径模式（以 / 开头或包含 /）
    if (pattern.startsWith("*/") || pattern.includes("/*")) {
      const regex = this.patternToRegex(pattern);
      return regex.test(fullUrl);
    }

    // 域名模式
    const regex = this.patternToRegex(pattern);
    return regex.test(hostname) || regex.test(fullUrl);
  }

  /**
   * 将模式转换为正则表达式
   */
  private patternToRegex(pattern: string): RegExp {
    // 转义特殊字符，但保留 *
    let regexStr = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");

    // 如果模式不包含通配符，则进行精确匹配
    if (!pattern.includes("*")) {
      regexStr = `^${regexStr}$`;
    }

    return new RegExp(regexStr, "i");
  }

  /**
   * 获取当前配置
   */
  getConfig(): { whitelist: string[]; blacklist: string[] } {
    return {
      whitelist: [...this.whitelist],
      blacklist: [...this.blacklist],
    };
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.whitelist = [...DEFAULT_WHITELIST];
    this.blacklist = [...DEFAULT_BLACKLIST];
    this.customWhitelist = [];
  }
}

/**
 * 站点过滤器单例
 */
export const siteFilter = new SiteFilter();

// 导出默认配置
export { DEFAULT_WHITELIST, DEFAULT_BLACKLIST };
