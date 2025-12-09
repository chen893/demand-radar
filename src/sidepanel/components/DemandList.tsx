/**
 * 需求列表组件
 * 显示已保存的产品方向列表
 */

import React, { useEffect, useState } from "react";
import { useDemandsStore, useFilteredDemands } from "../stores";
import { DemandDetail } from "./DemandDetail";
import type { Demand } from "@/shared/types/demand";
import { formatRelativeTime } from "@/shared/utils/text-utils";

export function DemandList() {
  const {
    isLoading,
    error,
    searchQuery,
    filterStarred,
    filterArchived,
    allTags,
    selectedDemandId,
    fetchDemands,
    setSearchQuery,
    setFilterStarred,
    setFilterArchived,
    selectDemand,
    toggleStar,
    deleteDemand,
    clearError,
  } = useDemandsStore();

  const demands = useFilteredDemands();
  const [searchInput, setSearchInput] = useState(searchQuery);

  // 初始化加载
  useEffect(() => {
    fetchDemands();
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 如果选中了需求，显示详情
  if (selectedDemandId) {
    return <DemandDetail />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索产品方向..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 筛选按钮 */}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setFilterStarred(!filterStarred)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterStarred
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            ⭐ 收藏
          </button>
          <button
            onClick={() => setFilterArchived(!filterArchived)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterArchived
                ? "bg-gray-100 border-gray-300 text-gray-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            📦 归档
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* 列表内容 */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {!isLoading && demands.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-sm text-center">
              {searchQuery
                ? "没有找到匹配的产品方向"
                : filterStarred
                ? "没有收藏的产品方向"
                : filterArchived
                ? "没有归档的产品方向"
                : "还没有保存任何产品方向"}
            </div>
            {!searchQuery && !filterStarred && !filterArchived && (
              <div className="text-xs text-gray-400 mt-1">
                分析页面后保存产品方向
              </div>
            )}
          </div>
        )}

        {!isLoading && demands.length > 0 && (
          <div className="p-4 space-y-2">
            {demands.map((demand) => (
              <DemandListItem
                key={demand.id}
                demand={demand}
                onClick={() => selectDemand(demand.id)}
                onToggleStar={() => toggleStar(demand.id)}
                onDelete={() => {
                  if (confirm("确定删除这个产品方向？")) {
                    deleteDemand(demand.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {!isLoading && demands.length > 0 && (
        <div className="p-3 border-t text-xs text-gray-500 text-center">
          共 {demands.length} 个产品方向
        </div>
      )}
    </div>
  );
}

/**
 * 需求列表项组件
 */
interface DemandListItemProps {
  demand: Demand;
  onClick: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}

function DemandListItem({
  demand,
  onClick,
  onToggleStar,
  onDelete,
}: DemandListItemProps) {
  return (
    <div
      className="border rounded-lg bg-white p-3 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm text-gray-900 truncate">
              {demand.solution.title}
            </h4>
            {demand.starred && (
              <span className="text-yellow-500 text-xs">⭐</span>
            )}
            {demand.archived && (
              <span className="text-xs text-gray-400">归档</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {demand.solution.description}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {demand.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {demand.tags.length > 2 && (
              <span className="text-xs text-gray-400">
                +{demand.tags.length - 2}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {formatRelativeTime(demand.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              demand.starred ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
            }`}
            title={demand.starred ? "取消收藏" : "收藏"}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
