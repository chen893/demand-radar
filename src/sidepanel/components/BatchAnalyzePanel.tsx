import React from "react";

interface BatchAnalyzePanelProps {
  pendingCount?: number;
  status?: "idle" | "running";
  progress?: {
    total: number;
    completed: number;
    failed: number;
  } | null;
  onStart?: () => void;
  onClear?: () => void;
}

export function BatchAnalyzePanel({
  pendingCount = 0,
  status = "idle",
  progress,
  onStart,
}: BatchAnalyzePanelProps) {
  // Empty State
  if (pendingCount === 0 && status === "idle") {
    return (
      <div className="absolute bottom-4 left-4 right-4 z-40 animate-slide-up">
        <div className="glass-card !bg-slate-100/80 !border-slate-200/50 p-2 pl-4 pr-4 rounded-full flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3 opacity-50">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-white text-xs font-bold">
              0
            </div>
            <span className="text-sm font-medium text-slate-500">
              暂无待处理项
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Processing State
  if (status === "running") {
    const total = progress?.total || 0;
    const completed = (progress?.completed || 0) + (progress?.failed || 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="absolute bottom-4 left-4 right-4 z-40 animate-slide-up">
        <div className="glass-card !bg-slate-900/95 !border-slate-700/50 p-3 rounded-2xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
           {/* Progress Bar Background */}
           <div 
             className="absolute bottom-0 left-0 h-1 bg-brand-500 transition-all duration-300"
             style={{ width: `${percentage}%` }}
           />
           
           <div className="flex items-center justify-between mb-1">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
               <span className="text-xs font-bold text-slate-200">
                 正在批量分析...
               </span>
             </div>
             <span className="text-xs font-mono text-slate-400">
               {completed}/{total}
             </span>
           </div>
           
           <div className="text-[10px] text-slate-500 pl-4">
              请勿关闭侧边栏
           </div>
        </div>
      </div>
    );
  }

  // Ready State
  return (
    <div className="absolute bottom-4 left-4 right-4 z-40 animate-slide-up">
      <div className="glass-card !bg-slate-900/90 !border-slate-700/50 p-2 pl-4 pr-2 rounded-full shadow-2xl flex items-center justify-between backdrop-blur-xl group hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold animate-pulse-slow">
            {pendingCount}
          </div>
          <span className="text-sm font-medium text-slate-200">
            待分析内容
          </span>
        </div>

        <button
          onClick={onStart}
          className="px-4 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-brand-50 hover:text-brand-600 transition-all shadow-sm active:scale-95 flex items-center gap-1"
        >
          <span>🚀</span>
          立即分析
        </button>
      </div>
    </div>
  );
}