# Demand Radar v2.1 实施计划

> 版本: 2.1
> 创建日期: 2025-12-11
> 基于文档: PRD 2.1 + TDD 2.1
> 状态: 待执行

---

## 一、迭代概述

### 1.1 迭代目标

本迭代（代号：**多任务 + 规模化**）解决 4 个核心问题：

| 目标 | 描述 | 成功标准 |
|-----|------|---------|
| **体验修复** | 分析任务不因页面切换而丢失 | 切换页面后分析继续完成 |
| **效率提升** | 支持批量分析待分析内容 | 一次操作处理多个内容 |
| **来源扩展** | 新增 Twitter/X 平台支持 | 可从 Twitter 提取需求信号 |
| **模式发现** | 从积累的需求中发现重复模式 | 自动识别相似需求 |

### 1.2 里程碑定义

```
M1: 分析任务独立化 ──▶ M2: 批量分析 ──▶ M3: Twitter适配 ──▶ M4: 需求去重 ──▶ M5: 测试发布
     (基础设施)          (依赖M1)         (可并行)          (依赖数据)
```

| 里程碑 | 完成标准 | 依赖 |
|-------|---------|------|
| M1 | 页面切换不丢失分析，指示器正常工作 | 无 |
| M2 | 可批量分析待处理内容，进度正确显示 | M1 |
| M3 | Twitter 页面可正常提取和分析 | 无（可与M2并行） |
| M4 | 可分析重复需求并合并分组 | M1, M2 |
| M5 | 全部功能测试通过，可发布 | M1-M4 |

---

## 二、技术变更摘要

### 2.1 核心架构变更

**状态管理重构**：

```
v2.0 结构                    v2.1 结构
────────────                 ────────────
useAnalysisStore             useAnalysisStore
├── pageInfo       ──▶       ├── currentPage     ← 仅页面信息
├── status                   ├── tasks[]         ← 任务队列（新增）
├── demands[]                ├── activeTaskId    ← 当前查看任务
└── ...                      └── indicatorExpanded

                             useDemandsStore（扩展）
                             ├── groups[]        ← 需求分组（新增）
                             └── lastDedupAt     ← 上次去重时间
```

### 2.2 新增数据模型

**AnalysisTask**（内存存储，不持久化）：
```typescript
interface AnalysisTask {
  id: string;
  source: { url: string; title: string; platform: string; };
  status: 'pending' | 'extracting' | 'analyzing' | 'completed' | 'error';
  progress?: number;
  createdAt: Date;
  result?: { extractionId: string; summary: string; demands: DemandPreview[]; };
  error?: { code: string; message: string; retryable: boolean; };
}
```

**DemandGroup**（持久化到 IndexedDB）：
```typescript
interface DemandGroup {
  id: string;
  name: string;
  demandIds: string[];
  commonPainPoints: string[];
  createdAt: Date;
}
```

### 2.3 新增消息类型

```typescript
// 任务管理
TASK_CREATED | TASK_STATUS_UPDATED | TASK_COMPLETED | TASK_ERROR | TASK_CANCELLED

// 批量分析
BATCH_ANALYZE_START | BATCH_ANALYZE_PROGRESS | BATCH_ANALYZE_COMPLETE

// 需求去重
DEDUP_ANALYZE_START | DEDUP_ANALYZE_COMPLETE | DEDUP_CONFIRM
```

### 2.4 LangChain.js 用法更新

基于最新官方文档（2025-12）：

```typescript
// ChatOpenAI 结构化输出（推荐方式）
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const structuredModel = model.withStructuredOutput(zodSchema, { strict: true });

// ChatGoogleGenerativeAI（最新模型）
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const gemini = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",  // 推荐模型
  maxOutputTokens: 2048,
});

// DeepSeek（OpenAI 兼容）
const deepseek = new ChatOpenAI({
  model: "deepseek-chat",
  configuration: { baseURL: "https://api.deepseek.com/v1" },
});
```

---

## 三、M1: 分析任务独立化

### 3.1 目标

解耦「当前页面」与「分析任务」，实现：
- 页面切换时分析任务继续运行
- 任务指示器实时显示状态
- 返回原页面自动关联已完成结果

### 3.2 任务分解

#### 3.2.1 重构 analysis store

**文件**: `src/sidepanel/stores/analysis.ts`

**当前结构** (v2.0):
```typescript
interface AnalysisState {
  pageInfo: PageInfoPayload | null;
  status: "idle" | "extracting" | "analyzing" | "completed" | "error";
  extractionId: string | null;
  summary: string | null;
  demands: DemandPreview[];
  selectedDemandIds: string[];
  // ...
}
```

**新结构** (v2.1):
```typescript
interface AnalysisState {
  // ===== 当前页面（随 URL 变化更新，重命名 pageInfo → currentPage）=====
  currentPage: PageInfoPayload | null;

  // ===== 任务队列（独立于页面切换）=====
  tasks: AnalysisTask[];
  activeTaskId: string | null;

  // ===== 任务指示器状态 =====
  indicatorExpanded: boolean;

  // ===== 保留的选择状态 =====
  selectedDemandIds: string[];

  // ===== Actions =====
  setCurrentPage: (info: PageInfoPayload | null) => void;
  createTask: (source: AnalysisTask['source']) => string;
  updateTaskStatus: (taskId: string, status: AnalysisTask['status'], data?: Partial<AnalysisTask>) => void;
  setTaskResult: (taskId: string, result: AnalysisTask['result']) => void;
  setTaskError: (taskId: string, error: AnalysisTask['error']) => void;
  retryTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  viewTask: (taskId: string | null) => void;
  clearCompletedTasks: () => void;
  getRunningTasks: () => AnalysisTask[];
  getTaskForUrl: (url: string) => AnalysisTask | undefined;
  toggleDemandSelection: (id: string) => void;
  selectAllDemands: () => void;
  deselectAllDemands: () => void;
}
```

**核心逻辑变更**：
```typescript
// URL 变化仅更新 currentPage，不重置任务
setCurrentPage: (info) => {
  set({ currentPage: info });

  // 检查是否有该 URL 的已完成任务，自动关联
  const existingTask = get().tasks.find(
    t => t.source.url === info?.url && t.status === 'completed'
  );
  if (existingTask) {
    set({ activeTaskId: existingTask.id });
  } else {
    set({ activeTaskId: null });
  }
}
```

#### 3.2.2 任务指示器组件

**新建文件**: `src/sidepanel/components/TaskIndicator.tsx`

```typescript
// 收起状态显示：「🔄 N 个分析进行中」或「✅ N 个分析已完成」
// 展开状态显示任务列表，支持查看结果、重试、取消操作
```

**新建文件**: `src/sidepanel/components/TaskList.tsx`
**新建文件**: `src/sidepanel/components/TaskItem.tsx`

#### 3.2.3 更新消息处理

**文件**: `src/background/message-handler.ts`

- 分析请求创建 Task，返回 taskId
- 分析过程中通过 `TASK_STATUS_UPDATED` 更新状态
- 完成时通过 `TASK_COMPLETED` 发送结果

#### 3.2.4 更新 AnalysisView

**文件**: `src/sidepanel/components/AnalysisView.tsx`

- 显示当前页面信息（与任务无关）
- 点击分析时创建任务
- 根据 activeTaskId 显示对应任务结果

### 3.3 测试验收

| 验收项 | 测试方法 |
|-------|---------|
| 页面切换不丢失 | 触发分析 → 切换页面 → 等待完成 → 检查结果 |
| 任务指示器正确 | 多任务场景下检查显示 |
| 完成通知及时 | 计时测试 < 1s 延迟 |
| 自动关联生效 | A→B→A 切换测试 |

---

## 四、M2: 批量分析

### 4.1 目标

支持一次性分析多个「待分析」状态的内容，复用 M1 的任务队列机制。

### 4.2 任务分解

#### 4.2.1 任务队列处理器

**新建文件**: `src/background/task-queue.ts`

```typescript
class TaskQueue {
  private maxConcurrent = 3;
  private running = 0;

  async process(): Promise<void> {
    const pendingTasks = useAnalysisStore.getState()
      .tasks.filter(t => t.status === 'pending');

    for (const task of pendingTasks) {
      if (this.running >= this.maxConcurrent) {
        await this.waitForSlot();
      }
      this.running++;
      this.processTask(task).finally(() => {
        this.running--;
        this.process();
      });
    }
  }

  private async processTask(task: AnalysisTask): Promise<void> {
    // 执行分析逻辑
  }
}
```

#### 4.2.2 批量分析入口

**文件**: `src/sidepanel/components/DemandList.tsx`（或新建 BatchAnalyzePanel）

```
┌─────────────────────────────────────┐
│ ⏳ 8 个内容待分析                   │
│ [批量分析] [全选] [清除]            │
└─────────────────────────────────────┘
```

#### 4.2.3 批量进度展示

任务指示器在批量分析时显示总体进度：

```
┌─────────────────────────────────────┐
│ 🔄 批量分析中                [展开] │
│ ████████░░░░░░░░ 8/15 完成          │
│ 预计剩余 2 分钟                     │
└─────────────────────────────────────┘
```

### 4.3 配置参数

| 配置项 | 值 | 说明 |
|-------|---|------|
| 最大并发数 | 3 | 同时进行的 LLM 请求数 |
| 单任务超时 | 60s | 超时后标记失败 |
| 失败重试次数 | 1 | 自动重试一次 |
| 批量上限 | 20 | 单次批量分析最多 20 个 |

### 4.4 测试验收

| 验收项 | 测试方法 |
|-------|---------|
| 批量创建任务 | 选择 5 个待分析，检查任务数 |
| 并发控制生效 | 创建 10 个任务，观察并发数 ≤ 3 |
| 部分失败处理 | 模拟 1 个失败，检查重试功能 |
| 取消功能生效 | 批量分析中点击取消 |

---

## 五、M3: Twitter/X 适配

### 5.1 目标

支持从 Twitter/X 提取需求信号，包括推文详情页和推文列表页。

### 5.2 任务分解

#### 5.2.1 Twitter 适配器

**新建文件**: `src/content/adapters/twitter.ts`

```typescript
export class TwitterAdapter extends BasePlatformAdapter {
  platform = 'twitter' as const;

  // 多重选择器策略
  private static SELECTORS = {
    // Level 1: 专用选择器
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userHandle: '[data-testid="User-Name"] a[href^="/"]',

    // Level 2: 语义选择器
    tweetAlt: 'article[role="article"]',
    tweetTextAlt: '[lang] span',

    // Level 3: 结构特征
    tweetByStructure: 'article:has([data-testid="tweetText"])',
  };

  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?(twitter|x)\.com/.test(url);
  }

  async extract(): Promise<ExtractionResult> {
    const isStatusPage = /\/status\/\d+/.test(window.location.href);

    if (isStatusPage) {
      return this.extractTweetDetail();
    }
    return this.extractTweetList();
  }

  private extractTweetDetail(): ExtractionResult {
    // 提取主推文 + 回复（最多 30 条）
  }

  private extractTweetList(): ExtractionResult {
    // 提取可见推文（最多 20 条）
  }
}
```

#### 5.2.2 选择器降级链

```
Level 1: 专用选择器 (data-testid) → 最准确
    ↓ 失败
Level 2: 语义选择器 (role) → 较稳定
    ↓ 失败
Level 3: 结构特征匹配 → 最稳定
    ↓ 失败
Level 4: Readability 通用提取 → 兜底
    ↓ 失败
Level 5: 提示用户手动复制
```

#### 5.2.3 注册适配器

**文件**: `src/content/adapters/index.ts`

```typescript
import { TwitterAdapter } from './twitter';

registry.register(new TwitterAdapter());
```

#### 5.2.4 manifest.json 更新

```json
{
  "host_permissions": [
    "https://*.reddit.com/*",
    "https://*.zhihu.com/*",
    "https://*.twitter.com/*",
    "https://*.x.com/*"
  ]
}
```

### 5.3 测试验收

| 验收项 | 测试方法 |
|-------|---------|
| 平台识别 | 访问 twitter.com 和 x.com |
| 推文详情页提取 | 访问 /status/* 页面分析 |
| 推文列表提取 | 访问搜索结果页分析 |
| 选择器回退 | 手动禁用主选择器测试 |

---

## 六、M4: 需求去重分析

### 6.1 目标

LLM 分析需求库中的相似需求，用户确认后合并分组。

### 6.2 任务分解

#### 6.2.1 去重分析 Prompt

**文件**: `src/background/llm/prompt-templates.ts`

```typescript
export const DEDUP_ANALYSIS_PROMPT = `
你是一个产品需求分析专家。请分析以下产品方向列表，找出指向**同一产品机会**的相似方向。

【输入】
${demands.map(d => `
ID: ${d.id}
标题: ${d.title}
描述: ${d.description}
目标用户: ${d.targetUser}
差异点: ${d.differentiators.join(', ')}
`).join('\n---\n')}

【判断标准】
将以下情况视为「同一产品机会」：
1. 解决同一个核心问题
2. 目标用户群体相同或高度重叠
3. 核心差异点有 2 个以上相同

【输出要求】
以 JSON 格式输出：
{
  "groups": [
    {
      "suggestedName": "分组名称",
      "demandIds": ["id1", "id2"],
      "reason": "归组理由",
      "commonPainPoints": ["共同痛点1", "共同痛点2"]
    }
  ],
  "uniqueDemands": ["id4", "id5"]
}
`;
```

#### 6.2.2 去重服务

**新建文件**: `src/background/dedup-service.ts`

```typescript
export class DedupService {
  async analyze(demands: DemandForDedup[]): Promise<DuplicateAnalysisResult> {
    const model = ProviderFactory.create(config);
    const structuredModel = model.withStructuredOutput(DedupResultSchema, { strict: true });

    const prompt = DEDUP_ANALYSIS_PROMPT.replace('${demands...}', formatDemands(demands));
    return await structuredModel.invoke(prompt);
  }
}
```

#### 6.2.3 去重结果 UI

**新建文件**: `src/sidepanel/components/DedupResultView.tsx`

显示分组建议，支持用户确认合并或保持独立。

#### 6.2.4 分组数据模型

**文件**: `src/storage/db.ts`

```typescript
// 新增 demandGroups 表（版本升级）
this.version(2).stores({
  extractions: 'id, url, platform, capturedAt, analysisStatus',
  demands: 'id, extractionId, *tags, starred, archived, groupId, createdAt, [starred+createdAt]',
  demandGroups: 'id, name, createdAt',  // 新增
  config: 'key'
});
```

**新建文件**: `src/storage/repositories/demand-group.ts`

#### 6.2.5 分组展示

**新建文件**: `src/sidepanel/components/DemandGroupCard.tsx`

在需求库中显示分组卡片，支持展开查看、解散分组。

### 6.3 触发条件

- 需求库至少有 5 个已分析的需求
- 距离上次去重分析超过 24 小时
- 用户 LLM 配置有效

### 6.4 测试验收

| 验收项 | 测试方法 |
|-------|---------|
| 触发条件 | 少于 5 个需求时按钮禁用 |
| 分析准确性 | 人工评估 20 组样本，准确率 ≥ 80% |
| 用户确认生效 | 确认后检查 groupId 字段 |
| 分组展示正确 | UI 验收 |

---

## 七、新增组件清单

| 组件 | 路径 | 说明 |
|-----|------|------|
| `TaskIndicator` | `src/sidepanel/components/TaskIndicator.tsx` | 任务指示器（悬浮显示） |
| `TaskList` | `src/sidepanel/components/TaskList.tsx` | 任务列表（展开状态） |
| `TaskItem` | `src/sidepanel/components/TaskItem.tsx` | 单个任务卡片 |
| `BatchAnalyzePanel` | `src/sidepanel/components/BatchAnalyzePanel.tsx` | 批量分析面板 |
| `DedupResultView` | `src/sidepanel/components/DedupResultView.tsx` | 去重结果展示 |
| `DemandGroupCard` | `src/sidepanel/components/DemandGroupCard.tsx` | 需求分组卡片 |
| `TwitterAdapter` | `src/content/adapters/twitter.ts` | Twitter 适配器 |
| `TaskQueue` | `src/background/task-queue.ts` | 任务队列处理器 |
| `DedupService` | `src/background/dedup-service.ts` | 去重分析服务 |
| `DemandGroupRepo` | `src/storage/repositories/demand-group.ts` | 分组仓储 |

---

## 八、关键文件修改清单

| 文件 | 改动程度 | 主要变更 |
|-----|---------|---------|
| `src/sidepanel/stores/analysis.ts` | **大改** | 状态域分离（pageInfo→currentPage），新增 tasks 队列 |
| `src/sidepanel/stores/demands.ts` | **中改** | 新增分组相关状态、lastDedupAt |
| `src/background/message-handler.ts` | **中改** | 新增 TASK_*/BATCH_*/DEDUP_* 消息处理 |
| `src/sidepanel/components/AnalysisView.tsx` | **中改** | 适配新状态结构，集成 TaskIndicator |
| `src/sidepanel/components/DemandList.tsx` | **中改** | 新增批量分析入口、分组展示 |
| `src/storage/db.ts` | **小改** | 版本升级 v2，新增 demandGroups 表 |
| `src/storage/repositories/demand.ts` | **小改** | 新增 getByGroupId、updateGroup 方法 |
| `src/content/adapters/index.ts` | **小改** | 注册 TwitterAdapter |
| `src/shared/types/messages.ts` | **小改** | 新增 9 种消息类型 |
| `src/background/llm/prompt-templates.ts` | **小改** | 新增 DEDUP_ANALYSIS_PROMPT |
| `src/sidepanel/App.tsx` | **小改** | 集成 TaskIndicator 组件 |

---

## 九、风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|-----|-----|-----|---------|
| Twitter DOM 频繁变化 | 适配器失效 | 高 | 多重选择器 + 降级策略 |
| 去重分析 Token 消耗大 | API 成本增加 | 中 | 仅发送必要字段，限制分析频率 |
| 任务队列内存占用 | 性能问题 | 低 | 限制队列大小（20 个） |
| 批量分析 API 限流 | 任务失败 | 中 | 并发控制（3）+ 自动重试 |

---

## 十、验收标准汇总

### 功能验收

| 功能 | 验收项 | 通过标准 |
|-----|-------|---------|
| **任务独立化** | 页面切换不丢失 | 100% 任务完成 |
| | 任务指示器正确 | 数量和状态一致 |
| | 完成通知及时 | < 1s 延迟 |
| **批量分析** | 并发控制 | 最多 3 个同时 |
| | 进度显示 | 实时更新 |
| | 部分失败处理 | 可单独重试 |
| **Twitter 适配** | 平台识别 | twitter.com + x.com |
| | 推文提取 | 详情页 + 列表页 |
| | 选择器回退 | 有效率 ≥ 90% |
| **需求去重** | 分析准确性 | ≥ 80% |
| | 用户确认 | 正确更新数据 |

### 性能指标

| 指标 | 目标值 |
|-----|-------|
| 任务指示器更新延迟 | < 100ms |
| 批量分析 10 个任务 | < 3 分钟 |
| 去重分析 50 个需求 | < 30s |
| Twitter 提取时间 | < 2s |

---

**文档结束**
