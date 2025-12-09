/**
 * Service Worker 入口
 * Chrome Extension MV3 后台服务
 */

import { messageHandler } from "./message-handler";
import { configRepo } from "@/storage";
import { llmService } from "./llm";
import type { Message } from "@/shared/types/messages";

/**
 * 扩展安装/更新处理
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Background] Extension installed/updated:", details.reason);

  if (details.reason === "install") {
    // 首次安装：打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL("options.html?welcome=true"),
    });

    // 标记首次启动未完成（等待用户配置）
    await configRepo.setFirstLaunchCompleted(false);
  } else if (details.reason === "update") {
    // 版本更新：检查是否需要迁移数据
    console.log(
      "[Background] Updated from version:",
      details.previousVersion
    );
  }
});

/**
 * 扩展启动处理
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("[Background] Extension started");

  // 从存储加载 LLM 配置
  const llmConfig = await configRepo.getLLMConfig();
  if (llmConfig) {
    llmService.setConfig(llmConfig);
  }
});

/**
 * 消息监听器
 * 处理来自 Content Script、Side Panel、Options Page 的消息
 */
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    // 异步处理消息
    messageHandler
      .handleMessage(message, sender)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error("[Background] Message handler error:", error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    // 返回 true 表示异步响应
    return true;
  }
);

/**
 * 扩展图标点击处理
 * 打开 Side Panel
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // 尝试打开 Side Panel
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error("[Background] Failed to open side panel:", error);
    // 降级：打开独立窗口
    chrome.windows.create({
      url: chrome.runtime.getURL("sidepanel.html"),
      type: "popup",
      width: 400,
      height: 600,
    });
  }
});

/**
 * 设置 Side Panel 行为
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => {
    console.error("[Background] Failed to set panel behavior:", error);
  });

/**
 * 标签页更新监听
 * 当用户切换标签页时，通知 Side Panel 更新页面信息
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      // 尝试获取页面信息
      chrome.tabs.sendMessage(
        activeInfo.tabId,
        { type: "GET_CURRENT_PAGE_INFO" },
        (response) => {
          if (chrome.runtime.lastError) {
            // Content Script 未加载，忽略
            return;
          }
          if (response?.success) {
            // 转发给 Side Panel
            chrome.runtime.sendMessage({
              type: "PAGE_INFO_UPDATED",
              payload: response.data,
            }).catch(() => {
              // Side Panel 未打开，忽略
            });
          }
        }
      );
    }
  } catch (error) {
    // 标签页不存在或其他错误，忽略
  }
});

/**
 * 标签页更新监听（URL 变化）
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只处理 URL 变化且页面加载完成的情况
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  // 检查是否为当前激活的标签页
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTab?.id !== tabId) {
    return;
  }

  // 尝试获取页面信息
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { type: "GET_CURRENT_PAGE_INFO" }, (response) => {
      if (chrome.runtime.lastError) {
        return;
      }
      if (response?.success) {
        chrome.runtime.sendMessage({
          type: "PAGE_INFO_UPDATED",
          payload: response.data,
        }).catch(() => {});
      }
    });
  }, 500); // 延迟 500ms 等待 Content Script 加载
});

/**
 * 长连接监听（用于 Side Panel 保活）
 */
chrome.runtime.onConnect.addListener((port) => {
  console.log("[Background] Port connected:", port.name);

  if (port.name === "sidepanel") {
    // Side Panel 连接
    port.onDisconnect.addListener(() => {
      console.log("[Background] Side Panel disconnected");
    });

    port.onMessage.addListener(async (message) => {
      const response = await messageHandler.handleMessage(message, port.sender!);
      port.postMessage(response);
    });
  }
});

/**
 * 定期任务（每小时执行）
 * 用于清理过期数据、上报分析等
 */
chrome.alarms.create("periodic-tasks", { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "periodic-tasks") {
    console.log("[Background] Running periodic tasks");

    // 检查存储使用情况
    const { capacityManager } = await import("@/storage");
    const usage = await capacityManager.getUsage();

    if (usage.percentage >= 0.9) {
      // 存储使用超过 90%，发送通知
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon128.png"),
        title: "Demand Radar",
        message: "存储空间即将用尽，请及时清理或导出数据。",
      });
    }
  }
});

// 初始化日志
console.log("[Demand Radar] Background service worker initialized");

// 导出（用于 Plasmo）
export {};
