/**
 * 提取结果接口
 */
export interface ExtractionResult {
  success: boolean;
  platform: "reddit" | "zhihu" | "generic";

  content: {
    title: string;
    body: string; // 主要内容
    comments?: string[]; // 评论（如有）
    metadata: {
      author?: string;
      timestamp?: string;
      url: string;
      subreddit?: string; // Reddit 特有
    };
  };

  // 截断信息
  truncated: boolean;
  originalLength?: number;

  // 错误信息（降级时）
  fallbackUsed?: boolean;
  error?: string;
}

/**
 * 平台适配器接口
 */
export interface IPlatformAdapter {
  /**
   * 检查是否能处理该 URL
   */
  canHandle(url: string): boolean;

  /**
   * 提取页面内容
   */
  extract(): Promise<ExtractionResult>;

  /**
   * 获取平台名称
   */
  getPlatformName(): "reddit" | "zhihu" | "generic";
}

/**
 * 平台适配器基类
 */
export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract canHandle(url: string): boolean;
  abstract getPlatformName(): "reddit" | "zhihu" | "generic";

  /**
   * 具体的内容提取逻辑，由子类实现
   */
  protected abstract extractContent(): Promise<ExtractionResult>;

  /**
   * 提取页面内容，包含错误处理和降级逻辑
   */
  async extract(): Promise<ExtractionResult> {
    try {
      return await this.extractContent();
    } catch (error) {
      console.error(
        `[${this.getPlatformName()}] Extraction failed:`,
        error
      );
      return this.fallbackExtract(error);
    }
  }

  /**
   * 降级提取（使用通用方法）
   */
  protected fallbackExtract(error: unknown): ExtractionResult {
    // 尝试获取基本内容
    const title = document.title || "";
    const body = document.body?.innerText?.slice(0, 20000) || "";

    return {
      success: true,
      platform: this.getPlatformName(),
      content: {
        title,
        body,
        metadata: {
          url: window.location.href,
        },
      },
      truncated: (document.body?.innerText?.length || 0) > 20000,
      originalLength: document.body?.innerText?.length,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * 清理文本内容
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ") // 合并多个空白字符
      .replace(/\n\s*\n/g, "\n\n") // 合并多个空行
      .trim();
  }

  /**
   * 从元素提取文本
   */
  protected getTextFromElement(selector: string): string {
    const element = document.querySelector(selector);
    return element?.textContent?.trim() || "";
  }

  /**
   * 从多个元素提取文本数组
   */
  protected getTextFromElements(selector: string, limit?: number): string[] {
    const elements = document.querySelectorAll(selector);
    const texts: string[] = [];

    elements.forEach((el, index) => {
      if (limit && index >= limit) return;
      const text = el.textContent?.trim();
      if (text) {
        texts.push(text);
      }
    });

    return texts;
  }

  /**
   * 安全地获取 URL
   */
  protected getCurrentUrl(): string {
    return window.location.href;
  }
}
