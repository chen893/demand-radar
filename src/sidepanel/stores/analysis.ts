/**
 * 分析状态管理
 * 管理当前页面分析的状态
 */

import { create } from "zustand";
import type {
  AnalysisResultPayload,
  PageInfoPayload,
} from "@/shared/types/messages";

/**
 * 分析状态
 */
type AnalysisStatus =
  | "idle"
  | "extracting"
  | "analyzing"
  | "completed"
  | "error";

interface DemandPreview {
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

interface AnalysisState {
  // 页面信息
  pageInfo: PageInfoPayload | null;

  // 分析状态
  status: AnalysisStatus;
  error: string | null;
  errorAction?: string;

  // 分析结果
  extractionId: string | null;
  summary: string | null;
  demands: DemandPreview[];
  selectedDemandIds: string[];

  // 操作
  setPageInfo: (info: PageInfoPayload | null) => void;
  startAnalysis: () => void;
  setExtracting: () => void;
  setAnalyzing: () => void;
  setAnalysisResult: (result: AnalysisResultPayload) => void;
  setError: (error: string, action?: string) => void;
  toggleDemandSelection: (id: string) => void;
  selectAllDemands: () => void;
  deselectAllDemands: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // 初始状态
  pageInfo: null,
  status: "idle",
  error: null,
  errorAction: undefined,
  extractionId: null,
  summary: null,
  demands: [],
  selectedDemandIds: [],

  // 设置页面信息
  setPageInfo: (info) => {
    console.log("info", info);
    const currentInfo = get().pageInfo;
    // URL 变化时重置分析状态
    if (currentInfo?.url !== info?.url) {
      set({
        pageInfo: info,
        status: "idle",
        error: null,
        errorAction: undefined,
        extractionId: null,
        summary: null,
        demands: [],
        selectedDemandIds: [],
      });
    } else {
      set({ pageInfo: info });
    }
  },

  // 开始分析
  startAnalysis: () => {
    set({
      status: "extracting",
      error: null,
      errorAction: undefined,
      extractionId: null,
      summary: null,
      demands: [],
      selectedDemandIds: [],
    });
  },

  // 设置提取中状态
  setExtracting: () => {
    set({ status: "extracting" });
  },

  // 设置分析中状态
  setAnalyzing: () => {
    set({ status: "analyzing" });
  },

  // 设置分析结果
  setAnalysisResult: (result) => {
    set({
      status: "completed",
      extractionId: result.extractionId,
      summary: result.summary,
      demands: result.demands,
      selectedDemandIds: result.demands.map((d) => d.id), // 默认全选
    });
  },

  // 设置错误
  setError: (error, action) => {
    set({
      status: "error",
      error,
      errorAction: action,
    });
  },

  // 切换需求选中状态
  toggleDemandSelection: (id) => {
    set((state) => ({
      selectedDemandIds: state.selectedDemandIds.includes(id)
        ? state.selectedDemandIds.filter((i) => i !== id)
        : [...state.selectedDemandIds, id],
    }));
  },

  // 全选需求
  selectAllDemands: () => {
    set((state) => ({
      selectedDemandIds: state.demands.map((d) => d.id),
    }));
  },

  // 取消全选
  deselectAllDemands: () => {
    set({ selectedDemandIds: [] });
  },

  // 重置状态
  reset: () => {
    set({
      status: "idle",
      error: null,
      errorAction: undefined,
      extractionId: null,
      summary: null,
      demands: [],
      selectedDemandIds: [],
    });
  },
}));
