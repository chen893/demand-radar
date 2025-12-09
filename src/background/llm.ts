# Demand Radar 📡

> 从用户讨论中发现产品机会

Demand Radar 是一个 Chrome 浏览器扩展，帮助产品经理、创业者和独立开发者从 Reddit、知乎等平台的用户讨论中**提炼可执行的产品方向**。

## 功能特性

### 🔍 智能内容提取
- **多平台支持**：Reddit（新版/旧版）、知乎（问答/专栏）、通用网页
- **自适应解析**：自动识别页面结构，提取标题、正文、评论
- **降级机制**：专用适配器失败时自动切换到通用提取器

### 🤖 AI 驱动分析
- **多模型支持**：OpenAI、Google Gemini、DeepSeek、自定义 API
- **结构化输出**：产品方向 = 解决方案 + 验证依据
- **原文证据**：保留用户原话作为验证依据

### 💾 本地优先存储
- **隐私保护**：所有数据存储在本地 IndexedDB
- **PII 脱敏**：发送给 LLM 前自动过滤敏感信息
- **容量管理**：50MB 软限制，100MB 硬限制，支持导出

### 📊 需求管理
- **标签分类**：自定义标签组织产品方向
- **收藏归档**：标记重要需求，归档已处理需求
- **全文搜索**：快速检索保存的产品方向

## 技术栈

| 组件 | 技术 |
|------|------|
| 扩展框架 | [Plasmo](https://plasmo.com/) (Chrome MV3) |
| UI 框架 | React 18 + Tailwind CSS |
| 状态管理 | Zustand |
| 本地存储 | Dexie.js (IndexedDB) |
| LLM 调用 | LangChain.js |
| 内容提取 | @mozilla/readability + Turndown |

## 快速开始

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd demand-radar

# 安装依赖
npm install
```

### 开发模式

```bash
npm run dev
```

然后在 Chrome 中：
1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `build/chrome-mv3-dev` 目录

### 生产构建

```bash
npm run build
npm run package  # 生成 .zip 文件
```

## 项目结构

```
src/
├── background/              # Service Worker
│   ├── index.ts            # 入口，事件监听
│   ├── message-handler.ts  # 消息路由
│   └── llm/                # LLM 服务
│       ├── index.ts        # 主服务，结构化输出
│       ├── provider-factory.ts  # 多提供商工厂
│       └── prompt-templates.ts  # Prompt 模板
│
├── content/                 # Content Script
│   ├── index.ts            # 入口，消息监听
│   ├── site-filter.ts      # 站点白名单/黑名单
│   └── adapters/           # 平台适配器
│       ├── base.ts         # 基类接口
│       ├── reddit.ts       # Reddit 适配器
│       ├── zhihu.ts        # 知乎适配器
│       └── generic.ts      # 通用适配器
│
├── sidepanel/               # Side Panel UI
│   ├── index.tsx           # 入口
│   ├── App.tsx             # 主应用
│   ├── stores/             # Zustand 状态
│   │   ├── analysis.ts     # 分析状态
│   │   ├── demands.ts      # 需求列表状态
│   │   └── config.ts       # 配置状态
│   └── components/         # React 组件
│       ├── AnalysisView.tsx
│       ├── DemandCard.tsx
│       ├── DemandList.tsx
│       ├── DemandDetail.tsx
│       └── SettingsView.tsx
│
├── options/                 # Options 页面
│   └── index.tsx           # 设置 & 欢迎引导
│
├── storage/                 # 数据存储层
│   ├── db.ts               # Dexie 数据库定义
│   ├── extraction-repo.ts  # 提取记录仓储
│   ├── demand-repo.ts      # 需求仓储
│   ├── config-repo.ts      # 配置仓储
│   └── capacity-manager.ts # 容量管理
│
└── shared/                  # 共享模块
    ├── types/              # TypeScript 类型
    ├── constants.ts        # 常量配置
    └── utils/              # 工具函数
        ├── pii-filter.ts   # PII 脱敏
        └── text-utils.ts   # 文本处理
```

## 使用说明

### 1. 配置 LLM

首次安装后会自动打开设置页面，选择 LLM 提供商并输入 API Key：

- **DeepSeek**（推荐）：性价比高，[获取 Key](https://platform.deepseek.com/api_keys)
- **OpenAI**：GPT-4o-mini，[获取 Key](https://platform.openai.com/api-keys)
- **Google**：Gemini 2.0 Flash，[获取 Key](https://aistudio.google.com/app/apikey)
- **自定义**：任何 OpenAI 兼容 API

### 2. 分析页面

1. 打开 Reddit 或知乎的讨论页面
2. 点击浏览器工具栏的 📡 图标打开侧边栏
3. 点击「分析此页面」
4. 查看识别到的产品方向
5. 勾选并保存你感兴趣的方向

### 3. 管理需求

- **需求库**：查看所有保存的产品方向
- **搜索**：按标题、描述、标签搜索
- **筛选**：收藏、归档状态筛选
- **详情**：查看完整信息，添加笔记和标签

## 数据模型

### Extraction（提取记录）
```typescript
{
  id: string;
  url: string;
  title: string;
  platform: 'reddit' | 'zhihu' | 'generic';
  originalText: string;  // 原文（本地存储）
  summary: string;       // 摘要
  analysisStatus: 'completed' | 'pending' | 'failed';
  demandCount: number;
}
```

### Demand（产品方向）
```typescript
{
  id: string;
  solution: {
    title: string;           // 产品名称
    description: string;     // 详细描述
    targetUser: string;      // 目标用户
    keyDifferentiators: [];  // 核心差异点
  };
  validation: {
    painPoints: [];          // 用户痛点
    competitors: [];         // 竞品
    competitorGaps: [];      // 竞品不足
    quotes: [];              // 原文证据
  };
  tags: string[];
  starred: boolean;
  archived: boolean;
}
```

## 开发指南

### 命令

```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run package      # 打包 .zip
npm run test         # 运行测试
npm run lint         # 代码检查
npm run type-check   # 类型检查
```

### 添加新平台适配器

1. 在 `src/content/adapters/` 创建新文件
2. 实现 `IPlatformAdapter` 接口
3. 在 `adapters/index.ts` 中注册

```typescript
// src/content/adapters/twitter.ts
export class TwitterAdapter extends BasePlatformAdapter {
  canHandle(url: string): boolean {
    return /twitter\.com|x\.com/.test(url);
  }

  getPlatformName() {
    return 'twitter';
  }

  async extractContent(): Promise<ExtractionResult> {
    // 实现提取逻辑
  }
}
```

### 添加新 LLM 提供商

在 `src/background/llm/provider-factory.ts` 中添加：

```typescript
case 'newProvider':
  return new ChatOpenAI({
    model: config.modelName,
    apiKey: config.apiKey,
    configuration: {
      baseURL: 'https://api.newprovider.com/v1',
    },
  });
```

## 隐私说明

- **本地存储**：所有数据存储在浏览器本地 IndexedDB
- **PII 过滤**：邮箱、电话、身份证等敏感信息在发送给 LLM 前自动脱敏
- **无云端**：不上传任何数据到我们的服务器
- **API Key**：仅存储在本地，直接与 LLM 提供商通信

## 已知限制

- 知乎需要登录后才能提取完整内容
- Reddit 动态加载的评论可能无法完全提取
- 单次分析内容限制 20,000 字符
- 存储容量 100MB 硬限制

## License

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**Demand Radar** - 让产品洞察触手可及 📡
