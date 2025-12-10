/**
 * 分析状态管理（v2.1）
 * 解耦「当前页面」与「分析任务」，支持多任务队列
 */

import { create } from "zustand";
import type { PageInfoPayload } from "@/shared/types/messages";
import type { AnalysisTask, AnalysisTaskStatus } from "@/shared/types/analysis-task";
import { generateId } from "@/shared/utils/text-utils";

const MAX_TASKS = 20;

interface AnalysisState {
  // 当前页面（随 URL 变化更新）
  currentPage: PageInfoPayload | null;

  // 任务队列
  tasks: AnalysisTask[];
  activeTaskId: string | null;

  // UI 状态
  indicatorExpanded: boolean;

  // 需求选中状态（针对当前查看的任务）
  selectedDemandIds: string[];

  // 页面相关
  setCurrentPage: (info: PageInfoPayload | null) => void;

  // 任务相关
  upsertTask: (task: AnalysisTask) => void;
  createTask: (source: AnalysisTask["source"]) => string;
  updateTaskStatus: (
    taskId: string,
    status: AnalysisTaskStatus,
    data?: Partial<AnalysisTask>
  ) => void;
  setTaskResult: (taskId: string, result: AnalysisTask["result"]) => void;
  setTaskError: (taskId: string, error: NonNullable<AnalysisTask["error"]>) => void;
  retryTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  clearCompletedTasks: () => void;
  viewTask: (taskId: string | null) => void;
  getRunningTasks: () => AnalysisTask[];
  getTaskForUrl: (url: string) => AnalysisTask | undefined;
  toggleIndicator: () => void;

  // 需求选择
  toggleDemandSelection: (id: string) => void;
  selectAllDemands: () => void;
  deselectAllDemands: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentPage: null,
  tasks: [],
  activeTaskId: null,
  indicatorExpanded: false,
  selectedDemandIds: [],

  setCurrentPage: (info) => {
    set({ currentPage: info });

    if (!info?.url) {
      set({ activeTaskId: null, selectedDemandIds: [] });
      return;
    }

    const existingTask = get().tasks.find(
      (t) => t.source.url === info.url && t.status === "completed"
    );

    set({
      activeTaskId: existingTask?.id ?? null,
      selectedDemandIds: existingTask?.result?.demands.map((d) => d.id) ?? [],
    });
  },

  upsertTask: (task) => {
    set((state) => {
      const exists = state.tasks.find((t) => t.id === task.id);
      const nextTasks = exists
        ? state.tasks.map((t) => (t.id === task.id ? task : t))
        : [...state.tasks, task];

      return {
        tasks: nextTasks,
      };
    });
  },

  createTask: (source) => {
    const id = generateId();
    const now = new Date();

    set((state) => {
      const newTask: AnalysisTask = {
        id,
        source,
        status: "pending",
        progress: 0,
        createdAt: now,
      };
      const nextTasks: AnalysisTask[] = [...state.tasks, newTask];

      // 限制队列长度，优先移除最早完成的
      let trimmedTasks = nextTasks;
      if (nextTasks.length > MAX_TASKS) {
        const completed = nextTasks.filter((t) => t.status === "completed");
        if (completed.length > 0) {
          const oldestCompleted = completed.reduce((prev, curr) =>
            (prev.completedAt?.getTime() || 0) <= (curr.completedAt?.getTime() || 0)
              ? prev
              : curr
          );
          trimmedTasks = nextTasks.filter((t) => t.id !== oldestCompleted.id);
        } else {
          trimmedTasks = nextTasks.slice(-MAX_TASKS);
        }
      }

      return {
        tasks: trimmedTasks,
        activeTaskId: id,
        indicatorExpanded: true,
        selectedDemandIds: [],
      };
    });

    return id;
  },

  updateTaskStatus: (taskId, status, data) => {
    set((state) => {
      const exists = state.tasks.find((t) => t.id === taskId);
      const baseTask: AnalysisTask =
        exists ||
        ({
          id: taskId,
          source: {
            url: "",
            title: "",
            platform: "generic",
          },
          status: "pending",
          createdAt: new Date(),
        } as AnalysisTask);

      const tasks = state.tasks.some((t) => t.id === taskId)
        ? state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  startedAt: task.startedAt ?? (status !== "pending" ? new Date() : task.startedAt),
                  ...data,
                }
              : task
          )
        : [
            ...state.tasks,
            {
              ...baseTask,
              status,
              ...data,
            },
          ];

      return { tasks };
    });
  },

  setTaskResult: (taskId, result) => {
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const completedTask: AnalysisTask = {
          ...task,
          status: "completed",
          result,
          progress: 100,
          completedAt: new Date(),
          error: undefined,
        };
        return completedTask;
      });

      return {
        tasks: updatedTasks,
        activeTaskId: taskId,
        selectedDemandIds: result?.demands.map((d) => d.id) ?? [],
        indicatorExpanded: true,
      };
    });
  },

  setTaskError: (taskId, error) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "error",
              error,
              progress: undefined,
              completedAt: new Date(),
            }
          : task
      ),
    }));
  },

  retryTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "pending",
              progress: 0,
              error: undefined,
              startedAt: undefined,
              completedAt: undefined,
              result: undefined,
            }
          : task
      ),
      activeTaskId: taskId,
      selectedDemandIds: [],
    }));
  },

  cancelTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "error",
              error: {
                code: "TASK_CANCELLED",
                message: "任务已取消",
                retryable: true,
              },
              completedAt: new Date(),
            }
          : task
      ),
    }));
  },

  clearCompletedTasks: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== "completed"),
      activeTaskId: null,
      selectedDemandIds: [],
    }));
  },

  viewTask: (taskId) => {
    const targetTask = taskId
      ? get().tasks.find((t) => t.id === taskId)
      : undefined;

    set({
      activeTaskId: taskId,
      selectedDemandIds: targetTask?.result?.demands.map((d) => d.id) ?? [],
    });
  },

  getRunningTasks: () => {
    const tasks = get().tasks;
    return tasks.filter((t) =>
      ["pending", "extracting", "analyzing"].includes(t.status)
    );
  },

  getTaskForUrl: (url: string) => {
    return get().tasks.find((t) => t.source.url === url);
  },

  toggleDemandSelection: (id) => {
    set((state) => ({
      selectedDemandIds: state.selectedDemandIds.includes(id)
        ? state.selectedDemandIds.filter((i) => i !== id)
        : [...state.selectedDemandIds, id],
    }));
  },

  selectAllDemands: () => {
    const activeTask = get().tasks.find((t) => t.id === get().activeTaskId);
    set({
      selectedDemandIds: activeTask?.result?.demands.map((d) => d.id) ?? [],
    });
  },

  deselectAllDemands: () => {
    set({ selectedDemandIds: [] });
  },

  toggleIndicator: () => {
    set((state) => ({ indicatorExpanded: !state.indicatorExpanded }));
  },
}));
