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
  const { setPageInfo } = useAnalysisStore();
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
          setPageInfo(message.payload as PageInfoPayload);
          break;

        case MessageType.ANALYSIS_STARTED:
          useAnalysisStore.getState().startAnalysis();
          break;

        case MessageType.ANALYSIS_COMPLETE:
          useAnalysisStore.getState().setAnalysisResult(message.payload as any);
          break;

        case MessageType.ANALYSIS_ERROR:
          const error = message.payload as { message: string; action?: string };
          useAnalysisStore.getState().setError(error.message, error.action);
          break;
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
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
          if (activeTab?.id === tabId) {
            console.log("[Side Panel] Active tab updated:", changeInfo);
            getCurrentPageInfo();
          }
        });
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
  ): "reddit" | "zhihu" | "generic" | "unsupported" => {
    if (url.includes("reddit.com")) return "reddit";
    if (url.includes("zhihu.com")) return "zhihu";
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
      const isSupportedSite = platform === "reddit" || platform === "zhihu";

      // 尝试与 Content Script 通信
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.GET_CURRENT_PAGE_INFO,
        });

        if (response?.success) {
          setPageInfo(response.data);
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
    platform?: "reddit" | "zhihu" | "generic" | "unsupported"
  ) => {
    const detectedPlatform = url ? detectPlatform(url) : "unsupported";
    const finalPlatform = platform ?? detectedPlatform;
    const isSupportedSite =
      finalPlatform === "reddit" || finalPlatform === "zhihu";

    setPageInfo({
      url: url || "",
      title: title || "未知页面",
      platform: finalPlatform,
      // 支持的网站即使 Content Script 暂时不可用，也标记为可分析
      canAnalyze: isSupportedSite,
      needsAuthorization: finalPlatform === "generic",
    });
  };

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* 头部 */}
      <header className="px-4 py-3 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <h1 className="font-semibold text-gray-900">Demand Radar</h1>
        </div>
        {!isConfigured && currentView !== "settings" && (
          <button
            onClick={() => setCurrentView("settings")}
            className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full animate-pulse"
          >
            配置 API Key
          </button>
        )}
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        {currentView === "analysis" && <AnalysisView />}
        {currentView === "library" && <DemandList />}
        {currentView === "settings" && <SettingsView />}
      </main>

      {/* 底部导航 */}
      <nav className="border-t bg-white">
        <div className="flex">
          <NavButton
            active={currentView === "analysis"}
            onClick={() => setCurrentView("analysis")}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
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
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
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
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
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
      className={`flex-1 flex flex-col items-center py-2 transition-colors ${
        active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      <span className="text-xs mt-0.5">{label}</span>
    </button>
  );
}
