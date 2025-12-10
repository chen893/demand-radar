/**
 * 任务项组件
 * 显示单个分析任务的信息和操作
 */

import React from "react";
import type { AnalysisTask } from "@/shared/types/messages";
import { useAnalysisStore } from "@/sidepanel/stores/analysis";

interface TaskItemProps {
  task: AnalysisTask;
  onView?: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onView }) => {
  const { viewTask, retryTask, cancelTask } = useAnalysisStore();

  const handleView = () => {
    viewTask(task.id);
    onView?.(task.id);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    retryTask(task.id);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelTask(task.id);
  };

  /**
   * 格式化时间差
   */
  const getTimeDiff = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时前`;
    }
    if (minutes > 0) {
      return `${minutes}分钟前`;
    }
    return "刚刚";
  };

  /**
   * 获取状态显示
   */
  const getStatusDisplay = () => {
    switch (task.status) {
      case "pending":
        return {
          icon: "⏳",
          text: "等待中",
          color: "text-gray-500",
        };
      case "extracting":
        return {
          icon: "🔍",
          text: "提取中",
          color: "text-blue-500",
        };
      case "analyzing":
        return {
          icon: "🔄",
          text: task.progress ? `分析中 ${task.progress}%` : "分析中",
          color: "text-blue-500",
        };
      case "completed":
        return {
          icon: "✅",
          text: `已完成 · ${task.result?.demands.length || 0}个方向`,
          color: "text-green-500",
        };
      case "error":
        return {
          icon: "❌",
          text: task.error?.message || "分析失败",
          color: "text-red-500",
        };
      default:
        return {
          icon: "❓",
          text: "未知状态",
          color: "text-gray-500",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
        task.status === "error" ? "border-red-200 bg-red-50" : "border-gray-200"
      }`}
      onClick={task.status === "completed" ? handleView : undefined}
    >
      {/* 任务来源信息 */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {task.source.title || "未知页面"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <span className="capitalize">{task.source.platform}</span>
            {" · "}
            {task.createdAt && getTimeDiff(task.createdAt)}
          </div>
        </div>
      </div>

      {/* 状态显示 */}
      <div className={`text-sm ${statusDisplay.color} mb-2`}>
        {statusDisplay.icon} {statusDisplay.text}
      </div>

      {/* 进度条（分析中） */}
      {task.status === "analyzing" && task.progress !== undefined && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-2">
        {task.status === "completed" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            查看结果
          </button>
        )}
        {task.status === "error" && (
          <>
            {task.error?.retryable && (
              <button
                onClick={handleRetry}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                重试
              </button>
            )}
            <button
              onClick={handleCancel}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              删除
            </button>
          </>
        )}
        {(task.status === "pending" || task.status === "extracting") && (
          <button
            onClick={handleCancel}
            className="text-xs text-gray-600 hover:text-gray-700 font-medium"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
};
