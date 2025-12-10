/**
 * 去重结果展示组件
 * v2.1: 显示 LLM 分析的相似需求分组建议
 */

import React, { useState } from "react";
import type { Demand } from "@/shared/types/demand";
import type { DuplicateAnalysisResult } from "@/background/dedup-service";

interface DedupResultViewProps {
  result: DuplicateAnalysisResult;
  demands: Demand[];
  onConfirm: (groups: DuplicateAnalysisResult["groups"], uniqueDemands: string[]) => void;
  onCancel: () => void;
}

export const DedupResultView: React.FC<DedupResultViewProps> = ({
  result,
  demands,
  onConfirm,
  onCancel,
}) => {
  const [confirmedGroups, setConfirmedGroups] = useState(
    new Set<string>() // 存储确认的分组 ID
  );

  /**
   * 切换分组确认状态
   */
  const toggleGroup = (groupIndex: number) => {
    const newConfirmed = new Set(confirmedGroups);
    const group = result.groups[groupIndex];
    const groupKey = group.demandIds.sort().join(",");

    if (newConfirmed.has(groupKey)) {
      newConfirmed.delete(groupKey);
    } else {
      newConfirmed.add(groupKey);
    }
    setConfirmedGroups(newConfirmed);
  };

  /**
   * 全选/取消全选
   */
  const handleSelectAll = () => {
    if (confirmedGroups.size === result.groups.length) {
      setConfirmedGroups(new Set());
    } else {
      const allGroupKeys = result.groups.map((g) => g.demandIds.sort().join(","));
      setConfirmedGroups(new Set(allGroupKeys));
    }
  };

  /**
   * 获取需求详情
   */
  const getDemandById = (id: string) => {
    return demands.find((d) => d.id === id);
  };

  /**
   * 确认合并
   */
  const handleConfirm = () => {
    const selectedGroups = result.groups.filter((group, index) => {
      const groupKey = group.demandIds.sort().join(",");
      return confirmedGroups.has(groupKey);
    });

    const uniqueDemands = result.uniqueDemands.filter((id) => {
      // 检查是否已被选中的分组包含
      return !selectedGroups.some((g) => g.demandIds.includes(id));
    });

    onConfirm(selectedGroups, uniqueDemands);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="flex-none p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            🔍 发现 {result.groups.length} 组相似需求
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600">
          分析了 {result.totalAnalyzed} 个需求，发现以下相似组：
        </p>
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {result.groups.map((group, index) => {
          const groupKey = group.demandIds.sort().join(",");
          const isConfirmed = confirmedGroups.has(groupKey);
          const groupDemands = group.demandIds.map(getDemandById).filter(Boolean) as Demand[];

          return (
            <div
              key={groupKey}
              className={`border rounded-lg p-4 transition-all ${
                isConfirmed ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              {/* 分组头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={() => toggleGroup(index)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <h3 className="font-semibold text-gray-900">
                      📁 {group.suggestedName}
                    </h3>
                    <span className="text-sm text-gray-500">({group.demandIds.length})</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">{group.reason}</p>
                </div>
              </div>

              {/* 需求列表 */}
              <div className="ml-6 space-y-2">
                {groupDemands.map((demand) => (
                  <div
                    key={demand.id}
                    className="p-2 bg-white border border-gray-100 rounded"
                  >
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {demand.solution.title}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {demand.solution.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span className="capitalize">{demand.sourcePlatform}</span>
                      <span>·</span>
                      <span>{new Date(demand.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 共同痛点 */}
              {group.commonPainPoints.length > 0 && (
                <div className="mt-3 ml-6">
                  <div className="text-xs font-medium text-gray-700 mb-1">共同痛点：</div>
                  <div className="flex flex-wrap gap-1">
                    {group.commonPainPoints.map((painPoint, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded"
                      >
                        {painPoint}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 独立需求 */}
        {result.uniqueDemands.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              独立需求 ({result.uniqueDemands.length})
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              以下需求未找到相似项，将保持独立：
            </p>
            <div className="space-y-2">
              {result.uniqueDemands.map((id) => {
                const demand = getDemandById(id);
                if (!demand) return null;

                return (
                  <div key={id} className="p-2 bg-gray-50 border border-gray-100 rounded">
                    <div className="font-medium text-sm text-gray-900">
                      {demand.solution.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="flex-none p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {confirmedGroups.size === result.groups.length ? "取消全选" : "全选"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmedGroups.size === 0}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg
                ${
                  confirmedGroups.size > 0
                    ? "text-white bg-blue-600 hover:bg-blue-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                }
              `}
            >
              合并选中 ({confirmedGroups.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
