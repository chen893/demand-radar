/**
 * 任务列表组件
 * 显示所有分析任务的列表，支持按状态分组
 */

import React from "react";
import { TaskItem } from "./TaskItem";
import { useAnalysisStore } from "@/sidepanel/stores/analysis";

export const TaskList: React.FC = () => {
  const { tasks, clearCompletedTasks, indicatorExpanded, toggleIndicator } =
    useAnalysisStore();

  /**
   * 按状态分组任务
   */
  const groupedTasks = {
    running: tasks.filter(
      (task) =>
        task.status === "pending" ||
        task.status === "extracting" ||
        task.status === "analyzing"
    ),
    completed: tasks.filter((task) => task.status === "completed"),
    error: tasks.filter((task) => task.status === "error"),
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="font-medium text-gray-900">分析任务</span>
        </div>
        <button
          onClick={toggleIndicator}
          className="text-sm text-gray-600 hover:text-gray-700"
        >
          收起
        </button>
      </div>

      {/* 任务列表 */}
      <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
        {/* 进行中任务 */}
        {groupedTasks.running.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              ⏳ 进行中 ({groupedTasks.running.length})
            </div>
            <div className="space-y-2">
              {groupedTasks.running.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* 已完成任务 */}
        {groupedTasks.completed.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              ✅ 已完成 ({groupedTasks.completed.length})
            </div>
            <div className="space-y-2">
              {groupedTasks.completed.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* 失败任务 */}
        {groupedTasks.error.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              ❌ 失败 ({groupedTasks.error.length})
            </div>
            <div className="space-y-2">
              {groupedTasks.error.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-sm">暂无分析任务</div>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {tasks.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          {groupedTasks.completed.length > 0 && (
            <button
              onClick={clearCompletedTasks}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              清除已完成
            </button>
          )}
        </div>
      )}
    </div>
  );
};
