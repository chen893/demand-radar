import type { PlasmoCSConfig } from "plasmo";
import { adapterRegistry, type ExtractionResult } from "./content/adapters";
import { MessageType, type PageInfoPayload } from "@/shared/types/messages";

/**
 * Plasmo Content Script 配置
 */
export const config: PlasmoCSConfig = {
  matches: ["https://*.reddit.com/*", "https://*.zhihu.com/*"],
  run_at: "document_idle",
};

/**
 * 获取当前页面信息
 */
function getPageInfo(): PageInfoPayload {
  const url = window.location.href;
  const title = document.title;
  const platform = adapterRegistry.detectPlatform(url);

  return {
    url,
    title,
    platform,
    canAnalyze: true, // 所有平台都可以分析
    needsAuthorization: platform === "generic",
  };
}

/**
 * 提取页面内容
 */
async function extractContent(): Promise<ExtractionResult> {
  const url = window.location.href;
  const adapter = adapterRegistry.getAdapter(url);

  console.log(`[Content Script] Using adapter: ${adapter.getPlatformName()}`);

  return adapter.extract();
}

/**
 * 消息监听器
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[Content Script] Received message:", message.type);

  switch (message.type) {
    case MessageType.GET_CURRENT_PAGE_INFO:
      sendResponse({
        success: true,
        data: getPageInfo(),
      });
      return true;

    case MessageType.EXTRACT_CONTENT:
      extractContent()
        .then((result) => {
          sendResponse({
            success: true,
            data: result,
          });
        })
        .catch((error) => {
          console.error("[Content Script] Extraction error:", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      // 返回 true 表示异步响应
      return true;

    default:
      return false;
  }
});

/**
 * 页面加载完成后通知 Background
 */
function notifyPageReady(): void {
  const pageInfo = getPageInfo();

  chrome.runtime
    .sendMessage({
      type: MessageType.PAGE_INFO_UPDATED,
      payload: pageInfo,
    })
    .catch((error) => {
      // 忽略连接错误（Side Panel 可能未打开）
      if (!error.message?.includes("Receiving end does not exist")) {
        console.error("[Content Script] Failed to notify page ready:", error);
      }
    });
}

// 初始化
console.log("[Demand Radar] Content script loaded");
notifyPageReady();

// 监听页面 URL 变化（SPA 支持）
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log("[Demand Radar] URL changed:", lastUrl);
    notifyPageReady();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
