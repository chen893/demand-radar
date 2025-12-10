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
    <div
      className={`
        relative overflow-hidden rounded-2xl transition-all duration-300
        ${
          selected
            ? "bg-white shadow-[0_0_0_2px_rgba(59,130,246,0.5)] shadow-brand-end/20 scale-[1.02]"
            : "bg-white shadow-sm hover:shadow-md hover:scale-[1.01] hover:border-gray-200"
        }
        border border-gray-100
      `}
    >
      {/* Selection Indicator Background */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-r from-brand-start/5 to-brand-end/5 pointer-events-none" />
      )}

      {/* 头部 */}
      <div className="p-4 relative">
        <div className="flex items-start gap-3">
          {showCheckbox && onToggle && (
            <div className="mt-1">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                className="w-5 h-5 rounded-md border-gray-200 text-brand-end focus:ring-brand-end transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="flex-1 cursor-pointer group" onClick={handleClick}>
            <h4 className="font-montserrat font-bold text-gray-800 text-sm leading-snug group-hover:text-brand-end transition-colors">
              {demand.solution.title}
            </h4>

            {/* 差异点预览 */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {demand.solution.keyDifferentiators.slice(0, 3).map((diff, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium px-2 py-1 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-brand-end/5 group-hover:text-brand-end transition-colors"
                >
                  {diff}
                </span>
              ))}
              {demand.solution.keyDifferentiators.length > 3 && (
                <span className="text-[10px] px-1.5 py-1 text-gray-400 bg-gray-50 rounded-lg">
                  +{demand.solution.keyDifferentiators.length - 3}
                </span>
              )}
            </div>

            {/* 竞品信息 */}
            {demand.validation.competitors.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
                <span>VS</span>
                <div className="flex flex-wrap gap-1">
                  {demand.validation.competitors.slice(0, 3).map((comp, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 border border-gray-100 rounded text-gray-500 bg-white"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-gray-300 hover:text-brand-end hover:bg-brand-end/5 p-1.5 rounded-lg transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
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
        <div className="px-4 pb-4 pt-0 space-y-4 relative animation-slide-down">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-4" />

          {/* 描述 */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Description
            </div>
            <p className="text-sm text-gray-600 font-poppins leading-relaxed">
              {demand.solution.description}
            </p>
          </div>

          {/* 目标用户 */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Target User
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <p className="text-sm text-gray-600 font-poppins">
                {demand.solution.targetUser}
              </p>
            </div>
          </div>

          {/* 用户痛点 */}
          {demand.validation.painPoints.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Pain Points
              </div>
              <ul className="space-y-2">
                {demand.validation.painPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="text-status-error mt-1 text-[10px]">
                      ●
                    </span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 竞品不足 */}
          {demand.validation.competitorGaps.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Market Gaps
              </div>
              <ul className="space-y-2">
                {demand.validation.competitorGaps.map((gap, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="text-status-warning mt-1 text-[10px]">
                      ●
                    </span>
                    <span className="flex-1">{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 原文证据 */}
          {demand.validation.quotes.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Voice of User
              </div>
              <div className="space-y-2">
                {demand.validation.quotes.map((quote, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-brand-start text-xl leading-none">
                      "
                    </span>
                    <p className="text-xs text-gray-600 italic leading-relaxed">
                      {quote}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
