/**
 * Extraction - 一次页面内容提取的记录
 * 存储位置: IndexedDB (Dexie.js)
 */
export interface Extraction {
  id: string; // UUID
  url: string; // 来源页面 URL
  title: string; // 页面标题
  platform: "reddit" | "zhihu" | "twitter" | "generic"; // 平台标识

  // 内容
  originalText: string; // 原始文本（未脱敏，本地存储）
  summary: string; // AI/Readability 生成的摘要

  // 状态
  analysisStatus: "completed" | "pending" | "failed";
  demandCount: number; // 识别出的产品方向数量
  savedDemandCount: number; // 用户保存的方向数量

  // 截断标记
  truncated: boolean;
  truncatedFields?: string[];
  originalLength?: number;

  // 时间戳
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建 Extraction 的参数
 */
export interface CreateExtractionParams {
  url: string;
  title: string;
  platform: "reddit" | "zhihu" | "twitter" | "generic";
  originalText: string;
  summary?: string;
  analysisStatus?: "completed" | "pending" | "failed";
  truncated?: boolean;
  truncatedFields?: string[];
  originalLength?: number;
}
