import type { Config } from "plasmo";

const config: Config = {
  watchPaths: ["./src/**"],
  devPort: 5173,
  manifest: {
    name: "Demand Radar",
    description: "AI-powered solution discovery from user pain points",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["activeTab", "storage", "scripting", "sidePanel"],
    host_permissions: [
      "https://*.reddit.com/*",
      "https://*.zhihu.com/*"
    ],
    optional_host_permissions: [
      "https://*/*",
      "http://*/*"
    ],
    side_panel: { default_path: "sidepanel" },
    // Use SVG icon - Plasmo will auto-convert to PNG
    icon: "src/assets/icon.svg"
  }
};

export default config;
