/**
 * 需求详情组件
 * 显示单个产品方向的完整信息
 */

import React, { useState } from "react";
import { useDemandsStore } from "../stores";
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

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(selectedDemand?.notes || "");
  const [newTag, setNewTag] = useState("");

  if (!selectedDemand) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        选择一个产品方向查看详情
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
    if (confirm("确定删除这个产品方向？此操作不可恢复。")) {
      await deleteDemand(demand.id);
      selectDemand(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => selectDemand(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="font-medium text-gray-900 flex-1 truncate">
            {demand.solution.title}
          </h2>
        </div>
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleStar(demand.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              demand.starred
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {demand.starred ? "⭐ 已收藏" : "☆ 收藏"}
          </button>
          <button
            onClick={() => toggleArchive(demand.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              demand.archived
                ? "bg-gray-100 border-gray-300 text-gray-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {demand.archived ? "📦 已归档" : "📥 归档"}
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            🗑️ 删除
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 解决方案 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            💡 解决方案
          </h3>
          <div className="space-y-3 bg-blue-50 rounded-lg p-3">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">描述</div>
              <p className="text-sm text-gray-800">{demand.solution.description}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">目标用户</div>
              <p className="text-sm text-gray-800">{demand.solution.targetUser}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">核心差异点</div>
              <div className="flex flex-wrap gap-1">
                {demand.solution.keyDifferentiators.map((diff, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-white text-blue-700 rounded border border-blue-200"
                  >
                    {diff}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 验证依据 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            📊 验证依据
          </h3>
          <div className="space-y-3 bg-orange-50 rounded-lg p-3">
            {/* 用户痛点 */}
            {demand.validation.painPoints.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">用户痛点</div>
                <ul className="space-y-1">
                  {demand.validation.painPoints.map((point, i) => (
                    <li key={i} className="text-sm text-gray-800 flex items-start gap-1">
                      <span className="text-red-500">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 竞品 */}
            {demand.validation.competitors.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">竞品</div>
                <div className="flex flex-wrap gap-1">
                  {demand.validation.competitors.map((comp, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-white text-gray-700 rounded border border-gray-200"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 竞品不足 */}
            {demand.validation.competitorGaps.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">竞品不足</div>
                <ul className="space-y-1">
                  {demand.validation.competitorGaps.map((gap, i) => (
                    <li key={i} className="text-sm text-gray-800 flex items-start gap-1">
                      <span className="text-orange-500">•</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 原文证据 */}
            {demand.validation.quotes.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">原文证据</div>
                <div className="space-y-2">
                  {demand.validation.quotes.map((quote, i) => (
                    <blockquote
                      key={i}
                      className="text-sm text-gray-700 italic border-l-2 border-orange-300 pl-2 bg-white rounded p-2"
                    >
                      "{quote}"
                    </blockquote>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 标签 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            🏷️ 标签
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {demand.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => removeTag(demand.id, tag)}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="添加标签..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="flex-1 text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加
            </button>
          </div>
        </section>

        {/* 笔记 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            📝 笔记
          </h3>
          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="添加你的想法..."
                className="w-full h-24 text-sm p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setNotesValue(demand.notes);
                    setIsEditingNotes(false);
                  }}
                  className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              className="text-sm p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 min-h-[60px]"
            >
              {demand.notes || (
                <span className="text-gray-400">点击添加笔记...</span>
              )}
            </div>
          )}
        </section>

        {/* 来源信息 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            🔗 来源
          </h3>
          <div className="text-sm bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="truncate">
              <span className="text-gray-500">页面：</span>
              <a
                href={demand.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {demand.sourceTitle || demand.sourceUrl}
              </a>
            </div>
            <div>
              <span className="text-gray-500">平台：</span>
              <span className="text-gray-700">{demand.sourcePlatform}</span>
            </div>
            <div>
              <span className="text-gray-500">创建时间：</span>
              <span className="text-gray-700">
                {formatRelativeTime(demand.createdAt)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
