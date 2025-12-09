import { BasePlatformAdapter, type ExtractionResult } from "./base";
import { STORAGE_CONFIG } from "@/shared/constants";

/**
 * 知乎适配器
 * 支持问答页面、专栏文章和回答页面
 */
export class ZhihuAdapter extends BasePlatformAdapter {
  // 选择器配置
  private static readonly SELECTORS = {
    // 问答页面
    question: {
      title: ".QuestionHeader-title",
      detail: ".QuestionRichText--expandable .RichText, .QuestionRichText",
    },
    // 回答内容
    answer: {
      container: ".AnswerItem, .List-item",
      content: ".RichContent-inner, .RichText",
      author: ".AuthorInfo-name, .UserLink-link",
      voteCount: ".VoteButton--up",
    },
    // 专栏文章
    article: {
      title: ".Post-Title",
      content: ".Post-RichText, .RichText",
      author: ".AuthorInfo-name",
    },
    // 评论
    comments: {
      container: ".CommentItem, .CommentItemV2",
      content: ".CommentContent, .CommentItemV2-content",
    },
  };

  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?zhihu\.com/.test(url);
  }

  getPlatformName(): "zhihu" {
    return "zhihu";
  }

  protected async extractContent(): Promise<ExtractionResult> {
    const url = this.getCurrentUrl();

    // 检测页面类型
    if (url.includes("/question/")) {
      return this.extractQuestion();
    } else if (url.includes("/p/")) {
      return this.extractArticle();
    } else if (url.includes("/answer/")) {
      return this.extractAnswer();
    }

    // 未知页面类型，使用通用提取
    return this.fallbackExtract(new Error("Unknown Zhihu page type"));
  }

  /**
   * 提取问答页面内容
   */
  private extractQuestion(): ExtractionResult {
    const selectors = ZhihuAdapter.SELECTORS;

    // 问题标题
    const title =
      this.getTextFromElement(selectors.question.title) || document.title;

    // 问题详情
    const questionDetail = this.getTextFromElement(selectors.question.detail);

    // 回答列表
    const answers = this.extractAnswers();

    // 评论
    const comments = this.extractComments();

    // 组合内容
    const fullBody = this.combineQuestionContent(
      title,
      questionDetail,
      answers,
      comments
    );

    return {
      success: true,
      platform: "zhihu",
      content: {
        title,
        body: fullBody,
        comments,
        metadata: {
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取专栏文章内容
   */
  private extractArticle(): ExtractionResult {
    const selectors = ZhihuAdapter.SELECTORS.article;

    // 文章标题
    const title = this.getTextFromElement(selectors.title) || document.title;

    // 文章内容
    const body = this.getTextFromElement(selectors.content);

    // 作者
    const author = this.getTextFromElement(selectors.author);

    // 评论
    const comments = this.extractComments();

    // 组合内容
    const fullBody = this.combineArticleContent(title, body, comments);

    return {
      success: true,
      platform: "zhihu",
      content: {
        title,
        body: fullBody,
        comments,
        metadata: {
          author,
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取单个回答页面内容
   */
  private extractAnswer(): ExtractionResult {
    const selectors = ZhihuAdapter.SELECTORS;

    // 问题标题
    const title =
      this.getTextFromElement(selectors.question.title) || document.title;

    // 回答内容
    const answerContent = this.getTextFromElement(selectors.answer.content);

    // 作者
    const author = this.getTextFromElement(selectors.answer.author);

    // 评论
    const comments = this.extractComments();

    // 组合内容
    const fullBody = this.combineAnswerContent(
      title,
      answerContent,
      author,
      comments
    );

    return {
      success: true,
      platform: "zhihu",
      content: {
        title,
        body: fullBody,
        comments,
        metadata: {
          author,
          url: this.getCurrentUrl(),
        },
      },
      truncated: fullBody.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH,
      originalLength: fullBody.length,
    };
  }

  /**
   * 提取回答列表
   */
  private extractAnswers(): Array<{ author: string; content: string }> {
    const selectors = ZhihuAdapter.SELECTORS.answer;
    const answers: Array<{ author: string; content: string }> = [];

    const answerElements = document.querySelectorAll(selectors.container);

    answerElements.forEach((element, index) => {
      // 限制回答数量
      if (index >= 10) return;

      const content =
        element.querySelector(selectors.content)?.textContent?.trim() || "";
      const author =
        element.querySelector(selectors.author)?.textContent?.trim() || "";

      if (content) {
        answers.push({ author, content });
      }
    });

    return answers;
  }

  /**
   * 提取评论
   */
  private extractComments(): string[] {
    const selectors = ZhihuAdapter.SELECTORS.comments;
    const comments: string[] = [];

    const commentElements = document.querySelectorAll(selectors.container);

    commentElements.forEach((element, index) => {
      if (index >= STORAGE_CONFIG.MAX_COMMENTS_COUNT) return;

      const content =
        element.querySelector(selectors.content)?.textContent?.trim() || "";

      if (content) {
        comments.push(content);
      }
    });

    return comments;
  }

  /**
   * 组合问答页面内容
   */
  private combineQuestionContent(
    title: string,
    questionDetail: string,
    answers: Array<{ author: string; content: string }>,
    comments: string[]
  ): string {
    let content = `# ${title}\n\n`;

    if (questionDetail) {
      content += `## 问题描述\n${questionDetail}\n\n`;
    }

    if (answers.length > 0) {
      content += `## 回答（${answers.length} 个）\n\n`;
      answers.forEach((answer, index) => {
        content += `### 回答 ${index + 1}${answer.author ? ` - ${answer.author}` : ""}\n`;
        content += `${answer.content}\n\n`;
      });
    }

    if (comments.length > 0) {
      content += `## 评论\n\n`;
      comments.forEach((comment, index) => {
        content += `[评论 ${index + 1}]: ${comment}\n\n`;
      });
    }

    return this.cleanText(content);
  }

  /**
   * 组合文章内容
   */
  private combineArticleContent(
    title: string,
    body: string,
    comments: string[]
  ): string {
    let content = `# ${title}\n\n`;

    if (body) {
      content += `${body}\n\n`;
    }

    if (comments.length > 0) {
      content += `## 评论\n\n`;
      comments.forEach((comment, index) => {
        content += `[评论 ${index + 1}]: ${comment}\n\n`;
      });
    }

    return this.cleanText(content);
  }

  /**
   * 组合回答页面内容
   */
  private combineAnswerContent(
    title: string,
    answerContent: string,
    author: string,
    comments: string[]
  ): string {
    let content = `# ${title}\n\n`;

    if (author) {
      content += `**作者**: ${author}\n\n`;
    }

    if (answerContent) {
      content += `## 回答\n${answerContent}\n\n`;
    }

    if (comments.length > 0) {
      content += `## 评论\n\n`;
      comments.forEach((comment, index) => {
        content += `[评论 ${index + 1}]: ${comment}\n\n`;
      });
    }

    return this.cleanText(content);
  }
}
