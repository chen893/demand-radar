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

  // ===== v2.1: 任务管理 =====
  TASK_CREATED = "TASK_CREATED",
  TASK_STATUS_UPDATED = "TASK_STATUS_UPDATED",
  TASK_COMPLETED = "TASK_COMPLETED",
  TASK_ERROR = "TASK_ERROR",
  TASK_CANCELLED = "TASK_CANCELLED",

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
 * 任务状态更新消息载荷
 */
export interface TaskStatusUpdatePayload {
  taskId: string;
  status: "pending" | "extracting" | "analyzing" | "completed" | "error";
  progress?: number;
}

/**
 * 批量分析进度载荷
 */
export interface BatchAnalyzeProgressPayload {
  total: number;
  completed: number;
  failed: number;
  running: number;
}

/**
 * 去重分析确认载荷
 */
export interface DedupConfirmPayload {
  suggestedName: string;
  demandIds: string[];
  commonPainPoints?: string[];
}
