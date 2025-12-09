/**
 * PII (Personally Identifiable Information) 过滤器
 * 在发送给 LLM 之前执行脱敏，本地存储保留原文
 */

interface PIIPattern {
  regex: RegExp;
  replacement: string;
  description: string;
}

/**
 * PII 检测模式列表
 */
const PII_PATTERNS: PIIPattern[] = [
  {
    regex: /[\w.-]+@[\w.-]+\.\w+/g,
    replacement: "[EMAIL]",
    description: "邮箱地址",
  },
  {
    regex: /1[3-9]\d{9}/g,
    replacement: "[PHONE]",
    description: "中国手机号",
  },
  {
    regex: /\d{3}-\d{4}-\d{4}/g,
    replacement: "[PHONE]",
    description: "手机号（带连字符）",
  },
  {
    regex: /\+\d{1,3}[-\s]?\d{6,14}/g,
    replacement: "[PHONE]",
    description: "国际电话号码",
  },
  {
    regex: /\d{17}[\dXx]/g,
    replacement: "[ID]",
    description: "中国身份证号",
  },
  {
    regex: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
    replacement: "[CARD]",
    description: "信用卡/银行卡号",
  },
  {
    regex: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
    replacement: "[IP]",
    description: "IPv4 地址",
  },
  {
    regex: /[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/g,
    replacement: "[UUID]",
    description: "UUID",
  },
];

/**
 * PII 过滤器类
 */
export class PIIFilter {
  private patterns: PIIPattern[];
  private enabled: boolean;

  constructor(enabled = true) {
    this.patterns = PII_PATTERNS;
    this.enabled = enabled;
  }

  /**
   * 对文本进行 PII 脱敏
   */
  sanitize(text: string): string {
    if (!this.enabled || !text) {
      return text;
    }

    let result = text;
    for (const { regex, replacement } of this.patterns) {
      result = result.replace(regex, replacement);
    }
    return result;
  }

  /**
   * 检测文本中是否包含 PII
   */
  detect(text: string): Array<{ type: string; count: number }> {
    if (!text) {
      return [];
    }

    const results: Array<{ type: string; count: number }> = [];
    for (const { regex, description } of this.patterns) {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        results.push({ type: description, count: matches.length });
      }
    }
    return results;
  }

  /**
   * 获取脱敏统计
   */
  getSanitizationStats(
    original: string,
    sanitized: string
  ): { totalRemoved: number; types: Array<{ type: string; count: number }> } {
    const detected = this.detect(original);
    const totalRemoved = detected.reduce((sum, item) => sum + item.count, 0);
    return { totalRemoved, types: detected };
  }

  /**
   * 启用/禁用过滤器
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 添加自定义模式
   */
  addPattern(pattern: PIIPattern): void {
    this.patterns.push(pattern);
  }
}

/**
 * 默认 PII 过滤器实例
 */
export const piiFilter = new PIIFilter();
