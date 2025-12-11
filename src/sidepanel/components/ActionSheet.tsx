/**
 * 操作选择对话框组件
 * 用于展示多个操作选项供用户选择
 */

import React, { useEffect, useState } from "react";

export interface ActionOption {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  isDestructive?: boolean;
}

interface ActionSheetProps {
  isOpen: boolean;
  title: string;
  options: ActionOption[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}

export function ActionSheet({
  isOpen,
  title,
  options,
  onSelect,
  onCancel,
}: ActionSheetProps) {
  const [visible, setVisible] = useState(false);
  const [render, setRender] = useState(false);

  // Handle animation timing
  useEffect(() => {
    if (isOpen) {
      setRender(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* 对话框内容 */}
      <div
        className={`relative w-full max-w-sm transform transition-all duration-300 ease-out ${
          visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* 主菜单 */}
          <div className="overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-floating ring-1 ring-black/5">
            {/* 标题栏 */}
            {title && (
              <div className="border-b border-slate-200/50 px-4 py-3 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                  {title}
                </h3>
              </div>
            )}

            {/* 选项列表 */}
            <div className="divide-y divide-slate-100/50">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSelect(option.id)}
                  className={`group relative w-full px-4 py-3.5 text-left transition-colors duration-200 hover:bg-white/80 active:bg-slate-50 outline-none focus-visible:bg-slate-50 ${
                    option.isDestructive ? "hover:bg-red-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* 图标容器 */}
                    {option.icon && (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                          option.isDestructive
                            ? "bg-red-50 text-red-500 group-hover:bg-red-100"
                            : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
                        }`}
                      >
                        <span className="text-lg">{option.icon}</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[15px] font-semibold tracking-tight truncate ${
                          option.isDestructive ? "text-red-600" : "text-slate-700"
                        }`}
                      >
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="mt-0.5 text-xs text-slate-400 font-medium truncate">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {/* 选中指示箭头 (Optional aesthetic touch) */}
                    <div className="text-slate-300 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 取消按钮 */}
          <button
            onClick={onCancel}
            className="w-full rounded-3xl bg-white shadow-floating px-4 py-3.5 text-[15px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 ring-1 ring-black/5"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
