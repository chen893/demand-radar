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
        relative group rounded-xl transition-all duration-300 ease-in-out
        ${
          selected
            ? "glass border-brand-300 shadow-md ring-1 ring-brand-100/50"
            : "glass-card border-white/60 hover:border-brand-100"
        }
      `}
    >
      {/* 头部区域 */}
      <div className="p-4 cursor-pointer" onClick={handleClick}>
        <div className="flex items-start gap-3.5">
          {/* Checkbox */}
          {showCheckbox && onToggle && (
            <div
              className="mt-0.5 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onClick={onToggle}
                className={`
                  w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all duration-200 shadow-sm
                  ${
                    selected
                      ? "bg-brand-500 border-brand-500 text-white scale-105"
                      : "bg-white border-slate-300 hover:border-brand-400 text-transparent"
                  }
                `}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4
              className={`
              text-[15px] font-bold leading-snug tracking-tight mb-2
              ${selected ? "text-brand-900" : "text-slate-900 group-hover:text-brand-600 transition-colors"}
            `}
            >
              {demand.solution.title}
            </h4>

            {/* Tags (Differentiators) */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {demand.solution.keyDifferentiators.slice(0, 3).map((diff, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-100/50"
                >
                  {diff}
                </span>
              ))}
              {demand.solution.keyDifferentiators.length > 3 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  +{demand.solution.keyDifferentiators.length - 3}
                </span>
              )}
            </div>

            {/* Description Preview */}
            {!expanded && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                {demand.solution.description}
              </p>
            )}

            {/* Bottom Meta (Competitors) */}
            {demand.validation.competitors.length > 0 && !expanded && (
              <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="uppercase tracking-wider font-bold text-[9px] text-slate-300">
                  VS
                </span>
                <div className="flex flex-wrap gap-1">
                  {demand.validation.competitors.slice(0, 3).map((comp, i) => (
                    <span key={i} className="text-slate-500 font-medium">
                      {comp}
                      {i <
                        Math.min(demand.validation.competitors.length, 3) - 1 &&
                        ","}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expand Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
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

      {/* 展开详情区域 */}
      {expanded && (
        <div className="px-4 pb-5 pt-0 animate-fade-in">
          <div className="h-px w-full bg-slate-100 mb-4" />

          <div className="space-y-5">
            {/* Description */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                方案描述
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {demand.solution.description}
              </p>
            </div>

            {/* Target User */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                目标用户
              </div>
              <div className="flex items-start gap-2.5 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                <span className="text-lg leading-none">🎯</span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {demand.solution.targetUser}
                </p>
              </div>
            </div>

            {/* Grid Layout for Pain Points & Gaps */}
            <div className="grid grid-cols-1 gap-4">
              {/* Pain Points */}
              {demand.validation.painPoints.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-400"></span>
                    用户痛点
                  </div>
                  <ul className="space-y-2">
                    {demand.validation.painPoints.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed"
                      >
                        <span className="text-slate-300 mt-1.5 text-[6px]">
                          ●
                        </span>
                        <span className="flex-1">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Market Gaps */}
              {demand.validation.competitorGaps.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    市场空白
                  </div>
                  <ul className="space-y-2">
                    {demand.validation.competitorGaps.map((gap, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed"
                      >
                        <span className="text-slate-300 mt-1.5 text-[6px]">
                          ●
                        </span>
                        <span className="flex-1">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Voice of User */}
            {demand.validation.quotes.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  用户原声
                </div>
                <div className="grid gap-2">
                  {demand.validation.quotes.map((quote, i) => (
                    <div
                      key={i}
                      className="relative bg-brand-50/50 p-3 rounded-lg border border-brand-100/50"
                    >
                      <span className="absolute top-2 left-2 text-brand-200 text-2xl leading-none font-serif">
                        “
                      </span>
                      <p className="text-xs text-slate-600 italic leading-relaxed pl-4 relative z-10">
                        {quote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
