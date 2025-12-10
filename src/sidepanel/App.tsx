/**
 * Side Panel 主应用组件
 */

import React, { useEffect, useState } from "react";
import { AnalysisView, DemandList, SettingsView } from "./components";
import { useAnalysisStore, useConfigStore } from "./stores";
import { MessageType, type PageInfoPayload } from "@/shared/types/messages";

type ViewType = "analysis" | "library" | "settings";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("analysis");
  const { setPageInfo, setCurrentPage } = useAnalysisStore();
  const { fetchConfig, isConfigured } = useConfigStore();

  // 初始化
  useEffect(() => {
    // 加载配置
    fetchConfig();

    // 获取当前页面信息
    getCurrentPageInfo();

    // 监听来自 Background 的消息
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      console.log("[Side Panel] Received message:", message.type);

      switch (message.type) {
        case MessageType.PAGE_INFO_UPDATED:
          setCurrentPage(message.payload as PageInfoPayload);
          break;

        case MessageType.TASK_STATUS_UPDATED: {
          const { taskId, status, data } = (message.payload || {}) as {
            taskId: string;
            status: any;
            data?: any;
          };
          useAnalysisStore.getState().updateTaskStatus(taskId, status, data);
          break;
        }
        case MessageType.TASK_COMPLETED: {
          const { taskId, result } = (message.payload || {}) as {
            taskId: string;
            result: any;
          };
          useAnalysisStore.getState().setTaskResult(taskId, result);
          break;
        }
        case MessageType.TASK_ERROR: {
          const { taskId, error } = (message.payload || {}) as {
            taskId: string;
            error: any;
          };
          useAnalysisStore.getState().setTaskError(taskId, error);
          break;
        }
        case MessageType.TASK_CANCELLED: {
          const { taskId } = (message.payload || {}) as { taskId: string };
          if (taskId) {
            useAnalysisStore.getState().cancelTask(taskId);
          }
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // 监听 Tab 切换事件
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      console.log("[Side Panel] Tab activated:", activeInfo.tabId);
      getCurrentPageInfo();
    };

    // 监听 Tab 更新事件（URL 变化）
    const handleTabUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      // 只在 URL 变化且是当前窗口的活动标签时更新
      if (changeInfo.url || changeInfo.status === "complete") {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          ([activeTab]) => {
            if (activeTab?.id === tabId) {
              console.log("[Side Panel] Active tab updated:", changeInfo);
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

  // 根据 URL 检测平台
  const detectPlatform = (
    url: string
  ): "reddit" | "zhihu" | "twitter" | "generic" | "unsupported" => {
    if (url.includes("reddit.com")) return "reddit";
    if (url.includes("zhihu.com")) return "zhihu";
    if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
    // 其他 http/https 网站视为 generic（可以尝试分析）
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return "generic";
    }
    return "unsupported";
  };

  // 获取当前页面信息
  const getCurrentPageInfo = async (retryCount = 0) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id || !tab.url) {
        console.log("[Side Panel] No active tab found");
        setFallbackPageInfo();
        return;
      }

      // 检查是否为特殊页面（chrome:// 等）
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("edge://")
      ) {
        console.log("[Side Panel] Special page detected:", tab.url);
        setFallbackPageInfo(tab.url, tab.title);
        return;
      }

      const platform = detectPlatform(tab.url);
      const isSupportedSite =
        platform === "reddit" || platform === "zhihu" || platform === "twitter";

      // 尝试与 Content Script 通信
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.GET_CURRENT_PAGE_INFO,
        });

        if (response?.success) {
          setCurrentPage(response.data);
        } else {
          console.log("[Side Panel] Invalid response from content script");
          setFallbackPageInfo(tab.url, tab.title, platform);
        }
      } catch (messageError: any) {
        // Content Script 不存在或未加载
        const isConnectionError = messageError?.message?.includes(
          "Receiving end does not exist"
        );

        if (isConnectionError && isSupportedSite && retryCount < 3) {
          // 对于支持的网站，重试几次（Content Script 可能还在加载）
          console.log(
            `[Side Panel] Retrying (${retryCount + 1}/3) for:`,
            tab.url
          );
          setTimeout(() => getCurrentPageInfo(retryCount + 1), 500);
          return;
        }

        console.log(
          "[Side Panel] Content script not available:",
          tab.url,
          messageError?.message
        );
        // 根据 URL 设置页面信息
        setFallbackPageInfo(tab.url, tab.title, platform);
      }
    } catch (error) {
      console.error("[Side Panel] Failed to get page info:", error);
      setFallbackPageInfo();
    }
  };

  // 设置回退页面信息
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
      // 支持的网站即使 Content Script 暂时不可用，也标记为可分析
      canAnalyze: isSupportedSite,
      needsAuthorization: finalPlatform === "generic",
    });
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50 relative text-gray-900 font-sans selection:bg-blue-100 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-60 pointer-events-none z-0" />
      <div className="absolute top-20 -left-20 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none z-0" />

      {/* Header */}
      <header className="px-5 py-4 w-full z-20 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white shadow-lg shadow-gray-900/10 border border-gray-700">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 16V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 8H12.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900 tracking-tight leading-none">
              Demand Radar
            </h1>
            <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase">
              Insight Explorer
            </span>
          </div>
        </div>

        {/* API Key Warning Badge */}
        {!isConfigured && currentView !== "settings" && (
          <button
            onClick={() => setCurrentView("settings")}
            className="group flex items-center gap-2 pl-2 pr-3 py-1.5 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 text-amber-700 rounded-full hover:bg-amber-100/80 hover:scale-105 transition-all cursor-pointer shadow-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold">配置 Key</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative z-0">
        <div className="h-full w-full">
          {currentView === "analysis" && <AnalysisView />}
          {currentView === "library" && <DemandList />}
          {currentView === "settings" && <SettingsView />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-4 left-4 right-4 z-20">
        <div className="glass-premium rounded-2xl p-1.5 flex justify-between items-center shadow-2xl shadow-gray-900/5 ring-1 ring-white/50">
          <NavButton
            active={currentView === "analysis"}
            onClick={() => setCurrentView("analysis")}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
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
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            label="库"
          />
          <NavButton
            active={currentView === "settings"}
            onClick={() => setCurrentView("settings")}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
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
  );
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
        relative group flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300
        ${active ? "text-blue-600 bg-blue-50/50 shadow-inner" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}
      `}
    >
      <div
        className={`transition-all duration-300 ${active ? "scale-110 -translate-y-0.5" : "group-hover:-translate-y-0.5"}`}
      >
        {icon}
      </div>
      <span
        className={`text-[10px] font-medium mt-0.5 transition-all duration-300 ${active ? "font-bold opacity-100" : "opacity-0 h-0 overflow-hidden group-hover:opacity-100 group-hover:h-auto"}`}
      >
        {label}
      </span>

      {/* Active Indicator Dot */}
      {active && (
        <span className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full animate-fade-in" />
      )}
    </button>
  );
}
