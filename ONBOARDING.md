# Demand Radar - 开发者快速上手指南

欢迎来到 Demand Radar 项目！本文档旨在帮助新成员快速熟悉项目结构、核心逻辑以及开发流程。

## 1. 项目概览

Demand Radar 是一个基于 Plasmo 框架开发的 Chrome 浏览器扩展。
**核心目标**：从 Reddit、知乎等社区讨论中提取用户痛点和产品需求，利用 LLM 进行智能分析，并本地化存储。

### 1.1 当前开发阶段与范围 (Current Development Status)

> **当前基准**: Phase 1 - MVP (最小可行性产品) | 基于 `docs/PRD.md` v1.2

本阶段专注于核心价值验证：**从网页提取内容 -> LLM 分析 -> 本地存储**。开发时请严格遵守以下范围与约束。

#### 🎯 功能范围矩阵 (Scope Matrix)

| 模块 | ✅ 本期纳入 (In Scope) | ❌ 暂不纳入 (Out of Scope) |
| :--- | :--- | :--- |
| **内容提取** | Reddit/知乎/通用网页的正文及评论树提取 | Twitter/X 深度适配、Hacker News、动态流式加载 |
| **智能分析** | 需求识别、痛点评分、摘要生成 | 需求聚类、批量分析、趋势追踪 |
| **数据存储** | IndexedDB 本地完整存储、Chrome Sync 轻量备份 | 云端数据库同步、用户账户系统 |
| **交互界面** | Side Panel (侧边栏) 主交互 | Popup 复杂交互、独立的 Dashboard 页面 |
| **平台支持** | Chrome (MV3) | Firefox/Safari、移动端 |

#### ⚠️ 关键技术约束 (Technical Constraints)

1.  **本地优先 (Local-First)**
    *   所有用户数据（原文、分析结果）默认仅存储在 `IndexedDB`。
    *   **严禁**在未获用户授权下将数据发送至任何第三方服务器。

2.  **隐私安全 (Privacy & Security)**
    *   **PII 过滤**: 发送给 LLM 前必须对邮箱、电话、IP 等敏感信息脱敏 (参见 `src/shared/utils/pii-filter.ts`)。
    *   **API Key**: 仅保存在本地 Storage，禁止明文传输或日志记录。

3.  **性能阈值 (Performance Targets)**
    *   **提取耗时**: < 3s (对于普通长文)。
    *   **内存占用**: Background Service Worker 常驻内存需控制在 80MB 以内。
    *   **降级策略**: 当 LLM 不可用或超时 (>15s) 时，系统必须能够回退到"仅保存原文"模式。

**技术栈**：
- **框架**: [Plasmo](https://docs.plasmo.com/) (Chrome MV3)
- **UI**: React 18 + Tailwind CSS
- **状态管理**: Zustand
- **存储**: Dexie.js (IndexedDB)
- **AI**: LangChain.js

## 2. 项目目录结构与文件说明

```
demand-radar/
├── src/
│   ├── background/             # [后台服务] Service Worker，处理核心逻辑
│   │   ├── index.ts            # 入口文件，设置事件监听
│   │   ├── message-handler.ts  # 消息路由，处理来自 UI 或 Content Script 的消息
│   │   └── llm/                # LLM 服务模块
│   │       ├── index.ts        # LLM 调用主逻辑
│   │       └── provider-factory.ts # LLM 提供商工厂 (OpenAI, Gemini 等)
│   │
│   ├── content/                # [内容脚本] 注入到网页中运行
│   │   ├── index.ts            # 入口文件
│   │   ├── site-filter.ts      # 站点匹配逻辑
│   │   └── adapters/           # 平台适配器 (核心：定义如何从不同网站提取内容)
│   │       ├── base.ts         # 适配器基类接口
│   │       ├── reddit.ts       # Reddit 专用提取逻辑
│   │       └── zhihu.ts        # 知乎专用提取逻辑
│   │
│   ├── sidepanel/              # [侧边栏 UI] 扩展的主要交互界面
│   │   ├── App.tsx             # 主应用组件
│   │   ├── components/         # UI 组件 (卡片、列表、设置页等)
│   │   └── stores/             # Zustand 状态管理 (分析结果、设置等)
│   │
│   ├── storage/                # [数据层] 数据库管理
│   │   ├── db.ts               # Dexie 数据库 Schema 定义
│   │   └── repositories/       # 数据访问层 (DAO)
│   │
│   └── shared/                 # [共享模块] 类型定义、常量、工具函数
│       ├── types/              # TypeScript 类型定义
│       └── utils/              # 通用工具 (PII 脱敏、文本处理)
│
├── assets/                     # 静态资源 (图标等)
├── docs/                       # 项目文档 (PRD, 计划等)
├── package.json                # 依赖与脚本配置
└── tailwind.config.js          # Tailwind CSS 配置
```

## 3. 快速开始 (Setup & Run)

本项目建议使用 `pnpm` 作为包管理器（根目录存在 `pnpm-lock.yaml`）。

### 安装依赖
```bash
pnpm install
# 或者
npm install
```

### 启动开发服务器
```bash
pnpm dev
# 或者
npm run dev
```
启动后，Plasmo 会在 `build/chrome-mv3-dev` 目录下生成开发版扩展。

### 加载到 Chrome
1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **"开发者模式" (Developer mode)**
3. 点击 **"加载已解压的扩展程序" (Load unpacked)**
4. 选择项目目录下的 `build/chrome-mv3-dev` 文件夹

### 生产构建
```bash
pnpm build
pnpm package # 生成可发布的 .zip 文件
```

## 4. 核心开发任务指引

### 任务 A: 添加新的网站支持
如果你想让插件支持新的网站（例如 Twitter）：
1. 在 `src/content/adapters/` 下新建 `twitter.ts`。
2. 继承 `BasePlatformAdapter` 并实现 `extractContent` 方法。
3. 在 `src/content/adapters/index.ts` 中注册新适配器。

### 任务 B: 修改 AI 分析逻辑
如果你想调整 Prompt 或处理逻辑：
1. 查看 `src/background/llm/prompt-templates.ts` 修改提示词。
2. 查看 `src/background/llm/index.ts` 修改调用流程。

### 任务 C: 修改 UI 界面
UI 代码位于 `src/sidepanel`。主要是一个标准的 React SPA。
- 全局状态在 `src/sidepanel/stores`。
- 样式使用 Tailwind CSS。

## 5. 调试技巧

- **调试 UI/Sidepanel**: 在侧边栏右键 -> "检查" (Inspect)，使用 React DevTools。
- **调试 Background**: 在 `chrome://extensions` 页面，点击插件卡片上的 "Service Worker" 链接，打开独立的 DevTools。
- **调试 Content Script**: 在目标网页（如 Reddit）右键 -> "检查" -> Console 面板。

## 6. 文档资源

- **需求文档**: `docs/PRD.md` (详细的功能定义)
- **开发规范**: `CLAUDE.md` / `AGENT.md` (代码风格与 AI 协作规范)

Happy Coding! 🚀
