/**
 * 分析视图组件
 * 显示当前页面信息和分析结果
 */

import React from "react";
import { useAnalysisStore, useConfigStore } from "../stores";
import { DemandCard } from "./DemandCard";
import { MessageType } from "@/shared/types/messages";

export function AnalysisView() {
  const {
    pageInfo,
    status,
    error,
    errorAction,
    summary,
    demands,
    selectedDemandIds,
    extractionId,
    toggleDemandSelection,
    selectAllDemands,
    deselectAllDemands,
    startAnalysis,
    setAnalysisResult,
    setError,
    setAnalyzing,
  } = useAnalysisStore();

  const { isConfigured } = useConfigStore();

  // 处理分析按钮点击
  const handleAnalyze = async () => {
    if (!isConfigured) {
      setError("请先配置 API Key", "settings");
      return;
    }

    startAnalysis();
    setAnalyzing();

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.ANALYZE_CURRENT_PAGE,
      });

      if (response.success) {
        setAnalysisResult(response.data);
      } else {
        setError(response.error || "分析失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
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
          sourceUrl: pageInfo?.url || "",
          sourceTitle: pageInfo?.title || "",
          sourcePlatform: pageInfo?.platform || "generic",
        })),
      });

      if (response.success) {
        alert(`已保存 ${response.data.savedCount} 个产品方向`);
      } else {
        setError(response.error || "保存失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  };

  // 获取平台显示名称
  const getPlatformName = (platform?: string): string => {
    switch (platform) {
      case "reddit":
        return "Reddit";
      case "zhihu":
        return "知乎";
      case "generic":
        return "通用网页";
      case "unsupported":
        return "不支持的网站";
      default:
        return "未知";
    }
  };

  // Determine button state
  const isAnalyzing = status === "extracting" || status === "analyzing";
  const canAnalyze = pageInfo?.canAnalyze && !isAnalyzing;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-10" />

      {/* 顶部：页面信息与操作 */}
      <div className="flex-none p-4 bg-white border-b border-gray-100 shadow-sm z-10">
        {/* 页面信息卡片 */}
        <div className="mb-4">
             <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    pageInfo?.canAnalyze ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                    {getPlatformName(pageInfo?.platform)}
                </span>
             </div>
             <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2" title={pageInfo?.title}>
                {pageInfo?.title || "等待页面加载..."}
             </h2>
        </div>

        {/* 操作按钮组 */}
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`
            w-full relative overflow-hidden group rounded-xl transition-all duration-300
            ${canAnalyze 
                ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30 hover:-translate-y-0.5" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }
          `}
        >
            <div className="relative px-4 py-3 flex items-center justify-center gap-2">
                {isAnalyzing ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-medium text-sm">
                            {status === "extracting" ? "读取内容中..." : "分析中..."}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="text-lg">✨</span>
                        <span className="font-medium text-sm">深度分析页面</span>
                    </>
                )}
            </div>
        </button>
      </div>

      {/* 错误提示 */}
      {status === "error" && error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 animate-fade-in">
          <div className="text-red-500 mt-0.5">⚠️</div>
          <div className="flex-1">
            <div className="text-red-800 font-medium text-sm">{error}</div>
            {errorAction === "settings" && (
              <button className="mt-1 text-xs font-bold text-red-600 hover:text-red-800 underline">
                配置 API Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        
        {/* 空状态 / 初始状态 */}
        {status === "idle" && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-60">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4 grayscale">
                    🔭
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">准备探索</h3>
                <p className="text-sm text-gray-500 max-w-[200px]">
                    打开 Reddit 帖子或知乎问答，点击分析。
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
                        {status === "extracting" ? "提取上下文中" : "生成洞察中"}
                    </h3>
                    <p className="text-sm text-gray-500 animate-pulse">
                        正在使用 AI 识别用户需求...
                    </p>
                </div>
            </div>
        )}

        {/* 分析完成：显示结果 */}
        {status === "completed" && (
          <div className="space-y-6 animate-fade-in">
            {/* 摘要卡片 */}
            {summary && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  执行摘要
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
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
      {status === "completed" && demands.length > 0 && (
        <div className="flex-none p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-20">
          <button
            onClick={handleSaveSelected}
            disabled={selectedDemandIds.length === 0}
            className={`
                w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
                ${selectedDemandIds.length > 0 
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