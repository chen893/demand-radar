/**
 * 分析视图组件
 * v2.1: 显示当前页面信息和分析结果，支持任务独立化
 */

import React, { useState } from "react";
import { useAnalysisStore, useConfigStore } from "../stores";
import { DemandCard } from "./DemandCard";
import { TaskIndicator } from "./TaskIndicator";
import { MessageType } from "@/shared/types/messages";

export function AnalysisView() {
  const {
    currentPage,
    activeTaskId,
    tasks,
    summary,
    demands,
    selectedDemandIds,
    extractionId,
    toggleDemandSelection,
    selectAllDemands,
    deselectAllDemands,
    createTask,
    setTaskError,
    viewTask,
  } = useAnalysisStore();

  const { isConfigured } = useConfigStore();
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  // 获取当前查看的任务
  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null;

  // 处理分析按钮点击
  const handleAnalyze = async () => {
    if (!isConfigured || !currentPage) {
      return;
    }

    // 检查平台是否支持
    if (currentPage.platform === "unsupported") {
      return;
    }

    // 创建任务
    const taskId = createTask({
      url: currentPage.url,
      title: currentPage.title,
      platform: currentPage.platform,
    });
    viewTask(taskId);

    try {
      // 启动分析
      const response = await chrome.runtime.sendMessage({
        type: MessageType.ANALYZE_CURRENT_PAGE,
        payload: {
          taskId,
          source: {
            url: currentPage.url,
            title: currentPage.title,
            platform: currentPage.platform,
          },
        },
      });

      if (response.success) {
        // 分析成功，任务状态由 Background Script 更新
      } else {
        // 分析失败，设置任务错误
        setTaskError(taskId, {
          code: "ANALYSIS_FAILED",
          message: response.error || "分析失败",
          retryable: true,
        });
      }
    } catch (err) {
      setTaskError(taskId, {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "分析失败",
        retryable: true,
      });
    }
  };

  // 处理保存选中的需求
  const handleSaveSelected = async () => {
    if (selectedDemandIds.length === 0 || !extractionId) return;

    const selectedDemands = demands.filter((d) =>
      selectedDemandIds.includes(d.id)
    );

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.SAVE_DEMANDS,
        payload: selectedDemands.map((d) => ({
          ...d,
          extractionId,
          sourceUrl: currentPage?.url || "",
          sourceTitle: currentPage?.title || "",
          sourcePlatform: currentPage?.platform || "generic",
        })),
      });

      if (response.success) {
        alert(`已保存 ${response.data.savedCount} 个产品方向`);
      } else {
        alert(response.error || "保存失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败");
    }
  };

  // 加入批量队列（快速保存，不触发分析）
  const handleQuickSaveForBatch = async () => {
    if (!currentPage || isQuickSaving || !isConfigured) return;
    setIsQuickSaving(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.QUICK_SAVE_CURRENT_PAGE,
      });
      if (response.success) {
        alert("已加入待分析队列");
      } else {
        alert(response.error || "加入队列失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "加入队列失败");
    } finally {
      setIsQuickSaving(false);
    }
  };

  // 获取平台显示名称
  const getPlatformName = (platform?: string): string => {
    switch (platform) {
      case "reddit":
        return "Reddit";
      case "zhihu":
        return "知乎";
      case "twitter":
        return "Twitter/X";
      case "generic":
        return "通用网页";
      case "unsupported":
        return "不支持的网站";
      default:
        return "未知";
    }
  };

  // 获取当前任务状态
  const getTaskStatus = () => {
    if (!activeTask) return "idle";
    return activeTask.status;
  };

  const taskStatus = getTaskStatus();
  const isAnalyzing = taskStatus === "extracting" || taskStatus === "analyzing";
  const canAnalyze = currentPage?.canAnalyze && !isAnalyzing;
  const hasError = activeTask?.status === "error";

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Gradient Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-10" />

      {/* 任务指示器 */}
      <div className="p-4 pb-2">
        <TaskIndicator />
      </div>

      {/* 顶部：页面信息与操作 */}
      <div className="flex-none p-5 pt-4 z-10">
        {/* 页面信息卡片 */}
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                currentPage?.canAnalyze
                  ? "bg-blue-50 border-blue-100/50 text-blue-600"
                  : "bg-gray-100 border-gray-200 text-gray-500"
              }`}
            >
              {getPlatformName(currentPage?.platform)}
            </span>
          </div>
          <h2
            className="text-lg font-bold text-gray-900 leading-snug line-clamp-2"
            title={currentPage?.title}
          >
            {currentPage?.title || "等待页面加载..."}
          </h2>
        </div>

        {/* 操作按钮组 - Hero Style */}
        <div className="relative group">
          <div
            className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500 ${!canAnalyze ? "hidden" : ""}`}
          ></div>
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`
                    relative w-full overflow-hidden rounded-xl transition-all duration-300 transform
                    ${
                      canAnalyze
                        ? "bg-gray-900 text-white shadow-xl hover:-translate-y-0.5"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    }
                `}
          >
            {/* Button Content */}
            <div className="relative px-6 py-4 flex items-center justify-between z-10">
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-bold text-base tracking-tight">
                  {isAnalyzing ? "正在深入分析" : "开始深度洞察"}
                </span>
                <span
                  className={`text-[10px] font-medium ${canAnalyze ? "text-gray-400" : "text-gray-400"}`}
                >
                  {isAnalyzing
                    ? "AI 正在提取关键信息..."
                    : "一键提取用户需求与痛点"}
                </span>
              </div>

              {/* Icon/Spinner */}
              <div
                className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                        ${canAnalyze ? "bg-white/10 text-white group-hover:bg-white/20 group-hover:scale-110" : "bg-gray-200 text-gray-500"}
                    `}
              >
                {isAnalyzing ? (
                  <svg
                    className="animate-spin w-5 h-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 transform group-hover:rotate-12 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Shimmer Effect */}
            {canAnalyze && !isAnalyzing && (
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleQuickSaveForBatch}
            disabled={!currentPage?.canAnalyze || isQuickSaving}
            className={`
              flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center justify-center gap-2
              ${
                !currentPage?.canAnalyze || isQuickSaving
                  ? "text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50"
                  : "text-blue-600 border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm"
              }
            `}
          >
            {isQuickSaving ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
            {isQuickSaving ? "处理中..." : "加入批量队列"}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {hasError && activeTask?.error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 animate-fade-in">
          <div className="text-red-500 mt-0.5">⚠️</div>
          <div className="flex-1">
            <div className="text-red-800 font-medium text-sm">
              {activeTask.error.message}
            </div>
            {activeTask.error.retryable && (
              <button
                onClick={handleAnalyze}
                className="mt-1 text-xs font-bold text-red-600 hover:text-red-800 underline"
              >
                重试分析
              </button>
            )}
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* 空状态 / 初始状态 */}
        {!activeTask && !isAnalyzing && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-80 animate-fade-in">
            <div className="relative mb-6 group">
              <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-1000"></div>
              <div className="relative w-24 h-24 bg-gradient-to-tr from-gray-50 to-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 flex items-center justify-center">
                <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all duration-500">
                  🔭
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
              准备探索新机遇
            </h3>
            <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed text-balance">
              打开 <span className="text-gray-700 font-semibold">Reddit</span>、
              <span className="text-gray-700 font-semibold">知乎</span> 或{" "}
              <span className="text-gray-700 font-semibold">Twitter</span>{" "}
              帖子，点击分析以挖掘用户潜在需求。
            </p>
          </div>
        )}

        {/* 正在分析 */}
        {isAnalyzing && (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-100 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-medium text-gray-900">
                {taskStatus === "extracting" ? "提取上下文中" : "生成洞察中"}
              </h3>
              <p className="text-sm text-gray-500 animate-pulse">
                正在使用 AI 识别用户需求...
              </p>
            </div>
          </div>
        )}

        {/* 分析完成：显示结果 */}
        {taskStatus === "completed" && activeTask?.result && (
          <div className="space-y-6 animate-fade-in">
            {/* 摘要卡片 */}
            {/* 摘要卡片 */}
            {summary && (
              <div className="glass-premium rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-sm" />
                  执行摘要
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">
                  {summary}
                </p>
              </div>
            )}

            {/* 需求列表 */}
            {demands.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    发现的机会
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      {demands.length}
                    </span>
                  </h3>
                  <div className="flex gap-2 text-xs font-medium">
                    <button
                      onClick={selectAllDemands}
                      className="text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded"
                    >
                      全选
                    </button>
                    <button
                      onClick={deselectAllDemands}
                      className="text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-50 rounded"
                    >
                      清空
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {demands.map((demand) => (
                    <DemandCard
                      key={demand.id}
                      demand={demand}
                      selected={selectedDemandIds.includes(demand.id)}
                      onToggle={() => toggleDemandSelection(demand.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-500">此页面未发现具体需求。</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部保存栏 */}
      {taskStatus === "completed" && demands.length > 0 && (
        <div className="flex-none p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-20">
          <button
            onClick={handleSaveSelected}
            disabled={selectedDemandIds.length === 0}
            className={`
                w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
                ${
                  selectedDemandIds.length > 0
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
            `}
          >
            <span>💾</span>
            保存 {selectedDemandIds.length} 个精选洞察
          </button>
        </div>
      )}
    </div>
  );
}
