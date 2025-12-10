/**
 * 任务指示器组件
 * 显示当前进行中的任务数量，支持展开查看详情
 */

import React, { useEffect } from "react";
import { useAnalysisStore } from "@/sidepanel/stores/analysis";
import { TaskList } from "./TaskList";

export const TaskIndicator: React.FC = () => {
  const { tasks, indicatorExpanded, toggleIndicator } = useAnalysisStore();

  /**
   * 计算任务统计
   */
  const taskStats = {
    running: tasks.filter(
      (task) =>
        task.status === "pending" ||
        task.status === "extracting" ||
        task.status === "analyzing"
    ).length,
    completed: tasks.filter((task) => task.status === "completed").length,
    error: tasks.filter((task) => task.status === "error").length,
  };

  /**
   * 获取指示器显示内容
   */
  const getIndicatorContent = () => {
    if (taskStats.running > 0) {
      return {
        icon: "🔄",
        text: `${taskStats.running} 个分析进行中`,
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700",
      };
    }
    if (taskStats.error > 0) {
      return {
        icon: "⚠️",
        text: `${taskStats.error} 个分析失败`,
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        textColor: "text-orange-700",
      };
    }
    if (taskStats.completed > 0) {
      return {
        icon: "✅",
        text: `${taskStats.completed} 个分析已完成`,
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-700",
      };
    }
    return null;
  };

  const indicatorContent = getIndicatorContent();

  // 无任务时不显示指示器
  if (!indicatorContent || tasks.length === 0) {
    return null;
  }

  return (
    <>
      {/* 收起状态的指示器 */}
      {!indicatorExpanded && (
        <div
          className={`
            group relative overflow-hidden rounded-full border transition-all duration-300 cursor-pointer
            ${indicatorContent.bgColor} ${indicatorContent.borderColor}
            hover:shadow-md hover:-translate-y-0.5
          `}
          onClick={toggleIndicator}
        >
          {/* Progress Bar Background */}
          {taskStats.running > 0 && (
            <div className="absolute inset-0 bg-blue-200/20">
              <div className="h-full w-full bg-blue-400/10 animate-[shimmer_2s_infinite]" />
            </div>
          )}

          <div className="relative flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2">
              {/* Icon with pulse if running */}
              <span
                className={`${indicatorContent.textColor} ${taskStats.running > 0 ? "animate-pulse" : ""}`}
              >
                {indicatorContent.icon}
              </span>
              <span
                className={`text-xs font-semibold ${indicatorContent.textColor}`}
              >
                {indicatorContent.text}
              </span>
            </div>

            <div
              className={`
                w-4 h-4 rounded-full bg-white/50 flex items-center justify-center text-[8px]
                opacity-0 group-hover:opacity-100 transition-opacity -mr-1
             `}
            >
              ▼
            </div>
          </div>
        </div>
      )}

      {/* 展开状态的完整列表 */}
      {indicatorExpanded && <TaskList />}
    </>
  );
};
