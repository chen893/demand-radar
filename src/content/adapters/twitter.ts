/**
 * Twitter/X 平台适配器
 * v2.1: 支持从 Twitter/X 提取推文内容
 */

import { BasePlatformAdapter, type ExtractionResult } from "./base";

/**
 * Twitter 适配器
 * 支持推文详情页和推文列表页
 */
export class TwitterAdapter extends BasePlatformAdapter {
  platform = "twitter" as const;

  // 多重选择器策略
  private static SELECTORS = {
    // Level 1: 专用选择器（当前版本）
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userHandle: '[data-testid="User-Name"] a[href^="/"]',

    // Level 2: 语义选择器（旧版本）
    tweetAlt: 'article[role="article"]',
    tweetTextAlt: '[lang] span',
    userHandleAlt: 'div[data-testid="User-Name"] a',

    // Level 3: 结构特征
    tweetByStructure: 'article:has([data-testid="tweetText"])',
  };

  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?(twitter|x)\.com/.test(url);
  }

  getPlatformName(): "twitter" {
    return "twitter";
  }

  /**
   * 检查页面类型
   */
  private isStatusPage(): boolean {
    return /\/status\/\d+/.test(window.location.href);
  }

  /**
   * 提取推文详情页内容
   */
  private async extractTweetDetail(): Promise<ExtractionResult> {
    // 尝试多种选择器
    const tweets = this.extractTweets();

    if (tweets.length === 0) {
      throw new Error("未找到推文内容");
    }

    // 主推文（第一条）
    const mainTweet = tweets[0];
    const replies = tweets.slice(1); // 后续推文作为回复

    // 组装内容
    const content = this.formatTweetThread(mainTweet, replies);

    return {
      success: true,
      platform: "twitter",
      content: {
        title: mainTweet.author + "的推文",
        body: content,
        comments: replies.map((t) => `@${t.author}: ${t.content}`),
        metadata: {
          author: mainTweet.author,
          url: window.location.href,
          replyCount: replies.length,
        },
      },
      truncated: content.length > 20000,
      originalLength: content.length,
    };
  }

  /**
   * 提取推文列表页内容（搜索结果、用户主页等）
   */
  private async extractTweetList(): Promise<ExtractionResult> {
    const tweets = this.extractTweets(20);

    if (tweets.length === 0) {
      throw new Error("未找到推文内容");
    }

    const content = tweets
      .map((t) => `@${t.author}: ${t.content}`)
      .join("\n\n---\n\n");

    return {
      success: true,
      platform: "twitter",
      content: {
        title: document.title || "Twitter 列表",
        body: content,
        metadata: {
          url: window.location.href,
          tweetCount: tweets.length,
        },
      },
      truncated: content.length > 20000,
      originalLength: content.length,
    };
  }

  /**
   * 提取推文列表
   * 使用多重选择器策略
   */
  private extractTweets(limit?: number): Array<{
    author: string;
    content: string;
  }> {
    // 尝试 Level 1: 专用选择器
    let tweets = this.extractTweetsWithSelector(
      TwitterAdapter.SELECTORS.tweet,
      TwitterAdapter.SELECTORS.tweetText,
      TwitterAdapter.SELECTORS.userHandle,
      limit
    );

    if (tweets.length === 0) {
      // 尝试 Level 2: 语义选择器
      tweets = this.extractTweetsWithSelector(
        TwitterAdapter.SELECTORS.tweetAlt,
        TwitterAdapter.SELECTORS.tweetTextAlt,
        TwitterAdapter.SELECTORS.userHandleAlt,
        limit
      );
    }

    if (tweets.length === 0) {
      // 尝试 Level 3: 结构特征
      const tweetElements = document.querySelectorAll(
        TwitterAdapter.SELECTORS.tweetByStructure
      );
      tweetElements.forEach((el) => {
        const content =
          el.querySelector(TwitterAdapter.SELECTORS.tweetText)?.textContent ||
          el.querySelector(TwitterAdapter.SELECTORS.tweetTextAlt)?.textContent ||
          "";
        const author =
          el.querySelector(TwitterAdapter.SELECTORS.userHandle)?.getAttribute(
            "href"
          ) ||
          el
            .querySelector(TwitterAdapter.SELECTORS.userHandleAlt)
            ?.getAttribute("href") || "";

        if (content.trim()) {
          tweets.push({
            author: author?.replace("/", "") || "unknown",
            content: content.trim(),
          });
        }
      });
    }

    return limit ? tweets.slice(0, limit) : tweets;
  }

  /**
   * 使用指定选择器提取推文
   */
  private extractTweetsWithSelector(
    tweetSelector: string,
    textSelector: string,
    userSelector: string,
    limit?: number
  ): Array<{ author: string; content: string }> {
    const tweets: Array<{ author: string; content: string }> = [];
    const tweetElements = document.querySelectorAll(tweetSelector);

    tweetElements.forEach((tweetEl, index) => {
      if (limit && index >= limit) return;

      const textEl = tweetEl.querySelector(textSelector);
      const userEl = tweetEl.querySelector(userSelector);

      const content = textEl?.textContent?.trim() || "";
      const author =
        userEl?.getAttribute("href")?.replace("/", "") ||
        userEl?.textContent?.trim() ||
        "unknown";

      if (content) {
        tweets.push({ author, content });
      }
    });

    return tweets;
  }

  /**
   * 格式化推文线程
   */
  private formatTweetThread(
    mainTweet: { author: string; content: string },
    replies: Array<{ author: string; content: string }>
  ): string {
    let result = `@${mainTweet.author}: ${mainTweet.content}`;

    if (replies.length > 0) {
      result += "\n\n回复：\n\n";
      result += replies
        .map((reply) => `@${reply.author}: ${reply.content}`)
        .join("\n\n");
    }

    return result;
  }

  /**
   * 检查页面是否有内容
   */
  private hasContent(): boolean {
    return (
      document.querySelectorAll(TwitterAdapter.SELECTORS.tweet).length > 0 ||
      document.querySelectorAll(TwitterAdapter.SELECTORS.tweetAlt).length > 0
    );
  }

  /**
   * 具体的内容提取逻辑
   */
  protected async extractContent(): Promise<ExtractionResult> {
    if (!this.hasContent()) {
      throw new Error("页面未加载完成或无法识别内容");
    }

    if (this.isStatusPage()) {
      return this.extractTweetDetail();
    } else {
      return this.extractTweetList();
    }
  }

  /**
   * 降级提取（使用通用方法）
   */
  protected fallbackExtract(error: unknown): ExtractionResult {
    const title = document.title || "Twitter 页面";
    const body =
      document.body?.innerText?.slice(0, 20000) ||
      "无法提取推文内容";

    return {
      success: true,
      platform: "twitter",
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
}
