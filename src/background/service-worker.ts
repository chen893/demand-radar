// Background Service Worker for Demand Radar
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.reddit.com/*", "https://*.zhihu.com/*"]
}

console.log("Demand Radar background service worker loaded");
