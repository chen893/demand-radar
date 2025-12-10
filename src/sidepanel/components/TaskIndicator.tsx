import React from "react";
import { useAnalysisStore } from "../stores";
import { TaskList } from "./TaskList";

export function TaskIndicator() {
  const {
    tasks,
    activeTaskId,
    indicatorExpanded,
    toggleIndicator,
    viewTask,
    retryTask,
    cancelTask,
    clearCompletedTasks,
  } = useAnalysisStore();

  if (!tasks.length) return null;

  const running = tasks.filter((t) =>
    ["pending", "extracting", "analyzing"].includes(t.status)
  ).length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const failed = tasks.filter((t) => t.status === "error").length;

  // 如果没有活动任务且没展开，不显示（或者显示一个小点？）
  // 这里设计为：有任务时显示悬浮胶囊
  if (tasks.length === 0) return null;

  return (
    <div
      className={`
      relative z-40 transition-all duration-300
      ${indicatorExpanded ? "bg-white border-b border-gray-100 shadow-lg" : "absolute top-2 right-1/2 translate-x-1/2 pointer-events-none"}
    `}
    >
      {/* Collapsed State: Floating Capsule */}
      {!indicatorExpanded && (
        <button
          onClick={toggleIndicator}
          className="pointer-events-auto flex items-center gap-2 pl-3 pr-4 py-1.5 bg-slate-900/90 backdrop-blur-md text-white rounded-full shadow-floating hover:scale-105 transition-transform animate-fade-in-up cursor-pointer"
        >
          {running > 0 ? (
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          ) : failed > 0 ? (
            <div className="w-2 h-2 rounded-full bg-red-400" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          )}

          <span className="text-xs font-bold tracking-wide">
            {running > 0
              ? `${running} 进行中`
              : failed > 0
                ? `${failed} 失败`
                : "任务完成"}
          </span>
        </button>
      )}

      {/* Expanded State: Full Panel */}
      {indicatorExpanded && (
        <div className="p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">任务队列</h3>
            <div className="flex items-center gap-3">
              {completed > 0 && (
                <button
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={clearCompletedTasks}
                >
                  清除已完成
                </button>
              )}
              <button
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                onClick={toggleIndicator}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-2 text-left">
            <TaskList
              tasks={tasks}
              activeTaskId={activeTaskId}
              onView={viewTask}
              onRetry={retryTask}
              onCancel={cancelTask}
            />
          </div>
        </div>
      )}
    </div>
  );
}
