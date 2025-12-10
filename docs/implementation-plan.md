# Demand Radar 从零开始实现计划

> 版本: 1.0
> 创建日期: 2025-12-10
> 基于文档: PRD 2.0 + 技术设计文档 1.0
> 状态: 待执行

---

## 一、实现概览

### 1.1 项目目标

构建一个 Chrome 浏览器插件，帮助用户从 Reddit、知乎等平台的用户讨论中**提炼可执行的产品解决方案**。

### 1.2 技术栈确认

| 组件 | 技术选型 | 版本要求 |
|-----|---------|---------|
| 扩展框架 | Plasmo | ^0.89.x |
| UI 框架 | React | ^18.x |
| 样式方案 | Tailwind CSS | ^3.x |
| 状态管理 | Zustand | ^4.x |
| 本地存储 | Dexie.js (IndexedDB) | ^4.x |
| LLM 调用 | LangChain.js | 见下方详细说明 |
| 内容提取 | @mozilla/readability | ^0.5.x |
| HTML 清理 | DOMPurify | ^3.x |
| Markdown 转换 | Turndown | ^7.x |

### 1.3 LangChain.js 依赖（基于最新官方文档）

```json
{
  "dependencies": {
    "@langchain/core": "^0.3.x",
    "@langchain/openai": "^0.3.x",
    "@langchain/google-genai": "^0.1.x",
    "zod": "^3.x"
  }
}
```

**关键用法说明**（来源：LangChain 官方文档 2025-12）：

1. **ChatOpenAI** - 支持 OpenAI 及兼容 API（DeepSeek、自定义）
   ```typescript
   import { ChatOpenAI } from "@langchain/openai";

   // OpenAI 原生
   const openai = new ChatOpenAI({
     model: "gpt-4o-mini",
     apiKey: "sk-...",
     streaming: true,
   });

   // DeepSeek（OpenAI 兼容）
   const deepseek = new ChatOpenAI({
     model: "deepseek-chat",
     apiKey: "sk-...",
     configuration: {
       baseURL: "https://api.deepseek.com/v1",
     },
     streaming: true,
   });
   ```

2. **ChatGoogleGenerativeAI** - Google Gemini 模型
   ```typescript
   import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

   const gemini = new ChatGoogleGenerativeAI({
     model: "gemini-2.5-flash-lite", // 推荐使用最新模型
     apiKey: "AI...",
     maxOutputTokens: 2048,
   });
   ```

3. **结构化输出**（推荐方式）
   ```typescript
   import * as z from "zod";

   const DemandSchema = z.object({
     solution: z.object({
       title: z.string(),
       description: z.string(),
       targetUser: z.string(),
       keyDifferentiators: z.array(z.string()),
     }),
     validation: z.object({
       painPoints: z.array(z.string()),
       competitors: z.array(z.string()),
       competitorGaps: z.array(z.string()),
       quotes: z.array(z.string()),
     }),
   });

   const modelWithStructure = model.withStructuredOutput(DemandSchema);
   ```

---

## 二、实现阶段划分

### 阶段概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    Demand Radar 实现路线                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Week 0: 技术验证 (3-5 天)                                       │
│  ├── 知乎内容提取 POC                                            │
│  ├── Reddit 内容提取 POC                                         │
│  ├── LLM Prompt 原型验证                                         │
│  └── Side Panel 基础框架                                         │
│                                                                  │
│  Phase 1: MVP (5 周 + 1 周缓冲)                                  │
│  ├── Week 1: 内容提取层                                          │
│  ├── Week 2: Side Panel UI                                       │
│  ├── Week 3: LLM 服务 + 存储                                     │
│  ├── Week 4: 安全 + 打磨                                         │
│  ├── Week 5: 测试 + 上架                                         │
│  └── Week 6: 缓冲周                                              │
│                                                                  │
│  Phase 2: 增强功能 (P1)                                          │
│  Phase 3: 扩展功能 (P2)                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、Week 0 - 技术验证

### 3.1 目标

验证核心技术可行性，识别风险点，为正式开发提供技术基础。

### 3.2 任务清单

#### 3.2.1 项目初始化

```bash
# 1. 创建 Plasmo 项目
npm create plasmo@latest demand-radar -- --with-tailwindcss

# 2. 安装核心依赖
npm install react@18 zustand dexie dompurify @mozilla/readability turndown

# 3. 安装 LangChain 依赖
npm install @langchain/core @langchain/openai @langchain/google-genai zod

# 4. 安装开发依赖
npm install -D typescript @types/react @types/dompurify vitest
```

#### 3.2.2 目录结构创建

```
src/
├── background/
│   ├── index.ts                 # Service Worker 入口
│   ├── message-handler.ts       # 消息路由
│   └── llm/
│       ├── index.ts
│       ├── provider-factory.ts
│       ├── prompt-templates.ts
│       └── providers/
│           ├── openai.ts
│           ├── google.ts
│           └── deepseek.ts
├── content/
│   ├── index.ts                 # Content Script 入口
│   ├── extractor.ts
│   └── adapters/
│       ├── index.ts
│       ├── base.ts
│       ├── reddit.ts
│       ├── zhihu.ts
│       └── generic.ts
├── sidepanel/
│   ├── index.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── AnalysisView.tsx
│   │   ├── DemandCard.tsx
│   │   ├── DemandDetail.tsx
│   │   ├── DemandList.tsx
│   │   └── SettingsView.tsx
│   └── stores/
│       ├── analysis.ts
│       ├── demands.ts
│       └── config.ts
├── storage/
│   ├── db.ts
│   ├── extraction-repo.ts
│   ├── demand-repo.ts
│   └── config-repo.ts
├── shared/
│   ├── types/
│   │   ├── extraction.ts
│   │   ├── demand.ts
│   │   ├── config.ts
│   │   └── messages.ts
│   ├── constants.ts
│   └── utils/
│       ├── pii-filter.ts
│       └── text-utils.ts
└── options/
    ├── index.tsx
    └── components/
        └── LLMConfig.tsx
```

#### 3.2.3 知乎内容提取 POC

**验证目标**：
- [ ] 是否需要登录才能访问内容
- [ ] 反爬措施情况
- [ ] 动态加载处理方案
- [ ] DOM 选择器稳定性

**测试用例（至少 10 页）**：
- 知乎问答页面
- 知乎专栏文章
- 知乎回答页面
- 知乎评论区

**代码框架**：
```typescript
// src/content/adapters/zhihu.ts
import type { IPlatformAdapter, ExtractionResult } from './base';

export class ZhihuAdapter implements IPlatformAdapter {
  canHandle(url: string): boolean {
    return /zhihu\.com/.test(url);
  }

  getPlatformName(): string {
    return 'zhihu';
  }

  async extract(): Promise<ExtractionResult> {
    // POC: 验证选择器
    const questionTitle = document.querySelector('.QuestionHeader-title');
    const answerContent = document.querySelectorAll('.RichContent-inner');
    const comments = document.querySelectorAll('.CommentContent');

    // 收集内容...
  }
}
```

#### 3.2.4 Reddit 内容提取 POC

**验证目标**：
- [ ] DOM 结构稳定性（new.reddit.com vs old.reddit.com）
- [ ] 评论树提取方案
- [ ] 不同 subreddit 兼容性

**测试用例（至少 10 页）**：
- r/SaaS 帖子
- r/Entrepreneur 帖子
- r/startups 帖子
- r/selfhosted 帖子

**代码框架**：
```typescript
// src/content/adapters/reddit.ts
import type { IPlatformAdapter, ExtractionResult } from './base';

export class RedditAdapter implements IPlatformAdapter {
  canHandle(url: string): boolean {
    return /reddit\.com/.test(url);
  }

  getPlatformName(): string {
    return 'reddit';
  }

  async extract(): Promise<ExtractionResult> {
    // 检测 Reddit 版本
    const isNewReddit = document.querySelector('[data-testid="post-container"]');

    if (isNewReddit) {
      return this.extractNewReddit();
    }
    return this.extractOldReddit();
  }

  private async extractNewReddit(): Promise<ExtractionResult> {
    // 新版 Reddit 选择器
  }

  private async extractOldReddit(): Promise<ExtractionResult> {
    // 旧版 Reddit 选择器
  }
}
```

#### 3.2.5 LLM Prompt 原型验证

**验证目标**：
- [ ] 输出结构是否符合 Demand 模型
- [ ] 证据提取准确性
- [ ] 多服务商 API 兼容性

**测试样本**：准备 10 条真实吐槽帖内容

**Prompt 模板**：
```typescript
// src/background/llm/prompt-templates.ts
export const SOLUTION_EXTRACTION_PROMPT = `
你是一个产品机会分析专家。请从以下用户讨论内容中提炼可能的产品方向。

【输入内容】
{content}

【输出要求】
请以 JSON 格式输出，严格遵循以下结构：

{
  "demands": [
    {
      "solution": {
        "title": "产品名称（一句话）",
        "description": "详细描述（2-3句话，说明是什么产品）",
        "targetUser": "目标用户（谁会用这个产品）",
        "keyDifferentiators": ["差异点1", "差异点2", "差异点3"]
      },
      "validation": {
        "painPoints": ["用户痛点1", "用户痛点2"],
        "competitors": ["竞品名称1", "竞品名称2"],
        "competitorGaps": ["竞品不足1", "竞品不足2"],
        "quotes": ["原文证据1", "原文证据2"]
      }
    }
  ],
  "summary": "页面内容摘要（100-200字）"
}

【注意事项】
1. keyDifferentiators 应该是具体的、可执行的差异点
2. quotes 必须是原文中的实际内容，不要编造
3. 如果内容中没有明显的产品机会，返回空数组
4. 最多输出 3 个产品方向，优先输出最有价值的
`;
```

#### 3.2.6 Side Panel 基础框架

**验证目标**：
- [ ] Side Panel API 可用性
- [ ] 与 Content Script 通信
- [ ] React 渲染正常

**代码框架**：
```typescript
// src/sidepanel/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

```typescript
// src/sidepanel/App.tsx
import React, { useState } from 'react';

export default function App() {
  const [view, setView] = useState<'analysis' | 'library' | 'settings'>('analysis');

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <header className="p-4 border-b">
        <h1 className="text-lg font-bold">Demand Radar</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {view === 'analysis' && <AnalysisView />}
        {view === 'library' && <DemandList />}
        {view === 'settings' && <SettingsView />}
      </main>

      {/* Navigation */}
      <nav className="p-2 border-t flex justify-around">
        <button onClick={() => setView('analysis')}>分析</button>
        <button onClick={() => setView('library')}>需求库</button>
        <button onClick={() => setView('settings')}>设置</button>
      </nav>
    </div>
  );
}
```

### 3.3 输出物

- [ ] 技术可行性报告
- [ ] 风险清单及应对方案
- [ ] 平台适配预案（知乎反爬应对）
- [ ] 验证代码 POC

### 3.4 风险应对预案

| 风险 | 应对方案 |
|-----|---------|
| 知乎需要登录 | 提示用户先登录，只提取可见内容 |
| 知乎动态加载 | 只提取首屏已加载内容，提示用户手动展开 |
| 知乎完全封禁 | 降级为通用提取器，知乎移至 P1 |
| Reddit DOM 不稳定 | 同时支持新旧版选择器，自动检测 |

---

## 四、Phase 1 - MVP 实现

### 4.1 Week 1: 内容提取层

#### 4.1.1 目标

知乎 + Reddit 提取器稳定可用

#### 4.1.2 里程碑

- 各 30 条页面测试通过率 ≥ 90%

#### 4.1.3 任务分解

**Day 1-2: 平台适配器基础架构**

```typescript
// src/content/adapters/base.ts
export interface ExtractionResult {
  success: boolean;
  platform: 'reddit' | 'zhihu' | 'generic';
  content: {
    title: string;
    body: string;
    comments?: string[];
    metadata: {
      author?: string;
      timestamp?: string;
      url: string;
    };
  };
  truncated: boolean;
  originalLength?: number;
  fallbackUsed?: boolean;
  error?: string;
}

export interface IPlatformAdapter {
  canHandle(url: string): boolean;
  extract(): Promise<ExtractionResult>;
  getPlatformName(): string;
}

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract canHandle(url: string): boolean;
  abstract getPlatformName(): string;
  abstract extractContent(): Promise<ExtractionResult>;

  async extract(): Promise<ExtractionResult> {
    try {
      return await this.extractContent();
    } catch (error) {
      // 降级到通用提取
      return this.fallbackExtract(error);
    }
  }

  protected fallbackExtract(error: unknown): ExtractionResult {
    // 使用 Readability 降级提取
  }
}
```

**Day 3: Reddit 适配器完善**

```typescript
// src/content/adapters/reddit.ts
import { BasePlatformAdapter, ExtractionResult } from './base';

export class RedditAdapter extends BasePlatformAdapter {
  // 选择器配置（便于维护）
  private static SELECTORS = {
    newReddit: {
      postContainer: '[data-testid="post-container"]',
      postTitle: 'h1',
      postBody: '[data-click-id="text"]',
      comments: 'shreddit-comment',
    },
    oldReddit: {
      postTitle: '.top-matter a.title',
      postBody: '.usertext-body',
      comments: '.comment .md',
    },
  };

  canHandle(url: string): boolean {
    return /reddit\.com/.test(url);
  }

  getPlatformName(): string {
    return 'reddit';
  }

  async extractContent(): Promise<ExtractionResult> {
    const isNewReddit = document.querySelector('[data-testid="post-container"]');
    const selectors = isNewReddit
      ? RedditAdapter.SELECTORS.newReddit
      : RedditAdapter.SELECTORS.oldReddit;

    const title = this.extractTitle(selectors);
    const body = this.extractBody(selectors);
    const comments = this.extractComments(selectors);

    return {
      success: true,
      platform: 'reddit',
      content: {
        title,
        body,
        comments,
        metadata: {
          url: window.location.href,
        },
      },
      truncated: false,
    };
  }

  private extractTitle(selectors: typeof RedditAdapter.SELECTORS.newReddit): string {
    // 实现标题提取
  }

  private extractBody(selectors: typeof RedditAdapter.SELECTORS.newReddit): string {
    // 实现正文提取
  }

  private extractComments(selectors: typeof RedditAdapter.SELECTORS.newReddit): string[] {
    // 实现评论提取（限制数量防止过长）
  }
}
```

**Day 4: 知乎适配器完善**

```typescript
// src/content/adapters/zhihu.ts
import { BasePlatformAdapter, ExtractionResult } from './base';

export class ZhihuAdapter extends BasePlatformAdapter {
  private static SELECTORS = {
    question: {
      title: '.QuestionHeader-title',
      detail: '.QuestionRichText',
    },
    answer: {
      content: '.RichContent-inner',
      author: '.AuthorInfo-name',
    },
    article: {
      title: '.Post-Title',
      content: '.Post-RichText',
    },
    comments: '.CommentContent',
  };

  canHandle(url: string): boolean {
    return /zhihu\.com/.test(url);
  }

  getPlatformName(): string {
    return 'zhihu';
  }

  async extractContent(): Promise<ExtractionResult> {
    // 检测页面类型
    const isQuestion = window.location.pathname.includes('/question/');
    const isArticle = window.location.pathname.includes('/p/');

    if (isQuestion) {
      return this.extractQuestion();
    } else if (isArticle) {
      return this.extractArticle();
    }

    throw new Error('Unknown Zhihu page type');
  }

  private extractQuestion(): Promise<ExtractionResult> {
    // 问答页面提取
  }

  private extractArticle(): Promise<ExtractionResult> {
    // 专栏文章提取
  }
}
```

**Day 5: 通用适配器 + 适配器注册**

```typescript
// src/content/adapters/generic.ts
import { Readability } from '@mozilla/readability';
import { BasePlatformAdapter, ExtractionResult } from './base';

export class GenericAdapter extends BasePlatformAdapter {
  canHandle(url: string): boolean {
    return true; // 兜底适配器，总是可以处理
  }

  getPlatformName(): string {
    return 'generic';
  }

  async extractContent(): Promise<ExtractionResult> {
    const documentClone = document.cloneNode(true) as Document;
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article) {
      // 最终降级：纯文本
      return {
        success: true,
        platform: 'generic',
        content: {
          title: document.title,
          body: document.body.innerText.slice(0, 20000),
          metadata: { url: window.location.href },
        },
        truncated: document.body.innerText.length > 20000,
        fallbackUsed: true,
      };
    }

    return {
      success: true,
      platform: 'generic',
      content: {
        title: article.title,
        body: article.textContent || '',
        metadata: { url: window.location.href },
      },
      truncated: false,
    };
  }
}
```

```typescript
// src/content/adapters/index.ts
import { IPlatformAdapter } from './base';
import { RedditAdapter } from './reddit';
import { ZhihuAdapter } from './zhihu';
import { GenericAdapter } from './generic';

class AdapterRegistry {
  private adapters: IPlatformAdapter[] = [];

  register(adapter: IPlatformAdapter): void {
    this.adapters.push(adapter);
  }

  getAdapter(url: string): IPlatformAdapter {
    // 优先返回专用适配器
    for (const adapter of this.adapters) {
      if (adapter.getPlatformName() !== 'generic' && adapter.canHandle(url)) {
        return adapter;
      }
    }
    // 降级到通用适配器
    return this.adapters.find(a => a.getPlatformName() === 'generic')!;
  }
}

export const registry = new AdapterRegistry();

// 注册适配器（顺序决定优先级）
registry.register(new RedditAdapter());
registry.register(new ZhihuAdapter());
registry.register(new GenericAdapter());

export { registry as adapterRegistry };
```

#### 4.1.4 测试验收

- [ ] Reddit 30 页测试，准确率 ≥ 90%
- [ ] 知乎 30 页测试，准确率 ≥ 90%
- [ ] 通用网页 20 页测试
- [ ] 降级机制验证

---

### 4.2 Week 2: Side Panel UI

#### 4.2.1 目标

Side Panel 基本可用，支持基础交互

#### 4.2.2 里程碑

- 侧边栏展示提取结果
- 设置页面完成
- 欢迎引导流程完成

#### 4.2.3 任务分解

**Day 1: manifest.json 配置**

```json
// manifest.json (Plasmo 会自动生成，这里展示关键配置)
{
  "manifest_version": 3,
  "name": "Demand Radar",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "sidePanel"
  ],
  "host_permissions": [
    "https://*.reddit.com/*",
    "https://*.zhihu.com/*"
  ],
  "optional_host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "action": {
    "default_title": "Demand Radar"
  }
}
```

**Day 2: Zustand 状态管理**

```typescript
// src/sidepanel/stores/analysis.ts
import { create } from 'zustand';
import type { ExtractionResult } from '@/shared/types/extraction';
import type { Demand } from '@/shared/types/demand';

interface AnalysisState {
  // 状态
  isLoading: boolean;
  error: string | null;
  currentUrl: string | null;
  extractionResult: ExtractionResult | null;
  analysisResult: {
    summary: string;
    demands: Demand[];
  } | null;
  selectedDemandIds: string[];

  // 操作
  startAnalysis: (url: string) => void;
  setExtractionResult: (result: ExtractionResult) => void;
  setAnalysisResult: (result: { summary: string; demands: Demand[] }) => void;
  appendAnalysisChunk: (chunk: string) => void;
  setError: (error: string) => void;
  toggleDemandSelection: (id: string) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  isLoading: false,
  error: null,
  currentUrl: null,
  extractionResult: null,
  analysisResult: null,
  selectedDemandIds: [],

  startAnalysis: (url) => set({
    isLoading: true,
    error: null,
    currentUrl: url,
    extractionResult: null,
    analysisResult: null,
  }),

  setExtractionResult: (result) => set({ extractionResult: result }),

  setAnalysisResult: (result) => set({
    analysisResult: result,
    isLoading: false,
    selectedDemandIds: result.demands.map(d => d.id), // 默认全选
  }),

  appendAnalysisChunk: (chunk) => {
    // 流式更新处理
  },

  setError: (error) => set({ error, isLoading: false }),

  toggleDemandSelection: (id) => set((state) => ({
    selectedDemandIds: state.selectedDemandIds.includes(id)
      ? state.selectedDemandIds.filter(i => i !== id)
      : [...state.selectedDemandIds, id],
  })),

  reset: () => set({
    isLoading: false,
    error: null,
    currentUrl: null,
    extractionResult: null,
    analysisResult: null,
    selectedDemandIds: [],
  }),
}));
```

```typescript
// src/sidepanel/stores/config.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LLMProvider = 'openai' | 'google' | 'deepseek' | 'custom';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

interface ConfigState {
  llmConfig: LLMConfig | null;
  siteWhitelist: string[];
  siteBlacklist: string[];
  isConfigured: boolean;

  setLLMConfig: (config: LLMConfig) => void;
  addToWhitelist: (site: string) => void;
  removeFromWhitelist: (site: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      llmConfig: null,
      siteWhitelist: ['*.reddit.com', '*.zhihu.com'],
      siteBlacklist: ['*.bank.*', 'mail.*', '*.gov.*'],
      isConfigured: false,

      setLLMConfig: (config) => set({
        llmConfig: config,
        isConfigured: true
      }),

      addToWhitelist: (site) => set((state) => ({
        siteWhitelist: [...state.siteWhitelist, site],
      })),

      removeFromWhitelist: (site) => set((state) => ({
        siteWhitelist: state.siteWhitelist.filter(s => s !== site),
      })),
    }),
    {
      name: 'demand-radar-config',
      storage: createJSONStorage(() => chrome.storage.local),
    }
  )
);
```

**Day 3: 分析视图组件**

```typescript
// src/sidepanel/components/AnalysisView.tsx
import React from 'react';
import { useAnalysisStore } from '../stores/analysis';
import { DemandCard } from './DemandCard';

export function AnalysisView() {
  const {
    isLoading,
    error,
    currentUrl,
    analysisResult,
    selectedDemandIds,
    toggleDemandSelection,
  } = useAnalysisStore();

  const handleAnalyze = async () => {
    // 发送分析请求到 Service Worker
    chrome.runtime.sendMessage({ type: 'ANALYZE_CURRENT_PAGE' });
  };

  const handleQuickSave = async () => {
    // 快速保存（不调用 LLM）
    chrome.runtime.sendMessage({ type: 'QUICK_SAVE_CURRENT_PAGE' });
  };

  const handleSaveSelected = async () => {
    // 保存选中的需求
    const selectedDemands = analysisResult?.demands.filter(
      d => selectedDemandIds.includes(d.id)
    );
    chrome.runtime.sendMessage({
      type: 'SAVE_DEMANDS',
      payload: selectedDemands
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* 当前页面信息 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-sm text-gray-500">当前页面</div>
        <div className="font-medium truncate">{currentUrl || '未检测到页面'}</div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg disabled:opacity-50"
        >
          {isLoading ? '分析中...' : '🔍 分析此页面'}
        </button>
        <button
          onClick={handleQuickSave}
          className="bg-gray-200 py-2 px-4 rounded-lg"
        >
          📥 快速保存
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 分析结果 */}
      {analysisResult && (
        <div className="space-y-4">
          {/* 摘要 */}
          <div>
            <h3 className="font-medium mb-2">📋 摘要</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {analysisResult.summary}
            </p>
          </div>

          {/* 产品方向列表 */}
          <div>
            <h3 className="font-medium mb-2">
              💡 识别到 {analysisResult.demands.length} 个产品方向
            </h3>
            <div className="space-y-2">
              {analysisResult.demands.map(demand => (
                <DemandCard
                  key={demand.id}
                  demand={demand}
                  selected={selectedDemandIds.includes(demand.id)}
                  onToggle={() => toggleDemandSelection(demand.id)}
                />
              ))}
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSaveSelected}
            disabled={selectedDemandIds.length === 0}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            💾 保存选中的 {selectedDemandIds.length} 个方向
          </button>
        </div>
      )}
    </div>
  );
}
```

**Day 4: 需求卡片 + 详情组件**

```typescript
// src/sidepanel/components/DemandCard.tsx
import React, { useState } from 'react';
import type { Demand } from '@/shared/types/demand';

interface DemandCardProps {
  demand: Demand;
  selected: boolean;
  onToggle: () => void;
}

export function DemandCard({ demand, selected, onToggle }: DemandCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-white">
      {/* 头部 */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <h4 className="font-medium">{demand.solution.title}</h4>
          <div className="text-sm text-gray-500 mt-1">
            ✨ {demand.solution.keyDifferentiators.slice(0, 3).join(' · ')}
          </div>
          {demand.validation.competitors.length > 0 && (
            <div className="text-sm text-gray-400 mt-1">
              🏢 vs {demand.validation.competitors.join(', ')}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div>
            <div className="text-sm font-medium">📝 描述</div>
            <p className="text-sm text-gray-600">{demand.solution.description}</p>
          </div>
          <div>
            <div className="text-sm font-medium">👤 目标用户</div>
            <p className="text-sm text-gray-600">{demand.solution.targetUser}</p>
          </div>
          <div>
            <div className="text-sm font-medium">😫 用户痛点</div>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {demand.validation.painPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
          {demand.validation.quotes.length > 0 && (
            <div>
              <div className="text-sm font-medium">💬 原文证据</div>
              <div className="space-y-1">
                {demand.validation.quotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-2"
                  >
                    "{quote}"
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Day 5: 设置页面 + 欢迎引导**

```typescript
// src/sidepanel/components/SettingsView.tsx
import React, { useState } from 'react';
import { useConfigStore, type LLMProvider } from '../stores/config';

const PROVIDER_PRESETS: Record<LLMProvider, { name: string; docUrl: string }> = {
  openai: { name: 'OpenAI (gpt-4o-mini)', docUrl: 'https://platform.openai.com/api-keys' },
  google: { name: 'Google (gemini-2.5-flash-lite)', docUrl: 'https://aistudio.google.com/app/apikey' },
  deepseek: { name: 'DeepSeek (deepseek-chat)', docUrl: 'https://platform.deepseek.com/api_keys' },
  custom: { name: '自定义', docUrl: '' },
};

export function SettingsView() {
  const { llmConfig, setLLMConfig, isConfigured } = useConfigStore();

  const [provider, setProvider] = useState<LLMProvider>(llmConfig?.provider || 'deepseek');
  const [apiKey, setApiKey] = useState(llmConfig?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(llmConfig?.baseUrl || '');
  const [modelName, setModelName] = useState(llmConfig?.modelName || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_LLM_CONNECTION',
        payload: { provider, apiKey, baseUrl, modelName },
      });
      setTestResult(response.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setLLMConfig({ provider, apiKey, baseUrl, modelName });
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-bold">⚙️ LLM 配置</h2>

      {/* 服务商选择 */}
      <div>
        <label className="block text-sm font-medium mb-2">服务商</label>
        <div className="space-y-2">
          {(Object.keys(PROVIDER_PRESETS) as LLMProvider[]).map(p => (
            <label key={p} className="flex items-center gap-2">
              <input
                type="radio"
                name="provider"
                value={p}
                checked={provider === p}
                onChange={() => setProvider(p)}
              />
              <span>{PROVIDER_PRESETS[p].name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">API Key *</label>
          {PROVIDER_PRESETS[provider].docUrl && (
            <a
              href={PROVIDER_PRESETS[provider].docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500"
            >
              获取 Key →
            </a>
          )}
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* 高级选项（自定义服务商） */}
      {provider === 'custom' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">模型名称</label>
            <input
              type="text"
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              placeholder="model-name"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={!apiKey || testing}
          className="flex-1 border rounded-lg py-2 disabled:opacity-50"
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
        <button
          onClick={handleSave}
          disabled={!apiKey}
          className="flex-1 bg-blue-500 text-white rounded-lg py-2 disabled:opacity-50"
        >
          保存配置
        </button>
      </div>

      {/* 测试结果 */}
      {testResult === 'success' && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg">
          ✅ 连接成功！
        </div>
      )}
      {testResult === 'error' && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg">
          ❌ 连接失败，请检查 API Key
        </div>
      )}
    </div>
  );
}
```

#### 4.2.4 测试验收

- [ ] Side Panel 打开 < 500ms
- [ ] 分析视图交互正常
- [ ] 设置页面保存/读取正常
- [ ] 欢迎引导流程完整

---

### 4.3 Week 3: LLM 服务 + 存储

#### 4.3.1 目标

LLM 分析流程完整，存储功能可用

#### 4.3.2 里程碑

- 解决方案提炼质量评分 ≥ 3.5（20 条样本）
- IndexedDB 存储正常

#### 4.3.3 任务分解

**Day 1: LLM Provider 工厂**

```typescript
// src/background/llm/provider-factory.ts
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig } from '@/shared/types/config';

// 服务商预设配置
const PROVIDER_DEFAULTS = {
  openai: {
    model: 'gpt-4o-mini',
    baseURL: undefined,
  },
  google: {
    model: 'gemini-2.5-flash-lite',
  },
  deepseek: {
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
  },
};

export class ProviderFactory {
  static create(config: LLMConfig): BaseChatModel {
    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          model: config.modelName || PROVIDER_DEFAULTS.openai.model,
          apiKey: config.apiKey,
          streaming: true,
        });

      case 'google':
        return new ChatGoogleGenerativeAI({
          model: config.modelName || PROVIDER_DEFAULTS.google.model,
          apiKey: config.apiKey,
        });

      case 'deepseek':
        // DeepSeek 兼容 OpenAI API
        return new ChatOpenAI({
          model: config.modelName || PROVIDER_DEFAULTS.deepseek.model,
          apiKey: config.apiKey,
          configuration: {
            baseURL: PROVIDER_DEFAULTS.deepseek.baseURL,
          },
          streaming: true,
        });

      case 'custom':
        // 用户自定义 OpenAI 兼容服务
        return new ChatOpenAI({
          model: config.modelName!,
          apiKey: config.apiKey,
          configuration: {
            baseURL: config.baseUrl,
          },
          streaming: true,
        });

      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
```

**Day 2: LLM 服务层**

```typescript
// src/background/llm/index.ts
import * as z from 'zod';
import { ProviderFactory } from './provider-factory';
import { SOLUTION_EXTRACTION_PROMPT } from './prompt-templates';
import type { LLMConfig } from '@/shared/types/config';
import type { Demand } from '@/shared/types/demand';

// 使用 Zod 定义输出结构（LangChain 推荐方式）
const DemandSchema = z.object({
  solution: z.object({
    title: z.string().describe('产品名称（一句话）'),
    description: z.string().describe('详细描述（2-3句话）'),
    targetUser: z.string().describe('目标用户'),
    keyDifferentiators: z.array(z.string()).describe('核心差异点（3-5个）'),
  }),
  validation: z.object({
    painPoints: z.array(z.string()).describe('用户痛点'),
    competitors: z.array(z.string()).describe('竞品名称'),
    competitorGaps: z.array(z.string()).describe('竞品不足'),
    quotes: z.array(z.string()).describe('原文证据'),
  }),
});

const AnalysisResultSchema = z.object({
  summary: z.string().describe('页面内容摘要（100-200字）'),
  demands: z.array(DemandSchema).describe('产品方向列表（最多3个）'),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export class LLMService {
  private config: LLMConfig | null = null;

  setConfig(config: LLMConfig) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) throw new Error('LLM not configured');

    try {
      const model = ProviderFactory.create(this.config);
      await model.invoke('Hello');
      return true;
    } catch {
      return false;
    }
  }

  async analyze(content: string): Promise<AnalysisResult> {
    if (!this.config) throw new Error('LLM not configured');

    const model = ProviderFactory.create(this.config);

    // 使用结构化输出（LangChain 推荐方式）
    const modelWithStructure = model.withStructuredOutput(AnalysisResultSchema);

    const prompt = SOLUTION_EXTRACTION_PROMPT.replace('{content}', content);

    const result = await modelWithStructure.invoke(prompt);

    return result;
  }

  async *analyzeStream(content: string): AsyncGenerator<string> {
    if (!this.config) throw new Error('LLM not configured');

    const model = ProviderFactory.create(this.config);
    const prompt = SOLUTION_EXTRACTION_PROMPT.replace('{content}', content);

    // 流式输出
    const stream = await model.stream(prompt);

    for await (const chunk of stream) {
      if (typeof chunk.content === 'string') {
        yield chunk.content;
      }
    }
  }
}

export const llmService = new LLMService();
```

**Day 3: Dexie.js 数据库**

```typescript
// src/storage/db.ts
import Dexie, { type Table } from 'dexie';
import type { Extraction } from '@/shared/types/extraction';
import type { Demand } from '@/shared/types/demand';

export class DemandRadarDB extends Dexie {
  extractions!: Table<Extraction>;
  demands!: Table<Demand>;

  constructor() {
    super('DemandRadarDB');

    this.version(1).stores({
      extractions: 'id, url, platform, capturedAt, analysisStatus',
      demands: 'id, extractionId, *tags, starred, archived, groupId, createdAt, [starred+createdAt]',
    });
  }
}

export const db = new DemandRadarDB();
```

```typescript
// src/storage/demand-repo.ts
import { db } from './db';
import type { Demand } from '@/shared/types/demand';

export class DemandRepository {
  async create(demand: Demand): Promise<string> {
    return db.demands.add(demand);
  }

  async createMany(demands: Demand[]): Promise<void> {
    await db.demands.bulkAdd(demands);
  }

  async getById(id: string): Promise<Demand | undefined> {
    return db.demands.get(id);
  }

  async getAll(): Promise<Demand[]> {
    return db.demands.orderBy('createdAt').reverse().toArray();
  }

  async getStarred(): Promise<Demand[]> {
    return db.demands
      .where('starred')
      .equals(1) // IndexedDB 中 true = 1
      .reverse()
      .sortBy('createdAt');
  }

  async search(query: string): Promise<Demand[]> {
    const lowerQuery = query.toLowerCase();
    return db.demands
      .filter(d =>
        d.solution.title.toLowerCase().includes(lowerQuery) ||
        d.solution.description.toLowerCase().includes(lowerQuery) ||
        d.tags.some(t => t.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async update(id: string, updates: Partial<Demand>): Promise<void> {
    await db.demands.update(id, { ...updates, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    await db.demands.delete(id);
  }

  async deleteMany(ids: string[]): Promise<void> {
    await db.demands.bulkDelete(ids);
  }

  async getStorageUsage(): Promise<number> {
    // 估算存储使用量
    const allDemands = await db.demands.toArray();
    const totalSize = allDemands.reduce((sum, d) => {
      return sum + JSON.stringify(d).length;
    }, 0);
    return totalSize;
  }
}

export const demandRepo = new DemandRepository();
```

**Day 4: Service Worker 消息处理**

```typescript
// src/background/message-handler.ts
import { llmService } from './llm';
import { demandRepo } from '@/storage/demand-repo';
import { extractionRepo } from '@/storage/extraction-repo';
import { piiFilter } from '@/shared/utils/pii-filter';
import type { MessageType } from '@/shared/types/messages';

export async function handleMessage(
  message: { type: MessageType; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<boolean> {
  switch (message.type) {
    case 'ANALYZE_CURRENT_PAGE':
      handleAnalyze(sender.tab?.id);
      return false; // 异步处理

    case 'QUICK_SAVE_CURRENT_PAGE':
      handleQuickSave(sender.tab?.id);
      return false;

    case 'SAVE_DEMANDS':
      await handleSaveDemands(message.payload as Demand[]);
      sendResponse({ success: true });
      return true;

    case 'TEST_LLM_CONNECTION':
      const success = await llmService.testConnection();
      sendResponse({ success });
      return true;

    case 'GET_DEMANDS':
      const demands = await demandRepo.getAll();
      sendResponse({ demands });
      return true;

    default:
      return false;
  }
}

async function handleAnalyze(tabId?: number) {
  if (!tabId) return;

  // 1. 通知 Panel 开始分析
  chrome.runtime.sendMessage({ type: 'ANALYSIS_STARTED' });

  try {
    // 2. 请求 Content Script 提取内容
    const extractionResult = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_CONTENT',
    });

    // 3. PII 脱敏（仅发送给 LLM 前）
    const sanitizedContent = piiFilter.sanitize(extractionResult.content.body);

    // 4. 调用 LLM 分析
    const analysisResult = await llmService.analyze(sanitizedContent);

    // 5. 保存 Extraction 记录
    await extractionRepo.create({
      id: crypto.randomUUID(),
      url: extractionResult.content.metadata.url,
      title: extractionResult.content.title,
      platform: extractionResult.platform,
      originalText: extractionResult.content.body, // 保存原文
      summary: analysisResult.summary,
      analysisStatus: 'completed',
      demandCount: analysisResult.demands.length,
      savedDemandCount: 0,
      truncated: extractionResult.truncated,
      capturedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. 通知 Panel 分析完成
    chrome.runtime.sendMessage({
      type: 'ANALYSIS_COMPLETE',
      payload: analysisResult,
    });

  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'ANALYSIS_ERROR',
      payload: { message: (error as Error).message },
    });
  }
}

async function handleQuickSave(tabId?: number) {
  // 快速保存模式：不调用 LLM
  if (!tabId) return;

  try {
    const extractionResult = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_CONTENT',
    });

    await extractionRepo.create({
      id: crypto.randomUUID(),
      url: extractionResult.content.metadata.url,
      title: extractionResult.content.title,
      platform: extractionResult.platform,
      originalText: extractionResult.content.body,
      summary: '', // 无摘要
      analysisStatus: 'pending', // 待分析
      demandCount: 0,
      savedDemandCount: 0,
      truncated: extractionResult.truncated,
      capturedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    chrome.runtime.sendMessage({
      type: 'QUICK_SAVE_COMPLETE',
    });

  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'QUICK_SAVE_ERROR',
      payload: { message: (error as Error).message },
    });
  }
}

async function handleSaveDemands(demands: Demand[]) {
  await demandRepo.createMany(demands);
}
```

**Day 5: PII 脱敏 + 容量管理**

```typescript
// src/shared/utils/pii-filter.ts
export class PIIFilter {
  private static PATTERNS = [
    { regex: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[EMAIL]' },
    { regex: /1[3-9]\d{9}/g, replacement: '[PHONE]' },
    { regex: /\d{3}-\d{4}-\d{4}/g, replacement: '[PHONE]' },
    { regex: /\d{17}[\dXx]/g, replacement: '[ID]' },
    { regex: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, replacement: '[CARD]' },
    { regex: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, replacement: '[IP]' },
  ];

  sanitize(text: string): string {
    let result = text;
    for (const { regex, replacement } of PIIFilter.PATTERNS) {
      result = result.replace(regex, replacement);
    }
    return result;
  }
}

export const piiFilter = new PIIFilter();
```

```typescript
// src/storage/capacity-manager.ts
import { db } from './db';

const STORAGE_CONFIG = {
  SINGLE_RECORD_LIMIT: 500 * 1024,        // 500KB
  TOTAL_SOFT_LIMIT: 50 * 1024 * 1024,     // 50MB
  TOTAL_HARD_LIMIT: 100 * 1024 * 1024,    // 100MB
  WARNING_THRESHOLD: 0.8,
};

export class CapacityManager {
  async getUsage(): Promise<{ used: number; limit: number; percentage: number }> {
    const demands = await db.demands.toArray();
    const extractions = await db.extractions.toArray();

    const used =
      demands.reduce((sum, d) => sum + JSON.stringify(d).length, 0) +
      extractions.reduce((sum, e) => sum + JSON.stringify(e).length, 0);

    return {
      used,
      limit: STORAGE_CONFIG.TOTAL_SOFT_LIMIT,
      percentage: used / STORAGE_CONFIG.TOTAL_SOFT_LIMIT,
    };
  }

  async canStore(dataSize: number): Promise<{ allowed: boolean; warning?: string }> {
    const { used, percentage } = await this.getUsage();

    if (used + dataSize > STORAGE_CONFIG.TOTAL_HARD_LIMIT) {
      return {
        allowed: false,
        warning: '存储已满，请清理后继续'
      };
    }

    if (percentage >= STORAGE_CONFIG.WARNING_THRESHOLD) {
      return {
        allowed: true,
        warning: `存储空间即将用尽（${Math.round(percentage * 100)}%）`
      };
    }

    return { allowed: true };
  }

  truncateContent(text: string, maxLength: number = 20000): {
    text: string;
    truncated: boolean
  } {
    if (text.length <= maxLength) {
      return { text, truncated: false };
    }
    return { text: text.slice(0, maxLength), truncated: true };
  }
}

export const capacityManager = new CapacityManager();
```

#### 4.3.4 测试验收

- [ ] LLM 连接测试通过（3 个服务商）
- [ ] 解决方案提炼质量评分 ≥ 3.5
- [ ] IndexedDB 存储正常
- [ ] 容量管理工作正常

---

### 4.4 Week 4: 安全 + 打磨

#### 4.4.1 目标

安全机制完备，用户体验打磨

#### 4.4.2 任务分解

**Day 1: 站点白名单/黑名单**

```typescript
// src/content/site-filter.ts
export class SiteFilter {
  private whitelist: string[] = ['*.reddit.com', '*.zhihu.com'];
  private blacklist: string[] = ['*.bank.*', 'mail.*', '*.gov.*', '*/login*'];

  setConfig(whitelist: string[], blacklist: string[]) {
    this.whitelist = whitelist;
    this.blacklist = blacklist;
  }

  isAllowed(url: string): boolean {
    // 先检查黑名单
    if (this.matchPatterns(url, this.blacklist)) {
      return false;
    }
    // 再检查白名单
    return this.matchPatterns(url, this.whitelist);
  }

  private matchPatterns(url: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = this.patternToRegex(pattern);
      return regex.test(url);
    });
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(escaped, 'i');
  }
}
```

**Day 2: 错误处理优化**

```typescript
// src/background/error-handler.ts
export enum ErrorCode {
  API_KEY_NOT_CONFIGURED = 'E001',
  API_KEY_INVALID = 'E002',
  QUOTA_EXCEEDED = 'E003',
  NETWORK_ERROR = 'E004',
  EXTRACTION_FAILED = 'E005',
  PARSE_ERROR = 'E006',
  STORAGE_FULL = 'E007',
}

export const ERROR_MESSAGES: Record<ErrorCode, { title: string; action: string }> = {
  [ErrorCode.API_KEY_NOT_CONFIGURED]: {
    title: '请先配置 API Key',
    action: '前往设置',
  },
  [ErrorCode.API_KEY_INVALID]: {
    title: 'API Key 无效，请检查设置',
    action: '检查配置',
  },
  [ErrorCode.QUOTA_EXCEEDED]: {
    title: 'API 调用额度已用尽',
    action: '检查账户',
  },
  [ErrorCode.NETWORK_ERROR]: {
    title: '网络连接失败',
    action: '重试',
  },
  [ErrorCode.EXTRACTION_FAILED]: {
    title: '内容提取失败',
    action: '使用快速保存',
  },
  [ErrorCode.PARSE_ERROR]: {
    title: '分析结果异常',
    action: '重试',
  },
  [ErrorCode.STORAGE_FULL]: {
    title: '存储已满',
    action: '清理数据',
  },
};

export function classifyError(error: unknown): ErrorCode {
  if (error instanceof Response) {
    switch (error.status) {
      case 401: return ErrorCode.API_KEY_INVALID;
      case 429: return ErrorCode.QUOTA_EXCEEDED;
      default: return ErrorCode.NETWORK_ERROR;
    }
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorCode.NETWORK_ERROR;
  }
  return ErrorCode.PARSE_ERROR;
}
```

**Day 3: UI 细节打磨**

- [ ] 加载骨架屏
- [ ] 空状态设计
- [ ] Toast 通知
- [ ] 动画过渡

**Day 4: 埋点接入**

```typescript
// src/shared/analytics.ts
const EVENTS = {
  INSTALL: 'install',
  CONFIG_LLM: 'config_llm',
  FIRST_ANALYZE: 'first_analyze',
  ANALYZE: 'analyze',
  ANALYZE_FAIL: 'analyze_fail',
  QUICK_SAVE: 'quick_save',
  SAVE_DEMAND: 'save_demand',
  SEARCH: 'search',
  EXPORT: 'export',
  STORAGE_WARNING: 'storage_warning',
} as const;

class Analytics {
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  track(event: keyof typeof EVENTS, params?: Record<string, unknown>) {
    if (!this.enabled) return;

    // 简易埋点实现：存储到本地，定期上报
    const eventData = {
      event: EVENTS[event],
      timestamp: Date.now(),
      ...params,
    };

    // 存储到 chrome.storage.local
    chrome.storage.local.get(['analytics_queue'], (result) => {
      const queue = result.analytics_queue || [];
      queue.push(eventData);
      chrome.storage.local.set({ analytics_queue: queue });
    });
  }
}

export const analytics = new Analytics();
```

**Day 5: 性能优化**

- [ ] 虚拟列表（需求库）
- [ ] 防抖搜索
- [ ] 懒加载详情

#### 4.4.3 测试验收

- [ ] PII 过滤测试通过
- [ ] 白名单/黑名单工作正常
- [ ] 错误处理覆盖所有场景
- [ ] 埋点数据正确记录

---

### 4.5 Week 5: 测试 + 上架准备

#### 4.5.1 目标

提交 Chrome 商店审核

#### 4.5.2 任务分解

**Day 1-2: 集成测试**

```typescript
// tests/integration/analysis-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { llmService } from '@/background/llm';
import { demandRepo } from '@/storage/demand-repo';

describe('分析流程集成测试', () => {
  beforeEach(async () => {
    // 清理测试数据
    await demandRepo.deleteAll();
  });

  it('应该正确提取 Reddit 帖子内容', async () => {
    // 模拟 Reddit 页面 DOM
    // 执行提取
    // 验证结果结构
  });

  it('应该正确提取知乎问答内容', async () => {
    // ...
  });

  it('应该正确处理 LLM 分析结果', async () => {
    // ...
  });

  it('应该正确保存需求到数据库', async () => {
    // ...
  });
});
```

**Day 3: 性能测试**

```typescript
// tests/performance/benchmark.test.ts
describe('性能基准测试', () => {
  it('Side Panel 首次打开 < 500ms', async () => {
    // ...
  });

  it('内容提取 < 2s', async () => {
    // ...
  });

  it('需求库搜索（1000条）< 500ms', async () => {
    // ...
  });
});
```

**Day 4: 商店素材准备**

- [ ] 应用图标（128x128, 48x48, 16x16）
- [ ] 商店截图（1280x800 或 640x400）
- [ ] 应用描述（中英文）
- [ ] 隐私政策页面

**Day 5: 上架提交**

- [ ] 打包扩展（`npm run build`）
- [ ] Chrome Web Store 开发者账号
- [ ] 填写商店信息
- [ ] 提交审核

#### 4.5.3 测试验收

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 性能指标达标
- [ ] 商店审核提交

---

### 4.6 Week 6: 缓冲周

#### 4.6.1 用途

- 应对平台 DOM 变更
- 处理审核反馈
- 修复紧急 Bug
- 如无问题：预研 P1 功能

---

## 五、类型定义

### 5.1 核心类型

```typescript
// src/shared/types/extraction.ts
export interface Extraction {
  id: string;
  url: string;
  title: string;
  platform: 'reddit' | 'zhihu' | 'generic';
  originalText: string;
  summary: string;
  analysisStatus: 'completed' | 'pending' | 'failed';
  demandCount: number;
  savedDemandCount: number;
  truncated: boolean;
  truncatedFields?: string[];
  originalLength?: number;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// src/shared/types/demand.ts
export interface Demand {
  id: string;
  extractionId: string;

  solution: {
    title: string;
    description: string;
    targetUser: string;
    keyDifferentiators: string[];
  };

  validation: {
    painPoints: string[];
    competitors: string[];
    competitorGaps: string[];
    quotes: string[];
  };

  sourceUrl: string;
  sourceTitle: string;
  sourcePlatform: string;

  tags: string[];
  starred: boolean;
  archived: boolean;
  notes: string;

  groupId?: string;
  groupName?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// src/shared/types/messages.ts
export type MessageType =
  | 'EXTRACT_CONTENT'
  | 'CONTENT_EXTRACTED'
  | 'ANALYZE_CURRENT_PAGE'
  | 'QUICK_SAVE_CURRENT_PAGE'
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_CHUNK'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_ERROR'
  | 'QUICK_SAVE_COMPLETE'
  | 'QUICK_SAVE_ERROR'
  | 'SAVE_DEMANDS'
  | 'DELETE_DEMAND'
  | 'GET_DEMANDS'
  | 'TEST_LLM_CONNECTION'
  | 'GET_CONFIG'
  | 'UPDATE_CONFIG';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}
```

---

## 六、验收标准

### 6.1 功能验收

| 功能 | 验收标准 | 测试方法 |
|-----|---------|---------|
| Reddit 提取 | 30 页测试通过率 ≥ 90% | 手动测试 + 自动化 |
| 知乎提取 | 30 页测试通过率 ≥ 90% | 手动测试 + 自动化 |
| LLM 分析 | 质量评分 ≥ 3.5/5 | 人工评审 |
| 本地存储 | 正常读写，容量管理生效 | 自动化测试 |
| Side Panel | 打开 < 500ms | 性能测试 |

### 6.2 质量指标

| 指标 | 目标 |
|-----|------|
| 单元测试覆盖率 | ≥ 80% |
| 核心流程测试覆盖 | 100% |
| TypeScript 严格模式 | 启用 |
| ESLint 规则 | 零警告 |

### 6.3 上线标准

- [ ] 所有 P0 功能完成
- [ ] 所有测试通过
- [ ] 性能指标达标
- [ ] Chrome 商店审核通过

---

## 七、风险管理

| 风险 | 概率 | 影响 | 应对措施 |
|-----|-----|------|---------|
| 知乎反爬升级 | 中 | 高 | Week 0 验证，降级方案准备 |
| Reddit DOM 变更 | 高 | 中 | 适配器架构，快速修复机制 |
| LLM API 不稳定 | 中 | 中 | 多服务商支持，离线降级 |
| Chrome 审核被拒 | 中 | 高 | 研究政策，预留缓冲周 |
| 存储容量问题 | 低 | 中 | 容量管理，导出提醒 |

---

## 八、参考资料

### 8.1 官方文档

- [Chrome Extension MV3](https://developer.chrome.com/docs/extensions/mv3/)
- [Plasmo Framework](https://docs.plasmo.com/)
- [LangChain.js](https://js.langchain.com/)
- [Dexie.js](https://dexie.org/)

### 8.2 LangChain.js 关键用法

基于 2025-12 最新官方文档：

1. **ChatOpenAI 自定义 baseURL**：
   ```typescript
   new ChatOpenAI({
     configuration: { baseURL: "https://..." }
   })
   ```

2. **ChatGoogleGenerativeAI**：
   ```typescript
   new ChatGoogleGenerativeAI({
     model: "gemini-2.5-flash-lite"
   })
   ```

3. **结构化输出**：
   ```typescript
   model.withStructuredOutput(zodSchema)
   ```

4. **流式输出**：
   ```typescript
   for await (const chunk of model.stream(prompt)) {
     // 处理 chunk
   }
   ```

---

**文档结束**
