/**
 * 需求卡片组件
 * 用于在分析结果和需求列表中展示单个产品方向
 */

import React, { useState } from "react";

interface DemandCardProps {
  demand: {
    id: string;
    solution: {
      title: string;
      description: string;
      targetUser: string;
      keyDifferentiators: string[];
    };
    validation: {
      painPoints: string[];
      competitors: string[];
      competitorGaps: string[];
      quotes: string[];
    };
  };
  selected?: boolean;
  onToggle?: () => void;
  showCheckbox?: boolean;
  onClick?: () => void;
}

export function DemandCard({
  demand,
  selected,
  onToggle,
  showCheckbox = true,
  onClick,
}: DemandCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
      {/* 头部 */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {showCheckbox && onToggle && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="flex-1 cursor-pointer" onClick={handleClick}>
            <h4 className="font-medium text-gray-900 text-sm">
              {demand.solution.title}
            </h4>
            {/* 差异点预览 */}
            <div className="mt-1 flex flex-wrap gap-1">
              {demand.solution.keyDifferentiators.slice(0, 3).map((diff, i) => (
                <span
                  key={i}
                  className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded"
                >
                  {diff}
                </span>
              ))}
              {demand.solution.keyDifferentiators.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{demand.solution.keyDifferentiators.length - 3}
                </span>
              )}
            </div>
            {/* 竞品信息 */}
            {demand.validation.competitors.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                vs {demand.validation.competitors.slice(0, 3).join(", ")}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3">
          {/* 描述 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">描述</div>
            <p className="text-sm text-gray-700">{demand.solution.description}</p>
          </div>

          {/* 目标用户 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">目标用户</div>
            <p className="text-sm text-gray-700">{demand.solution.targetUser}</p>
          </div>

          {/* 用户痛点 */}
          {demand.validation.painPoints.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">用户痛点</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {demand.validation.painPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-400">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 竞品不足 */}
          {demand.validation.competitorGaps.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">竞品不足</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {demand.validation.competitorGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-orange-400">•</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 原文证据 */}
          {demand.validation.quotes.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">原文证据</div>
              <div className="space-y-1">
                {demand.validation.quotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-2"
                  >
                    "{quote}"
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* 核心差异点（完整） */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">核心差异点</div>
            <div className="flex flex-wrap gap-1">
              {demand.solution.keyDifferentiators.map((diff, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded"
                >
                  {diff}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
