/**
 * 消息类型枚举
 */
export enum MessageType {
  // 内容提取
  EXTRACT_CONTENT = "EXTRACT_CONTENT",
  CONTENT_EXTRACTED = "CONTENT_EXTRACTED",

  // LLM 分析
  ANALYZE_CURRENT_PAGE = "ANALYZE_CURRENT_PAGE",
  QUICK_SAVE_CURRENT_PAGE = "QUICK_SAVE_CURRENT_PAGE",
  ANALYSIS_STARTED = "ANALYSIS_STARTED",
  ANALYSIS_CHUNK = "ANALYSIS_CHUNK",
  ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE",
  ANALYSIS_ERROR = "ANALYSIS_ERROR",
  QUICK_SAVE_COMPLETE = "QUICK_SAVE_COMPLETE",
  QUICK_SAVE_ERROR = "QUICK_SAVE_ERROR",

  // 数据操作
  SAVE_DEMANDS = "SAVE_DEMANDS",
  DELETE_DEMAND = "DELETE_DEMAND",
  GET_DEMANDS = "GET_DEMANDS",
  GET_DEMAND_BY_ID = "GET_DEMAND_BY_ID",
  UPDATE_DEMAND = "UPDATE_DEMAND",
  SEARCH_DEMANDS = "SEARCH_DEMANDS",

  // 提取记录
  GET_EXTRACTIONS = "GET_EXTRACTIONS",
  GET_EXTRACTION_BY_ID = "GET_EXTRACTION_BY_ID",
  DELETE_EXTRACTION = "DELETE_EXTRACTION",

  // 配置
  GET_CONFIG = "GET_CONFIG",
  UPDATE_CONFIG = "UPDATE_CONFIG",
  TEST_LLM_CONNECTION = "TEST_LLM_CONNECTION",

  // 存储
  GET_STORAGE_USAGE = "GET_STORAGE_USAGE",
  EXPORT_DATA = "EXPORT_DATA",
  CLEAR_DATA = "CLEAR_DATA",

  // 页面状态
  GET_CURRENT_PAGE_INFO = "GET_CURRENT_PAGE_INFO",
  PAGE_INFO_UPDATED = "PAGE_INFO_UPDATED",

  // === v2.1 新增 ===

  // 任务管理
  TASK_CREATED = "TASK_CREATED",
  TASK_STATUS_UPDATED = "TASK_STATUS_UPDATED",
  TASK_COMPLETED = "TASK_COMPLETED",
  TASK_ERROR = "TASK_ERROR",
  TASK_CANCELLED = "TASK_CANCELLED",
  GET_PENDING_TASKS = "GET_PENDING_TASKS",
  CANCEL_ALL_TASKS = "CANCEL_ALL_TASKS",

  // 批量分析
  BATCH_ANALYZE_START = "BATCH_ANALYZE_START",
  BATCH_ANALYZE_PROGRESS = "BATCH_ANALYZE_PROGRESS",
  BATCH_ANALYZE_COMPLETE = "BATCH_ANALYZE_COMPLETE",

  // 需求去重
  DEDUP_ANALYZE_START = "DEDUP_ANALYZE_START",
  DEDUP_ANALYZE_COMPLETE = "DEDUP_ANALYZE_COMPLETE",
  DEDUP_CONFIRM = "DEDUP_CONFIRM",
}

/**
 * 通用消息接口
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

/**
 * 消息响应接口
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 分析结果载荷
 */
export interface AnalysisResultPayload {
  summary: string;
  demands: Array<{
    id: string;
    solution: {
      title: string;
      description: string;
      targetUser: string;
      keyDifferentiators: string[];
    };
    validation: {
      painPoints: string[];
      competitors: string[];
      competitorGaps: string[];
      quotes: string[];
    };
  }>;
  extractionId: string;
}

/**
 * 分析错误载荷
 */
export interface AnalysisErrorPayload {
  code: string;
  message: string;
  action?: string;
}

/**
 * 页面信息载荷
 */
export interface PageInfoPayload {
  url: string;
  title: string;
  platform: "reddit" | "zhihu" | "twitter" | "generic" | "unsupported";
  canAnalyze: boolean;
  needsAuthorization: boolean;
}

/**
 * 分析任务状态
 */
export type TaskStatus = "pending" | "extracting" | "analyzing" | "completed" | "error";

/**
 * 需求预览（与分析结果中的结构一致）
 */
export interface DemandPreview {
  id: string;
  solution: {
    title: string;
    description: string;
    targetUser: string;
    keyDifferentiators: string[];
  };
  validation: {
    painPoints: string[];
    competitors: string[];
    competitorGaps: string[];
    quotes: string[];
  };
}

/**
 * 分析任务 - 独立于页面的分析单元
 * 存储位置: Zustand store（内存），不持久化到 IndexedDB
 * 生命周期: 浏览器会话内有效，关闭后清空
 */
export interface AnalysisTask {
  // === 任务标识 ===
  id: string; // UUID，任务唯一标识

  // === 来源信息（创建时快照）===
  source: {
    url: string; // 触发分析的页面 URL
    title: string; // 页面标题
    platform: "reddit" | "zhihu" | "twitter" | "generic";
    favicon?: string; // 网站图标（可选）
  };

  // === 任务状态 ===
  status: TaskStatus;
  progress?: number; // 0-100，仅 analyzing 状态使用

  // === 时间戳 ===
  createdAt: Date; // 任务创建时间
  startedAt?: Date; // 开始处理时间
  completedAt?: Date; // 完成时间

  // === 分析结果（completed 状态填充）===
  result?: {
    extractionId: string; // 关联的 Extraction ID
    summary: string; // 内容摘要
    demands: DemandPreview[]; // 识别的产品方向
  };

  // === 错误信息（error 状态填充）===
  error?: {
    code: string; // 错误码
    message: string; // 错误信息
    retryable: boolean; // 是否可重试
  };
}

/**
 * 任务创建载荷
 */
export interface TaskCreatePayload {
  source: AnalysisTask["source"];
  extractionId?: string;
}

/**
 * 任务状态更新载荷
 */
export interface TaskStatusUpdatePayload {
  taskId: string;
  status: TaskStatus;
  data?: Partial<AnalysisTask>;
}

/**
 * 任务完成载荷
 */
export interface TaskCompletePayload {
  taskId: string;
  result: AnalysisTask["result"];
}

/**
 * 任务错误载荷
 */
export interface TaskErrorPayload {
  taskId: string;
  error: AnalysisTask["error"];
}
