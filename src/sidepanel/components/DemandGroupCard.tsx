import React from "react";
import type { DemandGroup } from "@/shared/types/demand-group";

interface DemandGroupCardProps {
  group: DemandGroup;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DemandGroupCard({
  group,
  onOpen,
  onDelete,
}: DemandGroupCardProps) {
  return (
    <div className="relative group/card">
      {/* Visual Stack Effect */}
      <div className="absolute top-1 left-2 right-2 h-full bg-white/40 border border-slate-200/50 rounded-xl transform translate-y-1 -z-10 transition-transform group-hover/card:translate-y-2 group-hover/card:scale-[0.98]" />
      <div className="absolute top-2 left-4 right-4 h-full bg-white/20 border border-slate-200/30 rounded-xl transform translate-y-2 -z-20 transition-transform group-hover/card:translate-y-3 group-hover/card:scale-[0.96]" />

      <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm">
              <span className="text-sm">📚</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                {group.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                包含 {group.demandIds.length} 个相关需求
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => onOpen?.(group.id)}
              title="查看详情"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => onDelete?.(group.id)}
              title="解除分组"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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

        {group.commonPainPoints?.length ? (
          <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              共通痛点
            </div>
            <ul className="space-y-1.5">
              {group.commonPainPoints.slice(0, 3).map((p, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-600 flex items-start gap-2"
                >
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span className="leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
