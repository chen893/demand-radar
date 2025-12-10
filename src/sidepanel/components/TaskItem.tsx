import React from "react";
import type { AnalysisTask } from "@/shared/types/analysis-task";

interface TaskItemProps {
  task: AnalysisTask;
  active?: boolean;
  onView: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

const statusLabel: Record<AnalysisTask["status"], string> = {
  pending: "排队中",
  extracting: "提取内容",
  analyzing: "AI 分析中",
  completed: "完成",
  error: "分析失败",
};

export function TaskItem({
  task,
  active,
  onView,
  onRetry,
  onCancel,
}: TaskItemProps) {
  const isRunning =
    task.status === "pending" ||
    task.status === "extracting" ||
    task.status === "analyzing";

  const progress = task.progress ?? (task.status === "completed" ? 100 : 0);

  // Status colors
  const getStatusColor = () => {
    switch (task.status) {
      case "completed":
        return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "error":
        return "text-red-600 bg-red-50 border-red-100";
      case "pending":
        return "text-slate-500 bg-slate-100 border-slate-200";
      default:
        return "text-brand-600 bg-brand-50 border-brand-100";
    }
  };

  return (
    <div
      className={`
        group relative overflow-hidden border rounded-xl p-3.5 transition-all cursor-pointer bg-white
        ${
          active
            ? "border-brand-300 shadow-md shadow-brand-500/10 ring-1 ring-brand-100"
            : "border-slate-100 shadow-sm hover:border-brand-200 hover:shadow-md"
        }
      `}
      onClick={onView}
    >
      {/* Background Progress Bar for Running Tasks */}
      {isRunning && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-brand-500/20 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex items-start gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
              {task.source.platform}
            </div>
            <span className="text-xs font-semibold text-slate-800 line-clamp-1">
              {task.source.title || task.source.url}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor()}`}
            >
              {statusLabel[task.status]}
            </span>

            {isRunning && (
              <div className="flex items-center gap-1.5 flex-1 max-w-[100px]">
                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-400 w-6 text-right">
                  {progress}%
                </span>
              </div>
            )}

            {task.status === "completed" && (
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                {task.result?.demands?.length ?? 0} 个洞察
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {task.status === "error" && (
            <button
              className="px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
            >
              重试
            </button>
          )}
          {isRunning && (
            <button
              className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
            >
              取消
            </button>
          )}
          {task.status === "completed" && active && (
            <span className="text-brand-500 text-sm">👉</span>
          )}
        </div>
      </div>
    </div>
  );
}
