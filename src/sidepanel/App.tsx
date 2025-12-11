/**
 * Side Panel 主应用组件
 */

import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import {
  AnalysisView,
  BatchAnalyzePanel,
  ConfirmProvider,
  DemandList,
  SettingsView,
  TaskIndicator,
} from "./components";
import { useAnalysisStore, useConfigStore } from "./stores";
import { MessageType, type PageInfoPayload } from "@/shared/types/messages";
import type { AnalysisTask } from "@/shared/types/analysis-task";

type ViewType = "analysis" | "library" | "settings";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("analysis");
  const {
    setCurrentPage,
    updateTaskStatus,
    setTaskResult,
    setTaskError,
    upsertTask,
    pendingCount,
    fetchPendingCount,
    batchStatus,
    batchProgress,
    setBatchStatus,
    setBatchProgress,
    tasks,
    activeTaskId,
  } = useAnalysisStore();
  const { fetchConfig, isConfigured } = useConfigStore();

  // Check for conflicts with AnalysisView's Save button
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const isAnalysisCompleted = 
    currentView === "analysis" && 
    activeTask?.status === "completed" && 
    (activeTask.result?.demands?.length ?? 0) > 0;

  // 初始化
  useEffect(() => {
    fetchConfig();
    fetchPendingCount();
    getCurrentPageInfo();

    const handleMessage = (message: { type: string; payload?: unknown }) => {
      console.log("[Side Panel] Received message:", message.type);

      switch (message.type) {
        case MessageType.BATCH_ANALYZE_PROGRESS:
          setBatchProgress(message.payload as any);
          break;
        case MessageType.BATCH_ANALYZE_COMPLETE:
          setBatchStatus("idle");
          setBatchProgress(null);
          fetchPendingCount();
          break;
        case MessageType.QUICK_SAVE_COMPLETE:
          fetchPendingCount();
          break;
        case MessageType.PAGE_INFO_UPDATED:
          setCurrentPage(message.payload as PageInfoPayload);
          break;
        case MessageType.TASK_CREATED: {
          const task = parseTask(message.payload as AnalysisTask);
          upsertTask(task);
          break;
        }
        case MessageType.TASK_STATUS_UPDATED: {
          const payload = message.payload as {
            taskId: string;
            status: AnalysisTask["status"];
            progress?: number;
          };
          updateTaskStatus(payload.taskId, payload.status, {
            progress: payload.progress,
          });
          break;
        }
        case MessageType.TASK_COMPLETED: {
          const payload = message.payload as { taskId: string; result: any };
          setTaskResult(payload.taskId, payload.result);
          break;
        }
        case MessageType.TASK_ERROR: {
          const payload = message.payload as { taskId: string; error: any };
          setTaskError(payload.taskId, payload.error);
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      getCurrentPageInfo();
    };

    const handleTabUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (changeInfo.url || changeInfo.status === "complete") {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          ([activeTab]) => {
            if (activeTab?.id === tabId) {
              getCurrentPageInfo();
            }
          }
        );
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, []);

  const detectPlatform = (
    url: string
  ): "reddit" | "zhihu" | "twitter" | "generic" | "unsupported" => {
    if (url.includes("reddit.com")) return "reddit";
    if (url.includes("zhihu.com")) return "zhihu";
    if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return "generic";
    }
    return "unsupported";
  };

  const getCurrentPageInfo = async (retryCount = 0) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id || !tab.url) {
        setFallbackPageInfo();
        return;
      }

      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("edge://")
      ) {
        setFallbackPageInfo(tab.url, tab.title);
        return;
      }

      const platform = detectPlatform(tab.url);
      const isSupportedSite =
        platform === "reddit" || platform === "zhihu" || platform === "twitter";

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.GET_CURRENT_PAGE_INFO,
        });

        if (response?.success) {
          setCurrentPage(response.data);
        } else {
          setFallbackPageInfo(tab.url, tab.title, platform);
        }
      } catch (messageError: any) {
        // Content Script 不存在或未加载
        const isConnectionError = messageError?.message?.includes(
          "Receiving end does not exist"
        );

        if (isConnectionError && isSupportedSite && retryCount < 3) {
          setTimeout(() => getCurrentPageInfo(retryCount + 1), 500);
          return;
        }

        setFallbackPageInfo(tab.url, tab.title, platform);
      }
    } catch (error) {
      console.error("[Side Panel] Failed to get page info:", error);
      setFallbackPageInfo();
    }
  };

  const setFallbackPageInfo = (
    url?: string,
    title?: string,
    platform?: "reddit" | "zhihu" | "twitter" | "generic" | "unsupported"
  ) => {
    const detectedPlatform = url ? detectPlatform(url) : "unsupported";
    const finalPlatform = platform ?? detectedPlatform;
    const isSupportedSite =
      finalPlatform === "reddit" ||
      finalPlatform === "zhihu" ||
      finalPlatform === "twitter";

    setCurrentPage({
      url: url || "",
      title: title || "未知页面",
      platform: finalPlatform,
      canAnalyze: isSupportedSite,
      needsAuthorization: finalPlatform === "generic",
    });
  };

  const handleStartBatchAnalyze = () => {
    setBatchStatus("running");
    chrome.runtime.sendMessage({
      type: MessageType.BATCH_ANALYZE_START,
    });
  };

  return (
    <ConfirmProvider>
      <div className="w-full h-screen flex flex-col bg-surface-50 relative text-slate-900 font-sans selection:bg-brand-100/50 overflow-hidden">
        <Toaster
          position="top-center"
          toastOptions={{
            className: "glass-card !border-brand-100/50 !text-slate-700",
            style: {
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "white",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "white",
              },
            },
          }}
        />
        {/* Background Decor */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[30%] bg-brand-200/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-100/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="px-5 py-3 glass sticky top-0 z-30 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform duration-300">
            <span className="text-lg animate-pulse-slow">📡</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900 tracking-tight leading-none">
              Demand Radar
            </h1>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-wide">
              INTELLIGENCE AGENT
            </p>
          </div>
        </div>

        {/* API Key Warning */}
        {!isConfigured && currentView !== "settings" && (
          <button
            onClick={() => setCurrentView("settings")}
            className="group flex items-center gap-1.5 pl-1.5 pr-3 py-1 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 text-amber-700 rounded-full hover:bg-amber-100 transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold animate-pulse shadow-sm">
              !
            </div>
            <span className="text-xs font-semibold">配置 Key</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative z-10 flex flex-col">
        <TaskIndicator />
        <div className="flex-1 overflow-hidden relative">
          {currentView === "analysis" && <AnalysisView />}
          {currentView === "library" && <DemandList />}
          {currentView === "settings" && <SettingsView />}
        </div>
        
        {/* Batch Action Floating Island - Hide if Analysis View has a sticky button */}
        {!isAnalysisCompleted && (
          <BatchAnalyzePanel 
            pendingCount={pendingCount} 
            status={batchStatus}
            progress={batchProgress}
            onStart={handleStartBatchAnalyze} 
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass border-t border-white/60 pb-safe pt-2 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-around items-end px-4">
          <NavButton
            active={currentView === "analysis"}
            onClick={() => setCurrentView("analysis")}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            }
            label="分析"
          />
          <NavButton
            active={currentView === "library"}
            onClick={() => setCurrentView("library")}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            label="需求库"
          />
          <NavButton
            active={currentView === "settings"}
            onClick={() => setCurrentView("settings")}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            label="设置"
          />
        </div>
      </nav>
      </div>
    </ConfirmProvider>
  );
}

function parseTask(task: AnalysisTask): AnalysisTask {
  return {
    ...task,
    createdAt: new Date(task.createdAt),
    startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
  };
}

/**
 * 导航按钮组件
 */
interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex-1 flex flex-col items-center py-2 transition-all duration-300
        ${active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"}
      `}
    >
      {/* Background Glow for Active State */}
      {active && (
        <div className="absolute inset-0 bg-brand-50/50 rounded-xl blur-md -z-10 animate-fade-in" />
      )}

      <div
        className={`transition-all duration-300 ${active ? "-translate-y-1 scale-110 drop-shadow-sm" : "group-hover:-translate-y-0.5"}`}
      >
        {icon}
      </div>
      <span
        className={`text-[10px] font-medium mt-1 transition-all duration-300 ${active ? "opacity-100 font-bold translate-y-[-2px]" : "opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"}`}
      >
        {label}
      </span>

      {/* Active Indicator Dot - improved */}
      {active && (
        <div className="absolute top-1.5 right-[calc(50%-12px)] w-1.5 h-1.5 bg-brand-500 rounded-full animate-scale-in shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      )}
    </button>
  );
}
