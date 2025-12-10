import { BasePlatformAdapter, type ExtractionResult } from "./base";

export class TwitterAdapter extends BasePlatformAdapter {
  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?(twitter|x)\.com\//.test(url);
  }

  getPlatformName(): "twitter" {
    return "twitter";
  }

  protected async extractContent(): Promise<ExtractionResult> {
    const url = this.getCurrentUrl();
    const isStatusPage = /\/status\/\d+/.test(url);

    const texts =
      isStatusPage ? this.extractStatusThread() : this.extractTimeline();

    const body = this.cleanText(texts.join("\n\n"));
    const truncated = body.length > 20000;

    return {
      success: true,
      platform: "twitter",
      content: {
        title: document.title || "Twitter",
        body: truncated ? body.slice(0, 20000) : body,
        metadata: {
          url,
          author: this.getAuthor(),
        },
      },
      truncated,
      originalLength: body.length,
    };
  }

  private extractStatusThread(): string[] {
    const primary = this.getTextFromElements('[data-testid="tweetText"]', 1);
    const replies = this.getTextFromElements('[data-testid="tweetText"]', 30);
    // 去重：首条重复时跳过
    const combined =
      replies.length && primary.length && replies[0] === primary[0]
        ? replies
        : [...primary, ...replies];
    return combined.filter(Boolean).slice(0, 30);
  }

  private extractTimeline(): string[] {
    const tweets = this.getTextFromElements('[data-testid="tweetText"]', 20);
    if (tweets.length > 0) {
      return tweets;
    }
    // 降级选择器
    const fallback = this.getTextFromElements("article[role='article']", 20);
    return fallback.map((t) => t.trim()).filter(Boolean).slice(0, 20);
  }

  private getAuthor(): string | undefined {
    const handle = document.querySelector('[data-testid="User-Name"] a[href^="/"]');
    return handle?.textContent || undefined;
  }
}
