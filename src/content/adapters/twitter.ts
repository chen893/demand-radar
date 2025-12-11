import { BasePlatformAdapter, type ExtractionResult } from "./base";
import { STORAGE_CONFIG } from "@/shared/constants";

/**
 * Twitter/X 适配器
 * 支持 twitter.com 和 x.com
 */
export class TwitterAdapter extends BasePlatformAdapter {
  // 选择器配置
  private static readonly SELECTORS = {
    // 推文内容
    tweet: {
      // 主推文容器
      container: 'article[data-testid="tweet"]',
      // 推文文本
      text: '[data-testid="tweetText"]',
      // 用户信息
      userName: '[data-testid="User-Name"]',
      userHandle: 'a[role="link"][href^="/"]',
      // 时间戳
      timestamp: 'time',
      // 媒体内容描述
      mediaAlt: 'img[alt]:not([alt=""])',
    },
    // 回复/评论
    reply: {
      container: 'article[data-testid="tweet"]',
      text: '[data-testid="tweetText"]',
    },
    // 引用推文
    quote: {
      container: '[data-testid="quoteTweet"]',
      text: '[data-testid="tweetText"]',
    },
  };

  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?(twitter\.com|x\.com)/.test(url);
  }

  getPlatformName(): "twitter" {
    return "twitter";
  }

  protected async extractContent(): Promise<ExtractionResult> {
    const url = this.getCurrentUrl();

    // 检测页面类型
    if (url.includes("/status/")) {
      return this.extractTweetPage();
    }

    // 其他页面（时间线、个人主页等）使用通用提取
    return this.extractTimeline();
  }

  /**
   * 提取单条推文页面内容
   */
  private extractTweetPage(): ExtractionResult {
    const selectors = TwitterAdapter.SELECTORS;

    // 获取所有推文（包括主推文和回复）
    const tweetElements = document.querySelectorAll(selectors.tweet.container);

    if (tweetElements.length === 0) {
      // 页面可能还在加载，尝试降级提取
      return this.fallbackExtract(new Error("No tweets found on page"));
    }

    // 第一条通常是主推文
    const mainTweet = tweetElements[0];
    const mainContent = this.extractTweetContent(mainTweet);

    // 提取回复
    const replies = this.extractReplies(tweetElements);

    // 提取引用推文
    const quotedTweet = this.extractQuotedTweet(mainTweet);

    // 组合内容
    const fullBody = this.combineContent(mainContent, quotedTweet, replies);

    // 构建标题
    const title = this.buildTitle(mainContent);

    return {
      success: true,
      platform: "twitter",
      content: {
        title,
        body: fullBody,
        comments: replies.map((r) => r.text),
        metadata: {
          author: mainContent.author,
          timestamp: mainContent.timestamp,
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取时间线内容（个人主页、搜索结果等）
   */
  private extractTimeline(): ExtractionResult {
    const selectors = TwitterAdapter.SELECTORS;
    const tweetElements = document.querySelectorAll(selectors.tweet.container);

    const tweets: Array<{ author: string; text: string }> = [];

    tweetElements.forEach((element, index) => {
      // 限制数量
      if (index >= 20) return;

      const content = this.extractTweetContent(element);
      if (content.text) {
        tweets.push({
          author: content.author,
          text: content.text,
        });
      }
    });

    const title = document.title || "Twitter/X Timeline";
    const fullBody = this.combineTimelineContent(tweets);

    return {
      success: true,
      platform: "twitter",
      content: {
        title,
        body: fullBody,
        metadata: {
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 从推文元素提取内容
   */
  private extractTweetContent(element: Element): {
    author: string;
    handle: string;
    text: string;
    timestamp: string;
    mediaDescriptions: string[];
  } {
    const selectors = TwitterAdapter.SELECTORS.tweet;

    // 推文文本
    const textElement = element.querySelector(selectors.text);
    const text = textElement?.textContent?.trim() || "";

    // 用户名
    const userNameElement = element.querySelector(selectors.userName);
    const author = this.extractAuthorName(userNameElement);
    const handle = this.extractHandle(userNameElement);

    // 时间戳
    const timeElement = element.querySelector(selectors.timestamp);
    const timestamp = timeElement?.getAttribute("datetime") || "";

    // 媒体描述（图片 alt 文本）
    const mediaDescriptions = this.extractMediaDescriptions(element);

    return { author, handle, text, timestamp, mediaDescriptions };
  }

  /**
   * 提取作者名称
   */
  private extractAuthorName(element: Element | null): string {
    if (!element) return "";

    // 用户名通常在第一个 span 中
    const spans = element.querySelectorAll("span");
    for (const span of spans) {
      const text = span.textContent?.trim();
      if (text && !text.startsWith("@")) {
        return text;
      }
    }

    return "";
  }

  /**
   * 提取用户 handle (@username)
   */
  private extractHandle(element: Element | null): string {
    if (!element) return "";

    // handle 通常以 @ 开头
    const spans = element.querySelectorAll("span");
    for (const span of spans) {
      const text = span.textContent?.trim();
      if (text && text.startsWith("@")) {
        return text;
      }
    }

    return "";
  }

  /**
   * 提取媒体描述
   */
  private extractMediaDescriptions(element: Element): string[] {
    const descriptions: string[] = [];
    const images = element.querySelectorAll("img[alt]");

    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      // 过滤掉通用的 alt 文本
      if (alt && alt.length > 5 && !alt.includes("Image") && !alt.includes("Avatar")) {
        descriptions.push(alt);
      }
    });

    return descriptions;
  }

  /**
   * 提取回复
   */
  private extractReplies(
    tweetElements: NodeListOf<Element>
  ): Array<{ author: string; text: string }> {
    const replies: Array<{ author: string; text: string }> = [];

    // 跳过第一条（主推文），提取后面的回复
    tweetElements.forEach((element, index) => {
      if (index === 0) return; // 跳过主推文
      if (index > STORAGE_CONFIG.MAX_COMMENTS_COUNT) return;

      const content = this.extractTweetContent(element);
      if (content.text) {
        replies.push({
          author: content.author || content.handle,
          text: content.text,
        });
      }
    });

    return replies;
  }

  /**
   * 提取引用推文
   */
  private extractQuotedTweet(element: Element): { author: string; text: string } | null {
    const selectors = TwitterAdapter.SELECTORS.quote;
    const quoteElement = element.querySelector(selectors.container);

    if (!quoteElement) return null;

    const text = quoteElement.querySelector(selectors.text)?.textContent?.trim() || "";
    if (!text) return null;

    // 尝试获取引用推文的作者
    const author = quoteElement.querySelector('[dir="ltr"] span')?.textContent?.trim() || "";

    return { author, text };
  }

  /**
   * 构建标题
   */
  private buildTitle(content: { author: string; text: string }): string {
    if (content.author && content.text) {
      // 截取前 50 个字符作为标题
      const preview = content.text.slice(0, 50);
      return `${content.author}: ${preview}${content.text.length > 50 ? "..." : ""}`;
    }
    return document.title || "Twitter/X Post";
  }

  /**
   * 组合推文页面内容
   */
  private combineContent(
    mainContent: {
      author: string;
      handle: string;
      text: string;
      timestamp: string;
      mediaDescriptions: string[];
    },
    quotedTweet: { author: string; text: string } | null,
    replies: Array<{ author: string; text: string }>
  ): string {
    let content = "";

    // 主推文
    content += `# ${mainContent.author} ${mainContent.handle}\n\n`;
    content += `${mainContent.text}\n\n`;

    // 媒体描述
    if (mainContent.mediaDescriptions.length > 0) {
      content += `**媒体内容**:\n`;
      mainContent.mediaDescriptions.forEach((desc) => {
        content += `- ${desc}\n`;
      });
      content += "\n";
    }

    // 引用推文
    if (quotedTweet) {
      content += `## 引用推文\n`;
      content += `> ${quotedTweet.author}: ${quotedTweet.text}\n\n`;
    }

    // 回复
    if (replies.length > 0) {
      content += `## 回复 (${replies.length})\n\n`;
      replies.forEach((reply, index) => {
        content += `**[${index + 1}] ${reply.author}**: ${reply.text}\n\n`;
      });
    }

    return this.cleanText(content);
  }

  /**
   * 组合时间线内容
   */
  private combineTimelineContent(
    tweets: Array<{ author: string; text: string }>
  ): string {
    let content = `# Twitter/X Timeline\n\n`;

    tweets.forEach((tweet, index) => {
      content += `## [${index + 1}] ${tweet.author}\n`;
      content += `${tweet.text}\n\n`;
    });

    return this.cleanText(content);
  }
}
