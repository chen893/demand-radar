import { Readability } from "@mozilla/readability";
import { BasePlatformAdapter, type ExtractionResult } from "./base";
import { STORAGE_CONFIG } from "@/shared/constants";

/**
 * 通用适配器
 * 使用 Readability 提取页面内容，作为其他平台的降级方案
 */
export class GenericAdapter extends BasePlatformAdapter {
  canHandle(_url: string): boolean {
    // 通用适配器总是可以处理
    return true;
  }

  getPlatformName(): "generic" {
    return "generic";
  }

  protected async extractContent(): Promise<ExtractionResult> {
    try {
      // 尝试使用 Readability 提取
      const article = this.extractWithReadability();

      if (article) {
        return {
          success: true,
          platform: "generic",
          content: {
            title: article.title,
            body: this.cleanText(article.textContent || ""),
            metadata: {
              author: article.byline || undefined,
              url: this.getCurrentUrl(),
            },
          },
          truncated:
            (article.textContent?.length || 0) >
            STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
          originalLength: article.textContent?.length,
        };
      }

      // Readability 失败，使用纯文本降级
      return this.extractPlainText();
    } catch (error) {
      console.error("[Generic] Readability extraction failed:", error);
      return this.extractPlainText();
    }
  }

  /**
   * 使用 Readability 提取内容
   */
  private extractWithReadability(): ReturnType<Readability["parse"]> {
    // 克隆文档以避免修改原始 DOM
    const documentClone = document.cloneNode(true) as Document;

    // 创建 Readability 实例
    const reader = new Readability(documentClone, {
      charThreshold: 100,
      keepClasses: false,
    });

    // 解析内容
    return reader.parse();
  }

  /**
   * 纯文本降级提取
   */
  private extractPlainText(): ExtractionResult {
    const title = document.title || "";

    // 获取主要内容区域
    const mainContent = this.findMainContent();
    let body = mainContent || document.body?.innerText || "";

    // 截断过长内容
    const truncated = body.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH;
    if (truncated) {
      body = body.slice(0, STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH);
    }

    return {
      success: true,
      platform: "generic",
      content: {
        title,
        body: this.cleanText(body),
        metadata: {
          url: this.getCurrentUrl(),
        },
      },
      truncated,
      originalLength: mainContent?.length || document.body?.innerText?.length,
      fallbackUsed: true,
    };
  }

  /**
   * 尝试找到主要内容区域
   */
  private findMainContent(): string | null {
    // 常见的主内容选择器
    const mainSelectors = [
      "main",
      "article",
      '[role="main"]',
      ".main-content",
      ".content",
      ".post-content",
      ".article-content",
      ".entry-content",
      "#content",
      "#main",
    ];

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        // 确保内容足够长
        if (text && text.length > 200) {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * 覆写清理文本方法，增加更多清理规则
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ") // 合并多个空白字符
      .replace(/\n\s*\n\s*\n/g, "\n\n") // 最多保留一个空行
      .replace(/^\s+/gm, "") // 移除行首空白
      .replace(/\s+$/gm, "") // 移除行尾空白
      .trim();
  }
}
