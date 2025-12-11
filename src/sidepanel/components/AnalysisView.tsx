/**
 * 分析视图组件（v2.1）
 * 依赖任务队列，不再与页面强绑定
 */

import React from "react";
import toast from "react-hot-toast";
import { useAnalysisStore, useConfigStore } from "../stores";
import { DemandCard } from "./DemandCard";
import { MessageType } from "@/shared/types/messages";
import type { AnalysisTask } from "@/shared/types/analysis-task";

export function AnalysisView() {
  const {
    currentPage,
    tasks,
    activeTaskId,
    selectedDemandIds,
    createTask,
    updateTaskStatus,
    setTaskResult,
    setTaskError,
    toggleDemandSelection,
    selectAllDemands,
    deselectAllDemands,
  } = useAnalysisStore();

  const { isConfigured } = useConfigStore();

  const activeTask: AnalysisTask | undefined = tasks.find(
    (t) => t.id === activeTaskId
  );

  const summary = activeTask?.result?.summary ?? null;
  const demands = activeTask?.result?.demands ?? [];
  const extractionId = activeTask?.result?.extractionId ?? null;
  const error = activeTask?.error?.message ?? null;

  const isAnalyzing =
    activeTask &&
    (activeTask.status === "pending" ||
      activeTask.status === "extracting" ||
      activeTask.status === "analyzing");

  const canAnalyze = currentPage?.canAnalyze && !isAnalyzing;

  const handleQuickSave = async () => {
    if (!currentPage?.canAnalyze) {
      toast.error("当前页面不支持加入批量分析");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.QUICK_SAVE_CURRENT_PAGE,
      });

      if (response?.success) {
        toast.success("已加入批量分析队列");
      } else {
        toast.error(response?.error || "加入批量分析失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入批量分析失败");
    }
  };

  const handleAnalyze = async () => {
    if (!isConfigured) {
      toast.error("请先在设置中配置 API Key");
      return;
    }

    if (!currentPage?.url) {
      toast.error("无法获取当前页面信息");
      return;
    }

    const taskId = createTask({
      url: currentPage.url,
      title: currentPage.title,
      platform: currentPage.platform,
    });

    updateTaskStatus(taskId, "extracting");

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.ANALYZE_CURRENT_PAGE,
        payload: { taskId },
      });

      if (response.success) {
        updateTaskStatus(taskId, "analyzing");
        setTaskResult(taskId, response.data);
      } else {
        setTaskError(taskId, {
          code: "ANALYSIS_FAILED",
          message: response.error || "分析失败",
          retryable: true,
        });
      }
    } catch (err) {
      setTaskError(taskId, {
        code: "ANALYSIS_FAILED",
        message: err instanceof Error ? err.message : "分析失败",
        retryable: true,
      });
    }
  };

  const handleSaveSelected = async () => {
    if (selectedDemandIds.length === 0 || !extractionId) return;

    const selected = demands.filter((d) => selectedDemandIds.includes(d.id));

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.SAVE_DEMANDS,
        payload: selected.map((d) => ({
          ...d,
          extractionId,
          sourceUrl: currentPage?.url || "",
          sourceTitle: currentPage?.title || "",
          sourcePlatform: currentPage?.platform || "generic",
        })),
      });

      if (response.success) {
        toast.success(`已保存 ${response.data.savedCount} 个产品方向`);
      } else {
        toast.error(response.error || "保存失败");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const getPlatformName = (platform?: string): string => {
    switch (platform) {
      case "reddit":
        return "Reddit";
      case "zhihu":
        return "知乎";
      case "twitter":
        return "X (Twitter)";
      case "generic":
        return "网页";
      case "unsupported":
        return "不支持";
      default:
        return "未知";
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* 顶部控制面板 */}
      <div className="flex-none p-5 pb-4 z-20 transition-all duration-300">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                currentPage?.canAnalyze
                  ? "bg-brand-50 text-brand-600 border-brand-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              {getPlatformName(currentPage?.platform)}
            </span>
          </div>
          <h2
            className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2"
            title={currentPage?.title}
          >
            {currentPage?.title || "等待页面加载..."}
          </h2>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`w-full relative overflow-hidden group rounded-2xl transition-all duration-300 ${
              canAnalyze
                ? "bg-slate-900 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:shadow-xl hover:-translate-y-0.5"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative px-4 py-3.5 flex items-center justify-center gap-2.5">
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-semibold text-sm tracking-wide">
                    {activeTask?.status === "extracting"
                      ? "正在提取..."
                      : "深度分析中..."}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg group-hover:scale-110 transition-transform duration-300">
                    ✨
                  </span>
                  <span className="font-semibold text-sm tracking-wide">
                    深度分析页面
                  </span>
                </>
              )}
            </div>
          </button>

          <button
            onClick={handleQuickSave}
            disabled={!currentPage?.canAnalyze}
            className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              currentPage?.canAnalyze
                ? "border-slate-200 text-slate-600 bg-white/50 hover:bg-white hover:text-brand-600 hover:border-brand-200 hover:shadow-sm"
                : "border-transparent bg-slate-50 text-slate-400 cursor-not-allowed"
            }`}
          >
            加入批量队列
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {activeTask?.status === "error" && error && (
        <div className="mx-5 mb-4 p-3 bg-red-50/80 border border-red-100 rounded-xl flex items-start gap-3 animate-fade-in backdrop-blur-sm">
          <div className="text-red-500 mt-0.5 text-sm">⚠️</div>
          <div className="flex-1">
            <div className="text-red-800 font-medium text-xs leading-relaxed">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 space-y-4 no-scrollbar">
        {!activeTask && (
          <div className="h-[60%] flex flex-col items-center justify-center text-center p-4">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-soft animate-float">
              🔭
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2 font-display">
              准备探索
            </h3>
            <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed">
              打开 Reddit 帖子或知乎问答，点击上方按钮开始挖掘用户需求。
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="h-[60%] flex flex-col items-center justify-center p-8 space-y-8">
            <div className="relative">
              {/* Spinner Layers */}
              <div className="w-20 h-20 border-4 border-slate-100 rounded-full" />
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute top-2 left-2 w-16 h-16 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl animate-pulse">
                🧠
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900 animate-pulse">
                智能分析中
              </h3>
              <p className="text-sm text-slate-500">正在识别痛点与机会...</p>
            </div>
          </div>
        )}

        {activeTask?.status === "completed" && (
          <div className="space-y-6 animate-fade-in-up pb-20">
            {summary && (
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                  执行摘要
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {summary}
                </p>
              </div>
            )}

            {demands.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    发现机会
                    <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                      {demands.length}
                    </span>
                  </h3>
                  <div className="flex gap-1 text-[11px] font-medium">
                    <button
                      onClick={selectAllDemands}
                      className="text-brand-600 hover:text-brand-700 px-2.5 py-1 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      全选
                    </button>
                    <button
                      onClick={deselectAllDemands}
                      className="text-slate-400 hover:text-slate-600 px-2.5 py-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      清空
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {demands.map((demand, idx) => (
                    <div
                      className={`animate-fade-in-up delay-${Math.min(idx * 100, 500)}`}
                      key={demand.id}
                    >
                      <DemandCard
                        demand={demand}
                        selected={selectedDemandIds.includes(demand.id)}
                        onToggle={() => toggleDemandSelection(demand.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-500 font-medium">
                  ✨ 此页面未发现明确需求。
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTask?.status === "completed" && demands.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <button
            onClick={handleSaveSelected}
            disabled={selectedDemandIds.length === 0}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
              selectedDemandIds.length > 0
                ? "bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700 hover:-translate-y-1 hover:shadow-brand-600/40"
                : "bg-virtual-100 text-slate-300 bg-slate-100 cursor-not-allowed shadow-none"
            }`}
          >
            <span>💾</span>
            保存 {selectedDemandIds.length} 个洞察
          </button>
        </div>
      )}
    </div>
  );
}
