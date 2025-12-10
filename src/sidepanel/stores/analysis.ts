/**
 * 分析状态管理
 * v2.1: 实现分析任务独立化，解耦当前页面与分析任务
 */

import { create } from "zustand";
import type {
  AnalysisResultPayload,
  PageInfoPayload,
  AnalysisTask,
  TaskStatus,
  DemandPreview,
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

interface AnalysisState {
  // ===== 当前页面（随 URL 变化更新）=====
  currentPage: PageInfoPayload | null;

  // ===== 任务队列（独立于页面切换）=====
  tasks: AnalysisTask[];
  activeTaskId: string | null;

  // ===== 任务指示器状态 =====
  indicatorExpanded: boolean;

  // ===== 分析结果（从 activeTaskId 关联的任务中获取）=====
  extractionId: string | null;
  summary: string | null;
  demands: DemandPreview[];
  selectedDemandIds: string[];

  // ===== 操作 =====

  // 页面相关
  setCurrentPage: (info: PageInfoPayload | null) => void;
  setPageInfo: (info: PageInfoPayload | null) => void; // alias for setCurrentPage

  // 任务相关
  createTask: (source: AnalysisTask["source"]) => string; // 返回 taskId
  updateTaskStatus: (
    taskId: string,
    status: TaskStatus,
    data?: Partial<AnalysisTask>
  ) => void;
  setTaskResult: (taskId: string, result: AnalysisTask["result"]) => void;
  setTaskError: (taskId: string, error: AnalysisTask["error"]) => void;
  retryTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;

  // 视图相关
  viewTask: (taskId: string | null) => void; // 切换查看某个任务
  toggleIndicator: () => void; // 展开/收起指示器
  clearCompletedTasks: () => void; // 清理已完成任务

  // 查询
  getRunningTasks: () => AnalysisTask[]; // 获取进行中的任务
  getCompletedTasks: () => AnalysisTask[]; // 获取已完成的任务
  getTaskForUrl: (url: string) => AnalysisTask | undefined; // 查找某 URL 的任务

  // 需求选择（保留原有功能）
  toggleDemandSelection: (id: string) => void;
  selectAllDemands: () => void;
  deselectAllDemands: () => void;

  // 兼容性方法（为旧代码保留）
  startAnalysis: () => void;
  setAnalysisResult: (result: any) => void;
  setError: (message: string, action?: string) => void;
}

/**
 * 生成 UUID
 */
function generateId(): string {
  return "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // ===== 初始状态 =====
  currentPage: null,
  tasks: [],
  activeTaskId: null,
  indicatorExpanded: false,
  extractionId: null,
  summary: null,
  demands: [],
  selectedDemandIds: [],

  // ===== 页面相关 =====

  /**
   * 设置当前页面信息
   * v2.1: URL 变化仅更新 currentPage，不重置任务
   * 自动关联已完成的分析任务
   */
  setCurrentPage: (info) => {
    set({ currentPage: info });

    // 检查是否有该 URL 的已完成任务，自动关联
    const existingTask = get().tasks.find(
      (t) => t.source.url === info?.url && t.status === "completed"
    );
    if (existingTask) {
      set({ activeTaskId: existingTask.id });
    } else {
      set({ activeTaskId: null });
    }
  },

  // ===== 任务相关 =====

  /**
   * 创建新的分析任务
   */
  createTask: (source) => {
    const taskId = generateId();
    const newTask: AnalysisTask = {
      id: taskId,
      source,
      status: "pending",
      createdAt: new Date(),
    };

    set((state) => {
      const newTasks = [...state.tasks, newTask];
      // 限制任务队列大小（最多 20 个），自动清理最早的已完成任务
      if (newTasks.length > 20) {
        const completedTasks = newTasks.filter((t) => t.status === "completed");
        const pendingTasks = newTasks.filter((t) => t.status !== "completed");
        const oldestCompleted = completedTasks
          .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
          .slice(0, Math.max(0, newTasks.length - 20));
        const tasksToKeep = pendingTasks.concat(oldestCompleted);
        return { tasks: tasksToKeep };
      }
      return { tasks: newTasks };
    });

    return taskId;
  },

  /**
   * 更新任务状态
   */
  updateTaskStatus: (taskId, status, data) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              ...(status === "extracting" || status === "analyzing"
                ? { startedAt: new Date() }
                : {}),
              ...(status === "completed" ? { completedAt: new Date() } : {}),
              ...data,
            }
          : task
      ),
    }));
  },

  /**
   * 设置任务结果
   */
  setTaskResult: (taskId, result) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "completed",
              result,
              completedAt: new Date(),
            }
          : task
      ),
    }));

    // 如果是当前查看的任务，更新显示结果
    const task = get().tasks.find((t) => t.id === taskId);
    if (task && get().activeTaskId === taskId && result) {
      set({
        extractionId: result.extractionId,
        summary: result.summary,
        demands: result.demands,
        selectedDemandIds: result.demands.map((d) => d.id), // 默认全选
      });
    }
  },

  /**
   * 设置任务错误
   */
  setTaskError: (taskId, error) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "error",
              error,
            }
          : task
      ),
    }));
  },

  /**
   * 重试任务
   */
  retryTask: (taskId) => {
    get().updateTaskStatus(taskId, "pending");
  },

  /**
   * 取消任务
   */
  cancelTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }));
    // 如果取消的是当前查看的任务，清空显示
    if (get().activeTaskId === taskId) {
      set({
        activeTaskId: null,
        extractionId: null,
        summary: null,
        demands: [],
        selectedDemandIds: [],
      });
    }
  },

  // ===== 视图相关 =====

  /**
   * 切换查看的任务
   */
  viewTask: (taskId) => {
    set({ activeTaskId: taskId });

    // 如果查看已完成任务，更新显示结果
    if (taskId) {
      const task = get().tasks.find((t) => t.id === taskId);
      if (task?.status === "completed" && task.result) {
        set({
          extractionId: task.result.extractionId,
          summary: task.result.summary,
          demands: task.result.demands,
          selectedDemandIds: task.result.demands.map((d) => d.id),
        });
      }
    } else {
      // 清除显示
      set({
        extractionId: null,
        summary: null,
        demands: [],
        selectedDemandIds: [],
      });
    }
  },

  /**
   * 展开/收起任务指示器
   */
  toggleIndicator: () => {
    set((state) => ({ indicatorExpanded: !state.indicatorExpanded }));
  },

  /**
   * 清理已完成的任务
   */
  clearCompletedTasks: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== "completed"),
    }));
  },

  // ===== 查询方法 =====

  /**
   * 获取进行中的任务
   */
  getRunningTasks: () => {
    return get().tasks.filter(
      (task) =>
        task.status === "pending" ||
        task.status === "extracting" ||
        task.status === "analyzing"
    );
  },

  /**
   * 获取已完成的任务
   */
  getCompletedTasks: () => {
    return get().tasks.filter((task) => task.status === "completed");
  },

  /**
   * 查找某 URL 的任务
   */
  getTaskForUrl: (url) => {
    return get().tasks.find((task) => task.source.url === url);
  },

  // ===== 需求选择（保留原有功能）=====

  /**
   * 切换需求选中状态
   */
  toggleDemandSelection: (id) => {
    set((state) => ({
      selectedDemandIds: state.selectedDemandIds.includes(id)
        ? state.selectedDemandIds.filter((i) => i !== id)
        : [...state.selectedDemandIds, id],
    }));
  },

  /**
   * 全选需求
   */
  selectAllDemands: () => {
    set((state) => ({
      selectedDemandIds: state.demands.map((d) => d.id),
    }));
  },

  /**
   * 取消全选
   */
  deselectAllDemands: () => {
    set({ selectedDemandIds: [] });
  },

  // ===== 兼容性方法（为旧代码保留）=====

  /**
   * 设置页面信息（别名）
   */
  setPageInfo: (info) => {
    // 调用统一入口，确保 activeTaskId 等联动逻辑执行
    get().setCurrentPage(info);
  },

  /**
   * 开始分析（任务模式下此方法不再需要）
   */
  startAnalysis: () => {
    // 任务模式下，分析由消息处理器创建任务并启动
    // 此方法保留以保持向后兼容
  },

  /**
   * 设置分析结果（兼容性）
   */
  setAnalysisResult: (result) => {
    // 兼容性方法，任务模式下结果通过 setTaskResult 设置
    // 此处清空当前显示以避免混淆
    set({
      extractionId: null,
      summary: null,
      demands: [],
      selectedDemandIds: [],
    });
  },

  /**
   * 设置错误（兼容性）
   */
  setError: (message, action) => {
    // 兼容性方法，任务模式下错误通过 setTaskError 设置
    // 此处清空当前显示以避免混淆
    set({
      extractionId: null,
      summary: null,
      demands: [],
      selectedDemandIds: [],
    });
  },
}));
