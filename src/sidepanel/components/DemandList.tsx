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
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
       {/* Top Gradient Accent */}
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-10" />

      {/* 搜索与筛选栏 */}
      <div className="flex-none p-4 bg-white border-b border-gray-100 shadow-sm z-10 space-y-3">
        {/* Search Input */}
        <div className="relative group">
          <input
            type="text"
            placeholder="搜索洞察..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors"
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

        {/* Filter Chips */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStarred(!filterStarred)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${filterStarred
                ? "bg-yellow-50 border-yellow-200 text-yellow-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }
            `}
          >
            <span className={filterStarred ? "text-yellow-500" : "text-gray-400"}>⭐</span>
            收藏
          </button>
          <button
            onClick={() => setFilterArchived(!filterArchived)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${filterArchived
                ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }
            `}
          >
            <span className={filterArchived ? "text-purple-500" : "text-gray-400"}>📦</span>
            归档
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-gray-100 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}

        {!isLoading && demands.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-60">
                {searchQuery ? "🔍" : "📭"}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {searchQuery ? "未找到匹配项" : "需求库为空"}
            </h3>
            <p className="text-xs text-gray-500 max-w-[200px]">
              {searchQuery
                ? "尝试调整搜索关键词。"
                : filterStarred
                ? "暂无收藏项。"
                : filterArchived
                ? "暂无归档项。"
                : "分析页面以保存新洞察。"}
            </p>
          </div>
        )}

        {!isLoading && demands.length > 0 && (
          <div className="space-y-3">
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
        <div className="flex-none py-2 border-t border-gray-100 bg-white text-[10px] font-medium text-gray-400 text-center uppercase tracking-wider">
          {demands.length} 个条目
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
      className="group relative bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {demand.solution.title}
                </h4>
                {demand.archived && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">
                    已归档
                </span>
                )}
            </div>
          
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">
            {demand.solution.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {demand.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100"
              >
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-auto">
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                {formatRelativeTime(demand.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              demand.starred 
              ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100 opacity-100" // Always visible if starred
              : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
            }`}
            style={{ opacity: demand.starred ? 1 : undefined }}
            title={demand.starred ? "取消收藏" : "收藏"}
          >
            <svg className="w-4 h-4" fill={demand.starred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}