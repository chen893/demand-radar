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
  console.log("test", pageInfo);
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

  // 处理快速保存
  const handleQuickSave = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.QUICK_SAVE_CURRENT_PAGE,
      });

      if (response.success) {
        // 显示成功提示
        alert("页面已保存，稍后可以进行分析");
      } else {
        setError(response.error || "保存失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
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

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Background blobs for depth */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-brand-start/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-40 h-40 bg-brand-end/5 rounded-full blur-2xl pointer-events-none" />

      {/* 当前页面信息 */}
      <div className="mx-4 mt-4 p-4 bg-white/60 backdrop-blur-sm border border-white shadow-sm rounded-2xl relative z-0">
        <div className="flex justify-between items-start mb-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Current Page
          </div>
          {pageInfo?.platform && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pageInfo.canAnalyze
                  ? "bg-brand-end/10 text-brand-end"
                  : "bg-status-warning/10 text-status-warning"
              }`}
            >
              {getPlatformName(pageInfo.platform)}
            </span>
          )}
        </div>
        <div
          className="font-montserrat font-bold text-gray-800 line-clamp-2 leading-tight"
          title={pageInfo?.title}
        >
          {pageInfo?.title || "未检测到页面"}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mx-4 mt-3 flex gap-3 z-0">
        <button
          onClick={handleAnalyze}
          disabled={
            status === "extracting" ||
            status === "analyzing" ||
            !pageInfo?.canAnalyze
          }
          className="flex-1 relative overflow-hidden group bg-gradient-to-r from-brand-start to-brand-end p-[1px] rounded-xl shadow-lg shadow-brand-end/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all hover:shadow-brand-end/40 hover:-translate-y-0.5"
        >
          <div className="bg-white/10 backdrop-blur-sm h-full w-full rounded-[11px] px-4 py-3 flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors">
            {status === "extracting" || status === "analyzing" ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-lg">✨</span>
            )}
            <span className="font-montserrat font-bold text-white tracking-wide text-sm">
              {status === "extracting"
                ? "Extracting..."
                : status === "analyzing"
                  ? "Analyzing..."
                  : "Analyze Page"}
            </span>
          </div>
        </button>
        <button
          onClick={handleQuickSave}
          disabled={
            status === "extracting" ||
            status === "analyzing" ||
            !pageInfo?.canAnalyze
          }
          className="px-4 bg-white text-gray-600 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-1"
          title="Save Content"
        >
          <span>📥</span>
        </button>
      </div>

      {/* 错误提示 */}
      {status === "error" && error && (
        <div className="mx-4 mt-4 p-4 bg-status-error/5 border border-status-error/20 rounded-2xl flex items-start gap-3">
          <div className="text-status-error mt-0.5">⚠️</div>
          <div className="flex-1">
            <div className="text-status-error font-medium text-sm">{error}</div>
            {errorAction === "settings" && (
              <button className="mt-1 text-xs font-bold text-status-error/80 hover:text-status-error underline">
                去设置 Token
              </button>
            )}
          </div>
        </div>
      )}

      {/* 分析结果 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 z-0">
        {status === "completed" && (
          <div className="space-y-5">
            {/* 摘要 */}
            {summary && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-1 h-3 bg-brand-accent rounded-full mb-[1px]" />
                  Summary
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-poppins">
                  {summary}
                </p>
              </div>
            )}

            {/* 产品方向列表 */}
            {demands.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-montserrat font-bold text-gray-800 flex items-center gap-2">
                    Insights
                    <span className="bg-brand-secondary/30 text-brand-accent text-xs px-2 py-0.5 rounded-full">
                      {demands.length}
                    </span>
                  </h3>
                  <div className="flex gap-3 text-xs font-medium">
                    <button
                      onClick={selectAllDemands}
                      className="text-brand-end hover:text-blue-600 transition-colors"
                    >
                      All
                    </button>
                    <button
                      onClick={deselectAllDemands}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      None
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
            )}

            {demands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-3 grayscale opacity-50">
                  🤷‍♂️
                </div>
                <p className="text-gray-500 font-medium">No insights found.</p>
                <p className="text-xs text-gray-400 mt-1">Try another page?</p>
              </div>
            )}
          </div>
        )}

        {/* 空状态 */}
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            {pageInfo?.platform === "unsupported" ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                <div className="text-5xl mb-4 grayscale opacity-80">🔭</div>
                <h3 className="font-montserrat font-bold text-lg text-gray-800 mb-2">
                  Not Supported
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Currently optimized for{" "}
                  <span className="font-bold text-gray-700">Reddit</span> &{" "}
                  <span className="font-bold text-gray-700">Zhihu</span>.
                </p>
              </div>
            ) : (
              <div className="group cursor-pointer" onClick={handleAnalyze}>
                <div className="w-24 h-24 bg-gradient-to-tr from-brand-start/20 to-brand-end/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-16 h-16 bg-gradient-to-tr from-brand-start to-brand-end rounded-full flex items-center justify-center text-3xl shadow-lg shadow-brand-end/30 animate-pulse-slow">
                    🚀
                  </div>
                </div>
                <h3 className="font-montserrat font-bold text-lg text-gray-800 mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-sm text-gray-400">
                  Click the button above to start
                </p>
              </div>
            )}
          </div>
        )}

        {/* 加载中 */}
        {(status === "extracting" || status === "analyzing") && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-brand-end border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">
                🤔
              </div>
            </div>
            <h3 className="font-montserrat font-bold text-lg text-gray-800 mb-1">
              Thinking...
            </h3>
            <p className="text-sm text-gray-500">
              {status === "extracting"
                ? "Reading page content"
                : "Analyzing market demand"}
            </p>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {status === "completed" && demands.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-white/90 backdrop-blur-md z-10 sticky bottom-0">
          <button
            onClick={handleSaveSelected}
            disabled={selectedDemandIds.length === 0}
            className="w-full bg-status-success text-white py-3 px-4 rounded-xl shadow-lg shadow-status-success/30 hover:bg-green-500 hover:shadow-status-success/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:shadow-none disabled:transform-none font-bold text-sm flex items-center justify-center gap-2"
          >
            <span>💾</span>
            Save {selectedDemandIds.length} Insights
          </button>
        </div>
      )}
    </div>
  );
}
