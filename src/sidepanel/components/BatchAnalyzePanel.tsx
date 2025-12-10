import React from "react";

interface BatchAnalyzePanelProps {
  pendingCount?: number;
  onStart?: () => void;
  onClear?: () => void;
}

export function BatchAnalyzePanel({
  pendingCount = 0,
  onStart,
  onClear,
}: BatchAnalyzePanelProps) {
  return (
    <div className="glass-card p-4 rounded-xl space-y-3 group hover:border-brand-200 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
            {pendingCount}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm">批量队列</span>
            <span className="text-[10px] text-slate-500 font-medium">
              等待分析中
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 hover:bg-slate-100 rounded transition-colors"
              onClick={onClear}
            >
              清除
            </button>
          )}
          <button
            className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-600/20 hover:bg-brand-700 hover:shadow-brand-600/30 transition-all disabled:opacity-50 disabled:shadow-none"
            disabled={pendingCount === 0}
            onClick={onStart}
          >
            开始执行
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500/50 w-full animate-pulse-slow origin-left" />
        </div>
      )}
    </div>
  );
}
