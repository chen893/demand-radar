/**
 * 批量分析面板组件
 * v2.1: 支持批量分析待分析状态的内容
 */

import React, { useEffect, useState } from "react";
import { useAnalysisStore } from "../stores/analysis";
import { MessageType } from "@/shared/types/messages";
import type { Extraction } from "@/shared/types/extraction";

interface BatchAnalyzePanelProps {
  pendingExtractions: Array<{
    id: string;
    title: string;
    url: string;
    platform: string;
    capturedAt: Date;
  }>;
}

export const BatchAnalyzePanel: React.FC<BatchAnalyzePanelProps> = ({
  pendingExtractions,
}) => {
  const { createTask, viewTask } = useAnalysisStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(pendingExtractions.map((e) => e.id))
  );
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [items, setItems] = useState(pendingExtractions);

  const loadPending = () => {
    chrome.runtime
      .sendMessage({ type: MessageType.GET_EXTRACTIONS })
      .then((resp) => {
        if (resp?.success) {
          const list = (resp.data as Extraction[]).filter(
            (e) => e.analysisStatus === "pending"
          );
          setItems(
            list.map((e) => ({
              id: e.id,
              title: e.title,
              url: e.url,
              platform: e.platform,
              capturedAt: e.capturedAt,
            }))
          );
          setSelectedIds(new Set(list.map((e) => e.id)));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPending();

    const handleMessage = (message: { type: string }) => {
      if (
        message.type === MessageType.QUICK_SAVE_COMPLETE ||
        message.type === MessageType.TASK_COMPLETED
      ) {
        loadPending();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  /**
   * 全选/取消全选
   */
  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((e) => e.id)));
    }
  };

  /**
   * 切换选中状态
   */
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  /**
   * 开始批量分析
   */
  const handleBatchAnalyze = async () => {
    if (selectedIds.size === 0) return;

    setIsAnalyzing(true);
    setProgress({ completed: 0, total: selectedIds.size });

    const selectedExtractions = items.filter((e) =>
      selectedIds.has(e.id)
    );

    try {
      // 为每个选中的内容创建任务
      for (const extraction of selectedExtractions) {
        const taskId = createTask({
          url: extraction.url,
          title: extraction.title,
          platform: extraction.platform as any,
        });
        viewTask(taskId);

        // 启动分析
        try {
          const response = await chrome.runtime.sendMessage({
            type: MessageType.ANALYZE_CURRENT_PAGE,
            payload: {
              taskId,
              extractionId: extraction.id,
              source: {
                url: extraction.url,
                title: extraction.title,
                platform: extraction.platform,
              },
            },
          });

          if (response.success) {
            setProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));
          }
        } catch (error) {
          console.error("分析失败:", error);
          setProgress((prev) => ({
            ...prev,
            completed: prev.completed + 1,
          }));
        }
      }

      // 分析完成
      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress({ completed: 0, total: 0 });
        alert(`批量分析完成！已处理 ${selectedExtractions.length} 个内容`);
      }, 1000);
    } catch (error) {
      console.error("批量分析失败:", error);
      setIsAnalyzing(false);
      alert("批量分析失败，请重试");
    }
  };

  /**
   * 清除选择
   */
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <span className="font-medium text-gray-900">
              {items.length} 个内容待分析
            </span>
          </div>
          {!isAnalyzing && (
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === items.length ? "取消全选" : "全选"}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  清除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 进度显示 */}
      {isAnalyzing && (
        <div className="p-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              批量分析中...
            </span>
            <span className="text-xs text-blue-700">
              {progress.completed}/{progress.total} 完成
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 内容列表 */}
      <div className="max-h-64 overflow-y-auto">
        {items.map((extraction) => (
          <div
            key={extraction.id}
            className={`p-3 border-b border-gray-100 last:border-b-0 ${
              selectedIds.has(extraction.id) ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {!isAnalyzing && (
                <button
                  onClick={() => handleToggleSelect(extraction.id)}
                  className="mt-0.5"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(extraction.id)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {selectedIds.has(extraction.id) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {extraction.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span className="capitalize">{extraction.platform}</span>
                  <span>·</span>
                  <span>
                    {new Date(extraction.capturedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {!isAnalyzing ? (
          <button
            onClick={handleBatchAnalyze}
            disabled={selectedIds.size === 0}
            className={`
              w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
              ${
                selectedIds.size > 0
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            <span>🚀</span>
            批量分析 ({selectedIds.size})
          </button>
        ) : (
          <div className="text-center text-sm text-gray-600">
            正在分析，请稍候...
          </div>
        )}
      </div>
    </div>
  );
};
