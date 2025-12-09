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
      default:
        return "未知";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 当前页面信息 */}
      <div className="p-4 border-b bg-gray-50">
        <div className="text-xs text-gray-500 mb-1">当前页面</div>
        <div className="font-medium text-sm truncate" title={pageInfo?.title}>
          {pageInfo?.title || "未检测到页面"}
        </div>
        {pageInfo?.platform && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              {getPlatformName(pageInfo.platform)}
            </span>
            {!pageInfo.canAnalyze && (
              <span className="text-xs text-orange-600">不支持分析</span>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="p-4 border-b flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={status === "extracting" || status === "analyzing" || !pageInfo?.canAnalyze}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {status === "extracting" && "提取中..."}
          {status === "analyzing" && "分析中..."}
          {status !== "extracting" && status !== "analyzing" && "分析此页面"}
        </button>
        <button
          onClick={handleQuickSave}
          disabled={status === "extracting" || status === "analyzing" || !pageInfo?.canAnalyze}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title="保存页面内容，稍后分析"
        >
          快速保存
        </button>
      </div>

      {/* 错误提示 */}
      {status === "error" && error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 text-sm">{error}</div>
          {errorAction === "settings" && (
            <button className="mt-2 text-sm text-blue-600 hover:underline">
              前往设置
            </button>
          )}
        </div>
      )}

      {/* 分析结果 */}
      <div className="flex-1 overflow-auto p-4">
        {status === "completed" && (
          <div className="space-y-4">
            {/* 摘要 */}
            {summary && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">页面摘要</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {summary}
                </p>
              </div>
            )}

            {/* 产品方向列表 */}
            {demands.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    识别到 {demands.length} 个产品方向
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={selectAllDemands}
                      className="text-blue-600 hover:underline"
                    >
                      全选
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllDemands}
                      className="text-blue-600 hover:underline"
                    >
                      取消
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
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
              <div className="text-center py-8 text-gray-500 text-sm">
                未识别到明显的产品方向
              </div>
            )}
          </div>
        )}

        {/* 空状态 */}
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">点击"分析此页面"开始</div>
          </div>
        )}

        {/* 加载中 */}
        {(status === "extracting" || status === "analyzing") && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3"></div>
            <div className="text-sm text-gray-500">
              {status === "extracting" ? "正在提取页面内容..." : "正在分析产品方向..."}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {status === "completed" && demands.length > 0 && (
        <div className="p-4 border-t bg-white">
          <button
            onClick={handleSaveSelected}
            disabled={selectedDemandIds.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            保存选中的 {selectedDemandIds.length} 个方向
          </button>
        </div>
      )}
    </div>
  );
}
