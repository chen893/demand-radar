import React from "react";
import type { DemandGroup } from "@/shared/types/demand-group";

interface DedupResultViewProps {
  groups: DemandGroup[];
  onConfirm?: (groupId: string) => void;
  onSkip?: (groupId: string) => void;
}

export function DedupResultView({
  groups,
  onConfirm,
  onSkip,
}: DedupResultViewProps) {
  if (!groups.length) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.id}
          className="relative bg-gradient-to-br from-blue-50/50 to-white border border-blue-100 rounded-xl p-4 shadow-sm overflow-hidden"
        >
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/30 rounded-bl-[60px] -z-10" />

          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                  建议合并
                </span>
                <h4 className="text-sm font-bold text-slate-800">
                  {group.name}
                </h4>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                检测到 {group.demandIds.length} 个相似需求可合并
              </p>
            </div>
          </div>

          {group.commonPainPoints?.length ? (
            <div className="mb-4 bg-white/60 rounded-lg p-3 border border-blue-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                整合分析
              </div>
              <ul className="space-y-1">
                {group.commonPainPoints.map((p, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-blue-500 font-bold">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95"
              onClick={() => onConfirm?.(group.id)}
            >
              确认合并
            </button>
            <button
              className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
              onClick={() => onSkip?.(group.id)}
            >
              忽略
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
