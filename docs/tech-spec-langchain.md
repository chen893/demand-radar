# Demand Radar 技术方案 (LangChain版本)

> 版本: 2.0
> 状态: 基于LangChain v1重构
> 分支: developer-m2
> 开发: m2

---

## 一、项目概述

### 1.1 项目目标
使用 LangChain 框架开发智能浏览器插件，通过 AI 智能提炼用户吐槽中的产品机会，构建个人解决方案知识库。

### 1.2 LangChain 技术架构总览

```
┌─────────────────────────────────────────────────────────┐
│                  Demand Radar (LangChain)               │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │   Content        │  │   Background     │             │
│  │   Scripts        │  │   Service        │             │
│  └──────────────────┘  └──────────────────┘             │
│                              │                           │
│  ┌──────────────────┐  ┌────▼──────────────────────────┐│
│  │   Extractor      │  │   LangChain Agent            ││
│  │   Tools          │  │  ┌──────────────────────────┐││
│  │  • Reddit        │  │  │  ┌────────────────────┐  │││
│  │  • 知乎          │  │  │  │  ContentExtractor  │  │││
│  │  • Generic       │  │  │  │  Tool              │  │││
│  └──────────────────┘  │  │  └────────────────────┘  │││
│         │              │  │  ┌────────────────────┐  │││
│         ▼              │  │  │  SolutionRefiner   │  │││
│  ┌──────────────────┐  │  │  │  Tool              │  │││
│  │   Extracted      │  │  │  └────────────────────┘  │││
│  │   Content        │  │  │  ┌────────────────────┐  │││
│  └──────────────────┘  │  │  │  Deduplication     │  │││
│                        │  │  │  Tool              │  │││
│                        │  │  └────────────────────┘  │││
│                        │  │  ┌────────────────────┐  │││
│                        │  │  │  StorageTool       │  │││
│                        │  │  └────────────────────┘  │││
│                        │  └──────────────────────────┘││
│                        │              │               ││
│                        │              ▼               ││
│                        │  ┌──────────────────────────┐││
│                        │  │   LangChain Chains       │││
│                        │  │  ┌────────────────────┐  │││
│                        │  │  │  RefinementChain   │  │││
│                        │  │  └────────────────────┘  │││
│                        │  │  ┌────────────────────┐  │││
│                        │  │  │  DeduplicationChain│  │││
│                        │  │  └────────────────────┘  │││
│                        │  └──────────────────────────┘││
│                        └──────────────────────────────┘│
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │   Side Panel     │  │   LangSmith      │             │
│  │   (React UI)     │  │   Monitoring     │             │
│  └──────────────────┘  └──────────────────┘             │
├─────────────────────────────────────────────────────────┤
│              IndexedDB (Dexie.js)                       │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │   Extractions    │  │   Solutions      │             │
│  └──────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## 二、LangChain 技术栈选型

### 2.1 核心技术栈

| 层级 | 技术选型 | 版本 | 理由 |
|-----|---------|------|-----|
| **插件框架** | Plasmo | latest | 现代化HMR、React原生支持 |
| **LangChain** | langchain | 0.3.x | 标准模型接口、多模型支持、Agent系统 |
| **LangGraph** | @langchain/langgraph | 0.3.x | 高级编排、持久化、流式支持 |
| **LangSmith** | @langchain/langsmith | latest | 监控、调试、可视化追踪 |
| **UI框架** | React | 18.x | 组件化、生态成熟 |
| **样式方案** | Tailwind CSS | 3.x | 原子化CSS、快速开发 |
| **状态管理** | Zustand | latest | 轻量级、API简洁 |
| **本地存储** | Dexie.js | 3.x | IndexedDB封装、Promise API |
| **搜索优化** | FlexSearch | latest | 高性能全文搜索 |

### 2.2 LangChain 多模型支持

```typescript
// src/background/llm/config.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatDeepSeek } from "@langchain/deepseek";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

interface ModelConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'custom';
  modelName: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  baseUrl?: string;
}

class LLMManager {
  private models = new Map<string, BaseChatModel>();

  async createModel(config: ModelConfig): Promise<BaseChatModel> {
    const modelKey = `${config.provider}-${config.modelName}`;

    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    let model: BaseChatModel;

    switch (config.provider) {
      case 'openai':
        model = new ChatOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
          model: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
        break;

      case 'google':
        model = new ChatGoogleGenerativeAI({
          apiKey: config.apiKey,
          model: config.modelName,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        });
        break;

      case 'deepseek':
        model = new ChatDeepSeek({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
          model: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.models.set(modelKey, model);
    return model;
  }

  async getModel(provider: string, modelName: string): Promise<BaseChatModel> {
    const modelKey = `${provider}-${modelName}`;
    const model = this.models.get(modelKey);

    if (!model) {
      throw new Error(`Model ${modelKey} not found. Call createModel first.`);
    }

    return model;
  }
}

export const llmManager = new LLMManager();
```

---

## 三、LangChain 项目结构设计

### 3.1 目录结构

```
demand-radar/
├── .plasmorc.ts              # Plasmo配置
├── package.json
├── tsconfig.json
│
├── src/
│   ├── background/           # 后台服务
│   │   ├── index.ts          # Service Worker入口
│   │   │
│   │   ├── langchain/        # LangChain核心
│   │   │   ├── agents/       # Agent定义
│   │   │   │   ├── SolutionAgent.ts
│   │   │   │   └── DeduplicationAgent.ts
│   │   │   │
│   │   │   ├── chains/       # Chain定义
│   │   │   │   ├── RefinementChain.ts
│   │   │   │   └── DeduplicationChain.ts
│   │   │   │
│   │   │   ├── tools/        # Tools定义
│   │   │   │   ├── ContentExtractorTool.ts
│   │   │   │   ├── SolutionRefinerTool.ts
│   │   │   │   ├── DeduplicationTool.ts
│   │   │   │   └── StorageTool.ts
│   │   │   │
│   │   │   ├── prompts/      # Prompt模板
│   │   │   │   ├── system.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── refinement.ts
│   │   │   │
│   │   │   └── models/       # 模型配置
│   │   │       ├── config.ts
│   │   │       └── manager.ts
│   │   │
│   │   ├── db/               # 数据库层
│   │   │   ├── schema.ts
│   │   │   ├── migrations.ts
│   │   │   └── operations.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── storage.ts
│   │   │   ├── logger.ts
│   │   │   └── langsmith.ts  # LangSmith配置
│   │   │
│   │   └── config.ts
│   │
│   ├── content-scripts/      # 内容脚本
│   │   ├── reddit.ts
│   │   ├── zhihu.ts
│   │   ├── generic.ts
│   │   └── shared/
│   │       ├── selectors.ts
│   │       └── utils.ts
│   │
│   ├── components/           # React组件
│   │   ├── sidepanel/
│   │   │   ├── RefineView.tsx
│   │   │   ├── SolutionList.tsx
│   │   │   ├── SolutionDetail.tsx
│   │   │   ├── Deduplication.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Tag.tsx
│   │   │
│   │   └── layout/
│   │       ├── SidePanel.tsx
│   │       └── Header.tsx
│   │
│   ├── hooks/               # 自定义Hooks
│   │   ├── useLangChain.ts  # LangChain Hook
│   │   ├── useAgent.ts      # Agent Hook
│   │   ├── useChain.ts      # Chain Hook
│   │   └── useSolutions.ts
│   │
│   ├── store/               # 状态管理
│   │   ├── extractionStore.ts
│   │   ├── solutionStore.ts
│   │   ├── settingsStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/               # 类型定义
│   │   ├── extraction.ts
│   │   ├── solution.ts
│   │   ├── agent.ts         # Agent相关类型
│   │   ├── chain.ts         # Chain相关类型
│   │   └── tool.ts          # Tool相关类型
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── validation.ts
│   │
│   ├── assets/
│   └── styles/
│
└── docs/
    ├── langchain-guide.md
    └── langsmith-setup.md
```

---

## 四、LangChain Agent 设计

### 4.1 SolutionRefinerAgent

#### 4.1.1 Agent 定义

```typescript
// src/background/langchain/agents/SolutionAgent.ts
import { createAgent } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { BaseTool } from "@langchain/core/tools";

import { ContentExtractorTool } from "../tools/ContentExtractorTool";
import { SolutionRefinerTool } from "../tools/SolutionRefinerTool";
import { StorageTool } from "../tools/StorageTool";
import { SYSTEM_PROMPT } from "../prompts/system";

const SolutionSchema = z.object({
  solutions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    targetUser: z.string(),
    keyDifferentiators: z.array(z.string()),
    validation: z.object({
      painPoints: z.array(z.string()),
      competitors: z.array(z.string()),
      competitorGaps: z.array(z.string()),
      quotes: z.array(z.string()),
    }),
  })),
});

export async function createSolutionAgent(model: ChatOpenAI): Promise<any> {
  // 创建工具
  const contentExtractor = new ContentExtractorTool();
  const solutionRefiner = new SolutionRefinerTool();
  const storageTool = new StorageTool();

  const tools: BaseTool[] = [
    contentExtractor,
    solutionRefiner,
    storageTool,
  ];

  // 创建Agent
  const agent = await createAgent({
    model,
    tools,
    systemMessage: SYSTEM_PROMPT,
    stateSchema: z.object({
      url: z.string().optional(),
      extractedContent: z.string().optional(),
      solutions: z.array(z.any()).optional(),
      error: z.string().optional(),
    }),
  });

  return agent;
}
```

#### 4.1.2 Tool 定义

```typescript
// src/background/langchain/tools/ContentExtractorTool.ts
import { DynamicTool } from "@langchain/core/tools";
import type { ExtractionResult } from "../../../types/extraction";

export class ContentExtractorTool extends DynamicTool {
  constructor() {
    super({
      name: "extract_content",
      description: `
        Extract content from current webpage.
        Returns the page title, URL, and main content.
      `,
      func: async (input: string): Promise<string> => {
        try {
          // 发送消息给content script
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

          if (!tab?.id) {
            throw new Error("No active tab found");
          }

          const result = await chrome.tabs.sendMessage(tab.id, {
            type: "EXTRACT_CONTENT",
          });

          if (!result?.success) {
            throw new Error(result?.error || "Content extraction failed");
          }

          const extraction: ExtractionResult = result.data;

          return JSON.stringify({
            url: extraction.url,
            title: extraction.title,
            platform: extraction.platform,
            content: extraction.originalText,
            metadata: extraction.metadata,
          });
        } catch (error) {
          return JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    });
  }
}
```

```typescript
// src/background/langchain/tools/SolutionRefinerTool.ts
import { DynamicTool } from "@langchain/core/tools";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

export class SolutionRefinerTool extends DynamicTool {
  constructor() {
    super({
      name: "refine_solutions",
      description: `
        Use LLM to refine extracted content into actionable product solutions.
        Input should be the extracted content from a webpage.
        Returns 2-3 product opportunities with validation evidence.
      `,
      func: async (input: string): Promise<string> => {
        try {
          const { content } = JSON.parse(input);

          if (!content) {
            throw new Error("No content provided for refinement");
          }

          // 使用RunnableSequence构建处理流程
          const chain = RunnableSequence.from([
            ChatPromptTemplate.fromMessages([
              ["system", SYSTEM_PROMPT],
              ["human", USER_PROMPT],
            ]),
            this.model,
            new JsonOutputParser(),
          ]);

          const result = await chain.invoke({
            content,
          });

          return JSON.stringify({
            success: true,
            solutions: result.solutions,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    });
  }

  private model: any;

  setModel(model: any) {
    this.model = model;
  }
}
```

```typescript
// src/background/langchain/tools/StorageTool.ts
import { DynamicTool } from "@langchain/core/tools";
import { db } from "../../db/schema";
import { generateUUID } from "../../utils/helpers";

export class StorageTool extends DynamicTool {
  constructor() {
    super({
      name: "save_solutions",
      description: `
        Save refined solutions to local database.
        Input should be a JSON object with solutions array.
      `,
      func: async (input: string): Promise<string> => {
        try {
          const { extractionId, solutions } = JSON.parse(input);

          if (!extractionId || !solutions || !Array.isArray(solutions)) {
            throw new Error("Invalid input: extractionId and solutions array required");
          }

          // 获取提取记录
          const extraction = await db.extractions.get(extractionId);
          if (!extraction) {
            throw new Error(`Extraction ${extractionId} not found`);
          }

          // 保存方案
          const savedSolutions = [];
          for (const solution of solutions) {
            const newSolution = {
              id: generateUUID(),
              extractionId,
              solution: solution.solution,
              validation: solution.validation,
              sourceUrl: extraction.url,
              sourceTitle: extraction.title,
              sourcePlatform: extraction.platform,
              tags: [],
              starred: false,
              archived: false,
              notes: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await db.solutions.add(newSolution);
            savedSolutions.push(newSolution.id);
          }

          // 更新提取记录
          await db.extractions.update(extractionId, {
            analysisStatus: 'completed',
            solutionCount: solutions.length,
            savedSolutionCount: savedSolutions.length,
            updatedAt: new Date(),
          });

          return JSON.stringify({
            success: true,
            savedCount: savedSolutions.length,
            solutionIds: savedSolutions,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    });
  }
}
```

### 4.2 DeduplicationAgent

```typescript
// src/background/langchain/agents/DeduplicationAgent.ts
import { createAgent } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { BaseTool } from "@langchain/core/tools";
import { DynamicTool } from "@langchain/core/tools";

import { DeduplicationChain } from "../chains/DeduplicationChain";

export async function createDeduplicationAgent(
  model: ChatOpenAI
): Promise<any> {
  // 自定义去重工具
  const deduplicationTool = new DynamicTool({
    name: "analyze_duplicates",
    description: `
      Analyze and group duplicate solutions.
      Input: array of solutions to analyze
      Output: grouped solutions with suggested names
    `,
    func: async (input: string): Promise<string> => {
      const { solutions } = JSON.parse(input);

      if (!solutions || !Array.isArray(solutions)) {
        throw new Error("Invalid input: solutions array required");
      }

      // 使用DeduplicationChain
      const chain = new DeduplicationChain();
      const result = await chain.invoke(solutions);

      return JSON.stringify(result);
    },
  });

  const tools: BaseTool[] = [
    deduplicationTool,
  ];

  // 创建Agent
  const agent = await createAgent({
    model,
    tools,
    systemMessage: DEDUPLICATION_SYSTEM_PROMPT,
    stateSchema: z.object({
      solutions: z.array(z.any()),
      groups: z.array(z.object({
        groupId: z.string(),
        suggestedName: z.string(),
        solutionIds: z.array(z.string()),
        reason: z.string(),
      })).optional(),
      uniqueSolutions: z.array(z.string()).optional(),
    }),
  });

  return agent;
}
```

---

## 五、LangChain Chains 设计

### 5.1 RefinementChain

```typescript
// src/background/langchain/chains/RefinementChain.ts
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

import { SYSTEM_PROMPT } from "../prompts/system";
import { USER_PROMPT_TEMPLATE } from "../prompts/user";

// 定义输出格式
const SolutionSchema = z.object({
  solutions: z.array(z.object({
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
  })),
});

export class RefinementChain {
  private chain: RunnableSequence;

  constructor(model: ChatOpenAI) {
    // 使用StructuredOutputParser确保输出格式正确
    const parser = StructuredOutputParser.fromZodSchema(SolutionSchema);

    this.chain = RunnableSequence.from([
      ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_PROMPT],
        ["human", USER_PROMPT_TEMPLATE],
      ]),
      model.bind({
        // 配置模型参数
        temperature: 0.7,
        maxTokens: 2000,
      }),
      parser,
    ]);
  }

  async invoke(input: { content: string; metadata?: any }): Promise<any> {
    try {
      const result = await this.chain.invoke({
        content: input.content,
        ...input.metadata,
      });

      return {
        success: true,
        solutions: result.solutions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // 流式调用
  async *stream(input: { content: string; metadata?: any }): AsyncGenerator<string> {
    const stream = await this.chain.stream({
      content: input.content,
      ...input.metadata,
    });

    for await (const chunk of stream) {
      yield chunk.content;
    }
  }
}
```

### 5.2 DeduplicationChain

```typescript
// src/background/langchain/chains/DeduplicationChain.ts
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { DEDUPLICATION_PROMPT } from "../prompts/deduplication";

export class DeduplicationChain {
  private chain: RunnableSequence;

  constructor(model: ChatOpenAI) {
    this.chain = RunnableSequence.from([
      ChatPromptTemplate.fromMessages([
        ["system", DEDUPLICATION_PROMPT],
        ["human", "{solutions}"],
      ]),
      model.bind({
        temperature: 0.3, // 去重需要更低的温度
        maxTokens: 1500,
      }),
    ]);
  }

  async invoke(solutions: any[]): Promise<any> {
    const result = await this.chain.invoke({
      solutions: JSON.stringify(solutions, null, 2),
    });

    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(result.content);
      return parsed;
    } catch (error) {
      // 如果解析失败，尝试提取JSON部分
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Failed to parse deduplication result");
    }
  }
}
```

---

## 六、Prompt 工程

### 6.1 系统提示词

```typescript
// src/background/langchain/prompts/system.ts
export const SYSTEM_PROMPT = `
你是一个资深产品经理，擅长从用户吐槽中提炼可执行的产品方案。

你的任务是分析给定的网页内容，提炼出2-3个潜在的产品机会。

每个产品机会必须包含：

1. 解决方案 (Solution)
   - title: 产品名或一句话描述
   - description: 详细描述（2-3句）
   - targetUser: 目标用户群体
   - keyDifferentiators: 核心差异点（3-5个）

2. 验证依据 (Validation)
   - painPoints: 用户痛点（原文摘录）
   - competitors: 相关竞品名称
   - competitorGaps: 竞品不足之处
   - quotes: 原文证据（3-5个关键摘录）

输出要求：
- 只提炼有明确产品方向的机会，避免空洞概念
- 差异点必须基于竞品不足，来源可靠
- 每个方案至少包含2个原文证据
- 输出结果必须严格符合JSON格式
- 如果内容不足以提炼方案，返回空数组

你必须严格遵循JSON格式，不要包含任何额外的文本。
`;
```

### 6.2 用户提示词模板

```typescript
// src/background/langchain/prompts/user.ts
export const USER_PROMPT_TEMPLATE = `
请分析以下网页内容：

标题：{title}
URL：{url}
平台：{platform}

内容：
{content}

请按以下JSON格式输出：
{
  "solutions": [
    {
      "solution": {
        "title": "产品名/一句话描述",
        "description": "详细描述（2-3句）",
        "targetUser": "目标用户",
        "keyDifferentiators": ["差异点1", "差异点2", "差异点3"]
      },
      "validation": {
        "painPoints": ["痛点1", "痛点2"],
        "competitors": ["竞品1", "竞品2"],
        "competitorGaps": ["不足1", "不足2"],
        "quotes": ["证据1", "证据2", "证据3"]
      }
    }
  ]
}
`;
```

### 6.3 去重提示词

```typescript
// src/background/langchain/prompts/deduplication.ts
export const DEDUPLICATION_PROMPT = `
你是一个数据分析专家，擅长识别相似的产品方案并对它们进行分组。

给定一组产品方案，你需要：
1. 分析每个方案的核心内容
2. 识别相似的方案（相似度阈值 > 0.75）
3. 为每组方案生成一个统一的组名
4. 解释为什么这些方案被归为一组

输出格式（严格JSON）：
{
  "groups": [
    {
      "groupId": "组ID",
      "suggestedName": "简洁的组名（3-6个字）",
      "solutionIds": ["方案1 ID", "方案2 ID"],
      "reason": "为什么认为它们是同一方案",
      "similarity": 0.85  // 相似度分数
    }
  ],
  "uniqueSolutions": ["独立方案ID列表"]
}

要求：
- 只将真正相似的方案分组
- 组名要简洁明确
- 原因要具体说明相似性
- 如果所有方案都不同，返回空的groups数组
`;
```

---

## 七、LangSmith 监控与调试

### 7.1 LangSmith 配置

```typescript
// src/background/utils/langsmith.ts
import { Client } from "@langchain/langsmith";

const client = new Client({
  apiUrl: process.env.LANGSMITH_API_URL || "https://api.smith.langchain.com",
  apiKey: process.env.LANGSMITH_API_KEY,
});

// 配置全局追踪
export function setupLangSmith() {
  // 追踪所有LangChain调用
  client.trace({
    project_name: "demand-radar",
    run_type: "chain",
  });

  return client;
}

// 追踪特定操作
export async function traceOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const run = client.trace({
    name: operationName,
    run_type: "chain",
  });

  try {
    const result = await operation();
    run.end({
      outputs: result,
    });
    return result;
  } catch (error) {
    run.end({
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// 追踪Agent调用
export async function traceAgentCall(
  agentName: string,
  input: any
): Promise<any> {
  const run = client.trace({
    name: agentName,
    run_type: "agent",
    inputs: input,
  });

  return {
    onToolCall: async (toolName: string, toolInput: any) => {
      client.addEvent(run.id, {
        name: "tool_call",
        data: {
          tool: toolName,
          input: toolInput,
        },
      });
    },
    onToolResult: async (toolName: string, result: any) => {
      client.addEvent(run.id, {
        name: "tool_result",
        data: {
          tool: toolName,
          result,
        },
      });
    },
    end: (output: any) => {
      run.end({
        outputs: output,
      });
    },
  };
}
```

### 7.2 在Agent中使用LangSmith

```typescript
// src/background/langchain/agents/SolutionAgent.ts (修改版)
import { createAgent } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { setupLangSmith, traceOperation } from "../../utils/langsmith";

export async function createSolutionAgent(model: ChatOpenAI): Promise<any> {
  const client = setupLangSmith();

  const agent = await createAgent({
    model,
    tools,
    systemMessage: SYSTEM_PROMPT,
    stateSchema: z.object({
      url: z.string().optional(),
      extractedContent: z.string().optional(),
      solutions: z.array(z.any()).optional(),
      error: z.string().optional(),
    }),
  });

  // 包装agent以添加追踪
  const tracedAgent = {
    async invoke(input: any) {
      return traceOperation("SolutionAgent.invoke", async () => {
        const run = client.trace({
          name: "SolutionRefinement",
          run_type: "agent",
          inputs: input,
        });

        try {
          const result = await agent.invoke(input);
          run.end({ outputs: result });
          return result;
        } catch (error) {
          run.end({ error: String(error) });
          throw error;
        }
      });
    },

    async stream(input: any) {
      const run = client.trace({
        name: "SolutionRefinement.stream",
        run_type: "agent",
        inputs: input,
      });

      try {
        const stream = await agent.stream(input);
        for await (const chunk of stream) {
          run.addEvent({
            name: "stream_chunk",
            data: chunk,
          });
          yield chunk;
        }
        run.end();
      } catch (error) {
        run.end({ error: String(error) });
        throw error;
      }
    },
  };

  return tracedAgent;
}
```

---

## 八、React 组件集成

### 8.1 LangChain Hook

```typescript
// src/hooks/useLangChain.ts
import { useState, useCallback } from "react";
import { ChatOpenAI } from "@langchain/openai";

export function useLangChain() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAgent = useCallback(async (config: {
    provider: string;
    modelName: string;
    apiKey: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const model = new ChatOpenAI({
        apiKey: config.apiKey,
        model: config.modelName,
        temperature: 0.7,
      });

      const agent = await createSolutionAgent(model);

      setIsLoading(false);
      return agent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  return {
    createAgent,
    isLoading,
    error,
  };
}
```

### 8.2 提炼视图组件

```typescript
// src/components/sidepanel/RefineView.tsx
import React, { useState } from "react";
import { useLangChain } from "../../hooks/useLangChain";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";

export const RefineView: React.FC = () => {
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const { createAgent, isLoading } = useLangChain();

  const handleRefine = async () => {
    setIsExtracting(true);

    try {
      // 创建Agent
      const agent = await createAgent({
        provider: "openai",
        modelName: "gpt-4o-mini",
        apiKey: "your-api-key", // 从设置中获取
      });

      // 调用Agent
      const result = await agent.invoke({
        messages: [
          {
            role: "user",
            content: "Please extract and refine content from current page",
          },
        ],
      });

      setExtractionResult(result.extractedContent);
      setSolutions(result.solutions);
    } catch (error) {
      console.error("Refinement failed:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 页面信息 */}
      <div className="p-4 border-b">
        <h3 className="font-medium text-gray-900">📄 当前页面</h3>
        <div className="mt-2">
          <Button onClick={handleRefine} disabled={isExtracting}>
            {isExtracting ? "🔄 提炼中..." : "🔍 提炼此页面"}
          </Button>
        </div>
      </div>

      {/* 加载状态 */}
      {isExtracting && (
        <div className="p-4">
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {/* 提炼结果 */}
      {solutions.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="font-medium text-gray-900 mb-4">
            💡 发现 {solutions.length} 个产品机会
          </h4>
          <SolutionCards solutions={solutions} />
        </div>
      )}
    </div>
  );
};
```

---

## 九、性能优化与缓存

### 9.1 缓存策略

```typescript
// src/background/utils/cache.ts
import { LRUCache } from "lru-cache";

interface CacheConfig {
  maxSize: number;        // 最大条目数
  ttl: number;           // 生存时间（毫秒）
}

class LangChainCache {
  private cache: LRUCache<string, any>;

  constructor(config: CacheConfig) {
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl,
    });
  }

  get(key: string): any | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 创建不同用途的缓存
export const extractionCache = new LangChainCache({
  maxSize: 100,
  ttl: 1000 * 60 * 60, // 1小时
});

export const solutionCache = new LangChainCache({
  maxSize: 500,
  ttl: 1000 * 60 * 60 * 24, // 24小时
});

export const embeddingCache = new LangChainCache({
  maxSize: 1000,
  ttl: 1000 * 60 * 60 * 24 * 7, // 7天
});
```

### 9.2 批量处理优化

```typescript
// src/background/utils/batch.ts
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private batchSize: number;
  private delay: number;
  private processor: (batch: T[]) => Promise<R[]>;
  private timeoutId?: NodeJS.Timeout;

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10,
    delay: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  async add(item: T): Promise<R | null> {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      return this.processBatch();
    }

    // 设置延迟处理
    this.timeoutId && clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.processBatch();
    }, this.delay);

    return null;
  }

  private async processBatch(): Promise<R> {
    if (this.batch.length === 0) {
      throw new Error("Batch is empty");
    }

    const batch = [...this.batch];
    this.batch = [];

    const results = await this.processor(batch);

    // 返回最后一个结果
    return results[results.length - 1];
  }

  async flush(): Promise<R[]> {
    if (this.batch.length === 0) {
      return [];
    }

    const batch = [...this.batch];
    this.batch = [];
    return this.processor(batch);
  }
}

// 使用示例
const deduplicationBatch = new BatchProcessor(
  async (solutions: Solution[]) => {
    const agent = await createDeduplicationAgent(model);
    const result = await agent.invoke({ solutions });
    return result.groups;
  },
  5, // 批量大小
  2000 // 2秒延迟
);
```

---

## 十、测试策略

### 10.1 LangChain 测试

```typescript
// src/__tests__/langchain/agent.test.ts
import { describe, it, expect, vi } from "vitest";
import { createSolutionAgent } from "../../background/langchain/agents/SolutionAgent";
import { ChatOpenAI } from "@langchain/openai";

describe("SolutionAgent", () => {
  it("should extract and refine content", async () => {
    const model = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        solutions: [
          {
            solution: {
              title: "Test Product",
              description: "Test description",
              targetUser: "Test users",
              keyDifferentiators: ["Diff 1", "Diff 2"],
            },
            validation: {
              painPoints: ["Pain 1"],
              competitors: ["Comp 1"],
              competitorGaps: ["Gap 1"],
              quotes: ["Quote 1"],
            },
          },
        ],
      }),
    });

    const agent = await createSolutionAgent(model as ChatOpenAI);
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: "Test content",
        },
      ],
    });

    expect(result.solutions).toHaveLength(1);
    expect(result.solutions[0].solution.title).toBe("Test Product");
  });

  it("should handle errors gracefully", async () => {
    const model = vi.fn().mockRejectedValue(new Error("API Error"));

    const agent = await createSolutionAgent(model as ChatOpenAI);

    await expect(
      agent.invoke({
        messages: [{ role: "user", content: "Test" }],
      })
    ).rejects.toThrow("API Error");
  });
});
```

### 10.2 集成测试

```typescript
// src/__tests__/integration/full-pipeline.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createSolutionAgent } from "../../background/langchain/agents/SolutionAgent";
import { createDeduplicationAgent } from "../../background/langchain/agents/DeduplicationAgent";
import { setupTestDB } from "../utils/test-db";

describe("Full Pipeline", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  it("should complete full extraction to storage flow", async () => {
    // 1. 创建Agent
    const agent = await createSolutionAgent(model);
    const deduplicationAgent = await createDeduplicationAgent(model);

    // 2. 模拟网页内容
    const mockContent = `
      Reddit Post: Why is there no good PDF tool?

      Users are frustrated with existing PDF tools:
      - Too expensive ($20/mo)
      - Privacy concerns with online tools
      - Features too complex

      Comments suggest need for:
      - Local processing
      - One-time purchase
      - Simple interface
    `;

    // 3. 执行提炼
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: mockContent,
        },
      ],
    });

    // 4. 验证结果
    expect(result.solutions).toHaveLength(2);
    expect(result.solutions[0].solution.title).toBeDefined();
    expect(result.solutions[0].validation.quotes).toHaveLength(3);

    // 5. 保存到数据库
    const saveResult = await storageTool.invoke({
      extractionId: result.extractionId,
      solutions: result.solutions,
    });

    expect(JSON.parse(saveResult).success).toBe(true);
  });
});
```

---

## 十一、部署与监控

### 11.1 环境配置

```bash
# .env.production
LANGSMITH_API_KEY=your_langsmith_api_key
LANGSMITH_PROJECT_NAME=demand-radar
LANGSMITH_TRACING=true

# LLM配置
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
DEEPSEEK_API_KEY=your_deepseek_key

# 向量存储
VECTOR_STORE_PATH=./data/vectorstore
EMBEDDING_MODEL=text-embedding-3-small

# 性能配置
CACHE_TTL=3600000
BATCH_SIZE=10
MAX_CONCURRENT_REQUESTS=5
```

### 11.2 性能监控

```typescript
// src/background/utils/metrics.ts
import { Client } from "@langchain/langsmith";

interface Metrics {
  extractionTime: number;
  refinementTime: number;
  totalTime: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  error?: string;
}

class MetricsCollector {
  private metrics: Metrics[] = [];
  private client: Client;

  constructor() {
    this.client = new Client({
      apiUrl: process.env.LANGSMITH_API_URL,
      apiKey: process.env.LANGSMITH_API_KEY,
    });
  }

  async recordMetrics(metrics: Metrics) {
    this.metrics.push(metrics);

    // 发送到LangSmith
    await this.client.createRun({
      name: "demand_radar_metrics",
      run_type: "chain",
      inputs: metrics,
    });

    // 计算统计信息
    this.calculateStats();
  }

  private calculateStats() {
    const total = this.metrics.length;
    const avgExtractionTime =
      this.metrics.reduce((sum, m) => sum + m.extractionTime, 0) / total;
    const avgRefinementTime =
      this.metrics.reduce((sum, m) => sum + m.refinementTime, 0) / total;

    console.log("Performance Metrics:");
    console.log(`- Total operations: ${total}`);
    console.log(`- Avg extraction time: ${avgExtractionTime}ms`);
    console.log(`- Avg refinement time: ${avgRefinementTime}ms`);
  }
}

export const metricsCollector = new MetricsCollector();
```

---

## 十二、代码质量保障

### 12.1 ESLint 配置

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": [
    "@typescript-eslint",
    "react-hooks",
    "react-refresh"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always"
      }
    ]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### 12.2 Prettier 配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 12.3 Husky + lint-staged 配置

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

```json
{
  "hooks": {
    "pre-commit": "lint-staged",
    "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
  }
}
```

### 12.4 Commitlint 配置

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "test",
        "chore",
        "revert"
      ]
    ],
    "subject-case": [0],
    "header-min-length": [2, "always", 10],
    "header-max-length": [2, "always", 100]
  }
}
```

---

## 十三、LangChain 最佳实践

### 13.1 错误处理

```typescript
// src/background/utils/error-handler.ts
import { BaseMessage } from "@langchain/core/messages";

export class LangChainErrorHandler {
  static async handleAgentError(
    error: unknown,
    context: string
  ): Promise<{ success: boolean; error: string; fallback?: any }> {
    console.error(`LangChain Agent Error in ${context}:`, error);

    if (error instanceof Error) {
      // 根据错误类型返回不同的处理策略
      switch (error.name) {
        case "RateLimitError":
          return {
            success: false,
            error: "API调用频率限制，请稍后重试",
            fallback: { type: "rate_limit", retryAfter: 60 },
          };

        case "AuthenticationError":
          return {
            success: false,
            error: "API认证失败，请检查API Key",
            fallback: { type: "auth_error" },
          };

        case "TimeoutError":
          return {
            success: false,
            error: "请求超时，已切换到离线模式",
            fallback: { type: "timeout", useOfflineMode: true },
          };

        default:
          return {
            success: false,
            error: `处理失败: ${error.message}`,
            fallback: { type: "unknown_error" },
          };
      }
    }

    return {
      success: false,
      error: "未知错误",
      fallback: { type: "unknown_error" },
    };
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed:`, error);

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError;
  }
}
```

### 13.2 流式处理

```typescript
// src/background/utils/streaming.ts
import { Runnable } from "@langchain/core/runnables";

export class StreamingHandler {
  static async streamToResponse(
    stream: AsyncIterable<string>,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      for await (const chunk of stream) {
        onChunk(chunk);
      }
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  static createReadableStream(
    stream: AsyncIterable<string>
  ): ReadableStream {
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
```

---

## 十四、总结

### 14.1 LangChain 架构优势

1. **标准化模型接口**
   - 统一的多模型支持 (OpenAI/Google/DeepSeek)
   - 无缝切换不同模型提供商
   - 避免供应商锁定

2. **Agent 系统**
   - 预构建 Agent 架构
   - 灵活的工具系统
   - 智能决策能力

3. **Chain 和 Runnable**
   - 声明式工作流
   - 可组合的处理流程
   - 内置流式支持

4. **LangSmith 监控**
   - 可视化执行追踪
   - 性能指标收集
   - 调试和优化支持

5. **LangGraph 编排**
   - 高级工作流控制
   - 持久化状态管理
   - 并行处理支持

### 14.2 关键技术决策

- **全文搜索**: FlexSearch高性能搜索
- **缓存策略**: LRU缓存 + TTL，减少重复计算
- **批量处理**: 优化API调用，降低成本
- **错误处理**: 多层降级策略，保证可用性

### 14.3 开发优势

- **开发效率**: 预构建组件，快速搭建
- **调试能力**: LangSmith可视化追踪
- **扩展性**: 插件化工具，易于添加新功能
- **可维护性**: 清晰的分层架构
- **测试友好**: 内置测试工具和最佳实践

---

**文档版本**: v2.0 (LangChain版本，无向量模型)
**基于**: LangChain v0.3 + LangGraph
**最后更新**: 2025-12-09
**作者**: m2 (developer-m2分支)
