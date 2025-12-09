import { BasePlatformAdapter, type ExtractionResult } from "./base";
import { STORAGE_CONFIG } from "@/shared/constants";

/**
 * Reddit 适配器
 * 支持新版和旧版 Reddit
 */
export class RedditAdapter extends BasePlatformAdapter {
  // 选择器配置（便于维护）
  private static readonly SELECTORS = {
    // 新版 Reddit (new.reddit.com / www.reddit.com)
    newReddit: {
      postContainer: '[data-testid="post-container"]',
      postTitle: 'h1, [data-testid="post-title"]',
      postBody:
        '[data-click-id="text"] .md, [slot="text-body"], .RichTextJSON-root',
      postBodyAlt:
        'div[data-test-id="post-content"], [data-adclicklocation="title"]',
      comments: "shreddit-comment",
      commentBody: '[slot="comment"]',
      author: '[data-testid="post_author_link"]',
      subreddit: '[data-testid="subreddit-name"]',
      timestamp: "time, faceplate-timeago",
    },
    // 旧版 Reddit (old.reddit.com)
    oldReddit: {
      postTitle: ".top-matter a.title, .entry a.title",
      postBody: ".expando .usertext-body .md",
      comments: ".comment .md",
      author: ".top-matter .author",
      subreddit: ".top-matter .subreddit",
      timestamp: ".top-matter time, .tagline time",
    },
    // Shreddit (最新版 Reddit 使用的 Web Components)
    shreddit: {
      post: "shreddit-post",
      postTitle: '[slot="title"]',
      postBody: '[slot="text-body"]',
      comments: "shreddit-comment",
    },
  };

  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.|old\.|new\.)?reddit\.com/.test(url);
  }

  getPlatformName(): "reddit" {
    return "reddit";
  }

  protected async extractContent(): Promise<ExtractionResult> {
    // 检测 Reddit 版本
    const isOldReddit =
      window.location.hostname === "old.reddit.com" ||
      document.querySelector(".oldreddit");
    const isShreddit = document.querySelector("shreddit-post") !== null;

    if (isShreddit) {
      return this.extractShreddit();
    } else if (isOldReddit) {
      return this.extractOldReddit();
    } else {
      return this.extractNewReddit();
    }
  }

  /**
   * 提取新版 Reddit 内容
   */
  private extractNewReddit(): ExtractionResult {
    const selectors = RedditAdapter.SELECTORS.newReddit;

    // 标题
    const title = this.getTextFromElement(selectors.postTitle) || document.title;

    // 正文
    let body = this.getTextFromElement(selectors.postBody);
    if (!body) {
      body = this.getTextFromElement(selectors.postBodyAlt);
    }

    // 评论
    const comments = this.extractNewRedditComments();

    // 元数据
    const author = this.getTextFromElement(selectors.author);
    const subreddit = this.getTextFromElement(selectors.subreddit);
    const timestamp =
      document.querySelector(selectors.timestamp)?.getAttribute("datetime") ||
      "";

    // 组合内容
    const fullBody = this.combineContent(title, body, comments);

    return {
      success: true,
      platform: "reddit",
      content: {
        title,
        body: fullBody,
        comments,
        metadata: {
          author,
          subreddit,
          timestamp,
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取最新版 Reddit (Shreddit) 内容
   */
  private extractShreddit(): ExtractionResult {
    const selectors = RedditAdapter.SELECTORS.shreddit;

    // 获取 shreddit-post 元素
    const postElement = document.querySelector(selectors.post);

    // 标题
    const title =
      postElement?.querySelector(selectors.postTitle)?.textContent?.trim() ||
      document.title;

    // 正文
    const body =
      postElement?.querySelector(selectors.postBody)?.textContent?.trim() || "";

    // 评论
    const comments = this.extractShredditComments();

    // 元数据
    const author = postElement?.getAttribute("author") || "";
    const subreddit = postElement?.getAttribute("subreddit-prefixed-name") || "";
    const timestamp = postElement?.getAttribute("created-timestamp") || "";

    // 组合内容
    const fullBody = this.combineContent(title, body, comments);

    return {
      success: true,
      platform: "reddit",
      content: {
        title,
        body: fullBody,
        comments,
        metadata: {
          author,
          subreddit,
          timestamp,
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取旧版 Reddit 内容
   */
  private extractOldReddit(): ExtractionResult {
    const selectors = RedditAdapter.SELECTORS.oldReddit;

    // 标题
    const title = this.getTextFromElement(selectors.postTitle) || document.title;

    // 正文
    const body = this.getTextFromElement(selectors.postBody);

    // 评论
    const comments = this.getTextFromElements(
      selectors.comments,
      STORAGE_CONFIG.MAX_COMMENTS_COUNT
    );

    // 元数据
    const author = this.getTextFromElement(selectors.author);
    const subreddit = this.getTextFromElement(selectors.subreddit);

    // 组合内容
    const fullBody = this.combineContent(title, body, comments);

    return {
      success: true,
      platform: "reddit",
      content: {
        title,
        body: fullBody,
        comments,
        metadata: {
          author,
          subreddit,
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取新版 Reddit 评论
   */
  private extractNewRedditComments(): string[] {
    const comments: string[] = [];
    const commentElements = document.querySelectorAll("shreddit-comment");

    commentElements.forEach((comment, index) => {
      if (index >= STORAGE_CONFIG.MAX_COMMENTS_COUNT) return;

      const slot = comment.querySelector('[slot="comment"]');
      const text = slot?.textContent?.trim();
      if (text) {
        comments.push(text);
      }
    });

    return comments;
  }

  /**
   * 提取 Shreddit 评论
   */
  private extractShredditComments(): string[] {
    const comments: string[] = [];
    const commentElements = document.querySelectorAll("shreddit-comment");

    commentElements.forEach((comment, index) => {
      if (index >= STORAGE_CONFIG.MAX_COMMENTS_COUNT) return;

      // 尝试多种方式获取评论内容
      const content =
        comment.querySelector('[slot="comment"]')?.textContent?.trim() ||
        comment.querySelector(".md")?.textContent?.trim() ||
        "";

      if (content) {
        comments.push(content);
      }
    });

    return comments;
  }

  /**
   * 组合标题、正文和评论
   */
  private combineContent(
    title: string,
    body: string,
    comments: string[]
  ): string {
    let content = `# ${title}\n\n`;

    if (body) {
      content += `${body}\n\n`;
    }

    if (comments.length > 0) {
      content += `## Comments\n\n`;
      comments.forEach((comment, index) => {
        content += `[Comment ${index + 1}]: ${comment}\n\n`;
      });
    }

    return this.cleanText(content);
  }
}
