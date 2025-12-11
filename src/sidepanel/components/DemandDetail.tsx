/**
 * 需求详情组件
 * 显示单个产品方向的完整信息
 */

import React, { useState } from "react";
import toast from "react-hot-toast";
import { useDemandsStore } from "../stores";
import { useConfirm } from "./ConfirmProvider";
import { formatRelativeTime } from "@/shared/utils/text-utils";

export function DemandDetail() {
  const {
    selectedDemand,
    selectDemand,
    toggleStar,
    toggleArchive,
    updateNotes,
    addTag,
    removeTag,
    deleteDemand,
  } = useDemandsStore();
  const { confirm } = useConfirm();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(selectedDemand?.notes || "");
  const [newTag, setNewTag] = useState("");

  if (!selectedDemand) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        选择一个洞察查看详情。
      </div>
    );
  }

  const demand = selectedDemand;

  const handleSaveNotes = async () => {
    await updateNotes(demand.id, notesValue);
    setIsEditingNotes(false);
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      await addTag(demand.id, newTag.trim());
      setNewTag("");
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "删除洞察",
      message: "确定要删除这个洞察吗？此操作不可恢复。",
      confirmText: "删除",
      isDestructive: true,
    });
    
    if (isConfirmed) {
      await deleteDemand(demand.id);
      selectDemand(null);
      toast.success("已删除");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Gradient Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-10" />

      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-100 bg-white shadow-sm z-10">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => selectDemand(null)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="font-semibold text-gray-900 flex-1 truncate text-lg">
            {demand.solution.title}
          </h2>
        </div>
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleStar(demand.id)}
            className={`
              flex-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border
              ${demand.starred
                ? "bg-yellow-50 border-yellow-200 text-yellow-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }
            `}
          >
            <span className="mr-1">{demand.starred ? "⭐" : "☆"}</span> {demand.starred ? "已收藏" : "收藏"}
          </button>
          <button
            onClick={() => toggleArchive(demand.id)}
            className={`
              flex-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border
              ${demand.archived
                ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }
            `}
          >
            <span className="mr-1">{demand.archived ? "📦" : "📥"}</span> {demand.archived ? "已归档" : "归档"}
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg font-medium border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 transition-colors"
          >
            <span className="mr-1">🗑️</span> 删除
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Solution Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-lg leading-none">💡</span> 解决方案
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">描述</div>
              <p className="text-sm text-gray-700 leading-relaxed">{demand.solution.description}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">目标用户</div>
              <p className="text-sm text-gray-700 leading-relaxed">{demand.solution.targetUser}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">核心差异点</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {demand.solution.keyDifferentiators.map((diff, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100"
                  >
                    {diff}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Validation Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-lg leading-none">📊</span> 验证依据
          </h3>
          <div className="space-y-4">
            {/* Pain Points */}
            {demand.validation.painPoints.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">用户痛点</div>
                <ul className="space-y-1">
                  {demand.validation.painPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                      <span className="text-red-400 mt-1 text-[6px]">●</span>
                      <span className="flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitors */}
            {demand.validation.competitors.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">竞品</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {demand.validation.competitors.map((comp, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-gray-50 text-gray-700 rounded border border-gray-100"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Competitor Gaps */}
            {demand.validation.competitorGaps.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">市场空白</div>
                <ul className="space-y-1">
                  {demand.validation.competitorGaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                      <span className="text-orange-400 mt-1 text-[6px]">●</span>
                      <span className="flex-1">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quotes */}
            {demand.validation.quotes.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">用户原声</div>
                <div className="grid gap-2 pt-1">
                  {demand.validation.quotes.map((quote, i) => (
                    <div key={i} className="relative bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <span className="absolute top-2 left-2 text-blue-200 text-2xl leading-none font-serif">“</span>
                      <p className="text-xs text-gray-600 italic leading-relaxed pl-4 relative z-10">
                        {quote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tags Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-lg leading-none">🏷️</span> 标签
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {demand.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-md border border-blue-200"
              >
                {tag}
                <button
                  onClick={() => removeTag(demand.id, tag)}
                  className="text-blue-500 hover:text-blue-700 ml-0.5"
                  title="Remove tag"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="添加新标签..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="flex-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gray-900/10 transition-all active:transform active:scale-[0.98]"
            >
              添加
            </button>
          </div>
        </section>

        {/* Notes Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-lg leading-none">📝</span> 笔记
          </h3>
          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="在此添加您的个人笔记..."
                className="w-full h-28 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setNotesValue(demand.notes);
                    setIsEditingNotes(false);
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 shadow-md shadow-gray-900/10 transition-all active:transform active:scale-[0.98]"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              className="text-sm p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 min-h-[60px] text-gray-700 leading-relaxed"
            >
              {demand.notes || (
                <span className="text-gray-400 italic">点击添加笔记...</span>
              )}
            </div>
          )}
        </section>

        {/* Source Info Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-lg leading-none">🔗</span> 来源信息
          </h3>
          <div className="text-sm space-y-2">
            <div className="truncate flex items-start">
              <span className="text-gray-500 mr-2 flex-shrink-0">页面：</span>
              <a
                href={demand.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex-1 break-all"
              >
                {demand.sourceTitle || demand.sourceUrl}
              </a>
            </div>
            <div className="flex">
              <span className="text-gray-500 mr-2 flex-shrink-0">平台：</span>
              <span className="text-gray-700 flex-1">{demand.sourcePlatform}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 mr-2 flex-shrink-0">创建时间：</span>
              <span className="text-gray-700 flex-1">{formatRelativeTime(demand.createdAt)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
