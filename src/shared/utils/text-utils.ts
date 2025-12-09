import { STORAGE_CONFIG } from "../constants";

/**
 * 截断文本到指定长度
 */
export function truncateText(
  text: string,
  maxLength: number
): { text: string; truncated: boolean; originalLength: number } {
  const originalLength = text.length;
  if (originalLength <= maxLength) {
    return { text, truncated: false, originalLength };
  }
  return {
    text: text.slice(0, maxLength) + "...",
    truncated: true,
    originalLength,
  };
}

/**
 * 截断内容以适应存储限制
 */
export function truncateForStorage(content: {
  originalText: string;
  summary?: string;
}): {
  originalText: string;
  summary: string;
  truncated: boolean;
  truncatedFields: string[];
} {
  const truncatedFields: string[] = [];
  let truncated = false;

  // 截断原文
  let originalText = content.originalText;
  if (originalText.length > STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH) {
    originalText = originalText.slice(
      0,
      STORAGE_CONFIG.MAX_ORIGINAL_TEXT_LENGTH
    );
    truncatedFields.push("originalText");
    truncated = true;
  }

  // 截断摘要
  let summary = content.summary || "";
  if (summary.length > STORAGE_CONFIG.MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, STORAGE_CONFIG.MAX_SUMMARY_LENGTH);
    truncatedFields.push("summary");
    truncated = true;
  }

  return { originalText, summary, truncated, truncatedFields };
}

/**
 * 估算对象的存储大小（字节）
 */
export function estimateSize(obj: unknown): number {
  return JSON.stringify(obj).length * 2; // UTF-16 编码，每字符 2 字节
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * generateId 是 generateUUID 的别名
 */
export const generateId = generateUUID;

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 清理 HTML 标签
 */
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

/**
 * 提取域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * 相对时间格式化
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "刚刚";
  }
  if (diffMins < 60) {
    return `${diffMins} 分钟前`;
  }
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前`;
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} 个月前`;
  }
  return `${Math.floor(diffDays / 365)} 年前`;
}
