/**
 * 需求列表组件
 * 显示已保存的产品方向列表
 */

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDemandsStore, useFilteredDemands } from "../stores";
import { DemandDetail } from "./DemandDetail";
import { useConfirm } from "./ConfirmProvider";
import type { Demand } from "@/shared/types/demand";
import type { DemandGroup } from "@/shared/types/demand-group";
import { MessageType } from "@/shared/types/messages";
import { DedupResultView, DemandGroupCard } from ".";
import { formatRelativeTime } from "@/shared/utils/text-utils";

export function DemandList() {
  const {
    isLoading,
    error,
    searchQuery,
    filterStarred,
    filterArchived,
    selectedDemandId,
    fetchDemands,
    fetchGroups,
    setSearchQuery,
    setFilterStarred,
    setFilterArchived,
    selectDemand,
    toggleStar,
    deleteDemand,
    clearError,
    groups,
  } = useDemandsStore();
  const { confirm } = useConfirm();

  const demands = useFilteredDemands();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [dedupSuggestions, setDedupSuggestions] = useState<DemandGroup[]>([]);

  // 初始化加载
  useEffect(() => {
    fetchDemands();
    fetchGroups();
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 去重分析
  const canDedup = demands.length >= 5;
  const handleDedup = async () => {
    if (!canDedup) return;
    const response = await chrome.runtime.sendMessage({
      type: MessageType.DEDUP_ANALYZE_START,
    });
    if (response?.success) {
      const groups = (response.data.groups || []).map(
        (g: any): DemandGroup => ({
          id: g.suggestedName || g.demandIds.join("-"),
          name: g.suggestedName,
          demandIds: g.demandIds,
          commonPainPoints: g.commonPainPoints || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
      setDedupSuggestions(groups);
    } else {
      toast.error(response?.error || "去重分析失败");
    }
  };

  const handleConfirmGroup = async (groupId: string) => {
    const group = dedupSuggestions.find((g) => g.id === groupId);
    if (!group) return;
    const resp = await chrome.runtime.sendMessage({
      type: MessageType.DEDUP_CONFIRM,
      payload: {
        suggestedName: group.name,
        demandIds: group.demandIds,
        commonPainPoints: group.commonPainPoints,
      },
    });
    if (resp?.success) {
      setDedupSuggestions((prev) => prev.filter((g) => g.id !== groupId));
      fetchDemands();
      fetchGroups();
      toast.success("合并成功");
    } else {
      toast.error(resp?.error || "合并失败");
    }
  };

  const handleSkipGroup = (groupId: string) => {
    setDedupSuggestions((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleBatchAnalyze = async () => {
    const resp = await chrome.runtime.sendMessage({
      type: MessageType.BATCH_ANALYZE_START,
    });
    if (!resp?.success) {
      toast.error(resp?.error || "批量分析启动失败");
    } else {
      toast.success(`批量分析已启动，任务数：${resp.data?.total ?? "未知"}`);
    }
  };

  // 如果选中了需求，显示详情
  if (selectedDemandId) {
    return <DemandDetail />;
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* 搜索与筛选栏 - Floating Header */}
      <div className="flex-none p-4 z-20 space-y-3 sticky top-0 transition-all duration-300">
        <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight px-1">
          洞察库
        </h2>

        {/* Search Input */}
        <div className="relative group">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-2xl shadow-sm group-focus-within:shadow-md transition-all duration-300" />
          <input
            type="text"
            placeholder="搜索关键词、标签..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="relative w-full pl-10 pr-4 py-3 bg-transparent border border-white/50 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-200 transition-all z-10"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors z-20"
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

        {/* Filter Chips - Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <FilterChip
            active={filterStarred}
            onClick={() => setFilterStarred(!filterStarred)}
            icon="⭐"
            label="收藏"
            activeClass="bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm"
          />
          <FilterChip
            active={filterArchived}
            onClick={() => setFilterArchived(!filterArchived)}
            icon="📦"
            label="归档"
            activeClass="bg-purple-50 text-purple-700 border-purple-200 shadow-sm"
          />

          <div className="w-px h-6 bg-slate-200/60 mx-1 self-center" />

          <FilterChip
            active={false}
            onClick={handleDedup}
            disabled={!canDedup}
            icon="🧩"
            label="智能去重"
            disabledClass="opacity-50 cursor-not-allowed"
          />
          <FilterChip
            active={false}
            onClick={handleBatchAnalyze}
            icon="🚀"
            label="批量分析"
          />
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50/90 backdrop-blur-sm border border-red-100 rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
          <span className="text-red-700 text-xs font-medium">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 no-scrollbar">
        {dedupSuggestions.length > 0 && (
          <div className="animate-fade-in-up">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              建议合并
            </h3>
            <DedupResultView
              groups={dedupSuggestions}
              onConfirm={handleConfirmGroup}
              onSkip={handleSkipGroup}
            />
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-2 animate-fade-in-up delay-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              需求分组
            </h3>
            {groups.map((group) => (
              <DemandGroupCard
                key={group.id}
                group={group}
                onOpen={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-slate-100 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        )}

        {!isLoading && demands.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-60 shadow-inner">
              {searchQuery ? "🔍" : "📭"}
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {searchQuery ? "未找到匹配项" : "需求库为空"}
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px]">
              {searchQuery
                ? "尝试调整搜索关键词"
                : filterStarred
                  ? "暂无收藏项"
                  : filterArchived
                    ? "暂无归档项"
                    : "开始分析页面以捕捉新机会"}
            </p>
          </div>
        )}

        {!isLoading && demands.length > 0 && (
          <div className="space-y-3">
            {groups.length === 0 && dedupSuggestions.length === 0 && (
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                全部洞察
              </h3>
            )}
            {demands.map((demand, idx) => (
              <div
                key={demand.id}
                className={`animate-fade-in-up delay-${Math.min(idx * 50, 300)}`}
              >
                <DemandListItem
                  demand={demand}
                  onClick={() => selectDemand(demand.id)}
                  onToggleStar={() => toggleStar(demand.id)}
                  onDelete={async () => {
                    const isConfirmed = await confirm({
                        title: "删除洞察",
                        message: "确定删除这个产品方向？",
                        confirmText: "删除",
                        isDestructive: true
                    });
                    if (isConfirmed) {
                      deleteDemand(demand.id);
                      toast.success("已删除");
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Spacer for bottom nav */}
        <div className="h-12" />
      </div>

      {/* 底部统计 */}
      {!isLoading && demands.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 py-2 glass border-t border-white/60 text-[10px] font-medium text-slate-400 text-center uppercase tracking-wider pointers-events-none z-10">
          {demands.length} 个条目
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
  activeClass,
  disabled,
  disabledClass,
}: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
        ${
          active
            ? activeClass
            : "bg-white/60 border-white/60 text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm"
        }
        ${disabled ? `opacity-50 cursor-not-allowed ${disabledClass}` : ""}
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
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
      className="group relative glass-card p-3.5 cursor-pointer hover:border-brand-100 dark:hover:border-brand-900"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="font-bold text-sm text-slate-800 truncate group-hover:text-brand-600 transition-colors">
              {demand.solution.title}
            </h4>
            {demand.archived && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wide">
                已归档
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {demand.solution.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {demand.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 bg-brand-50/50 text-brand-600 rounded-md border border-brand-100/50"
              >
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-slate-400/80 flex items-center gap-1 ml-auto font-medium">
              {formatRelativeTime(demand.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              demand.starred
                ? "text-yellow-500 bg-yellow-50 opacity-100 shadow-sm"
                : "text-slate-300 hover:text-yellow-500 hover:bg-yellow-50"
            }`}
            style={{ opacity: demand.starred ? 1 : undefined }}
            title={demand.starred ? "取消收藏" : "收藏"}
          >
            <svg
              className="w-4 h-4"
              fill={demand.starred ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="删除"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
