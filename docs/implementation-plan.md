# Demand Radar 浏览器插件实施计划

## 项目概述

**Demand Radar** 是一款基于 AI 的浏览器插件，帮助用户从 Reddit、知乎等平台的真实用户吐槽中智能提炼可执行的产品方案。项目已完成完整规划（PRD v2.0 + Tech Spec v2.0），现进入实施阶段。

### 技术栈
- **框架**: Plasmo (Chrome Extension MV3)
- **前端**: React 18 + Tailwind CSS
- **AI**: LangChain v0.3 + 多模型支持 (OpenAI/Google/DeepSeek)
- **存储**: IndexedDB (Dexie.js)
- **状态管理**: Zustand

### 项目当前状态
- ✅ 完整技术文档 (160KB)
- ❌ 零代码实现（需从零开始）
- ❌ 无配置文件
- ✅ Git 分支已创建 (developer-m2)

---

## 实施策略

### 核心原则
1. **渐进式开发** - 每周独立可交付，降低集成风险
2. **质量优先** - 每个阶段都有明确的验收标准和量化指标
3. **快速迭代** - 跳过 Week 0 验证，直接进入开发阶段
4. **缓冲机制** - Week 6 预留应对不确定性

### 成功指标
- Reddit/知乎提取准确率 ≥ 90%
- LLM 方案质量评分 ≥ 3.5/5 分
- 5-6 周内完成 MVP 并提交 Chrome 商店审核
- 代码覆盖率 ≥ 70%
- 0 个 P0 级别 bug

---

## 详细实施计划

### 阶段 0: 项目初始化 (1-2 天)

#### Day 1: 开发环境搭建

**上午**:
1. 安装依赖工具
   ```bash
   # 验证 Node.js 版本 (需 ≥ 18.0.0)
   node --version

   # 安装 pnpm
   npm install -g pnpm

   # 安装 Plasmo CLI
   pnpm add -g plasmo
   ```

2. 创建项目基础结构
   ```bash
   # 初始化 Plasmo 项目
   plasmo init demand-radar --typescript --source-dir src

   # 安装核心依赖
   pnpm add @langchain/core@^0.3.0 @langchain/openai@^0.3.0 \
           langchain@^0.3.0 dexie@^4.0.0 zustand@^4.0.0 \
           @mozilla/readability@^0.5.0 turndown@^7.0.0 \
           dompurify@^3.0.0 flexsearch@^0.7.0
   ```

**下午**:
3. 配置核心文件

**package.json**:
```json
{
  "name": "demand-radar",
  "version": "1.0.0",
  "description": "AI-powered solution discovery from user pain points",
  "scripts": {
    "dev": "plasmo dev",
    "build": "plasmo build",
    "package": "plasmo build --zip",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "plasmo-env.d.ts"]
}
```

**.plasmorc.ts**:
```typescript
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
    side_panel: { default_path: "sidepanel" }
  }
};

export default config;
```

4. 创建目录结构
   ```bash
   mkdir -p src/{background/{langchain/{agents,chains,tools,prompts,models},db,utils},content-scripts/{reddit,zhihu,generic,shared},components/{sidepanel,ui,layout},hooks,store,types,utils,assets,styles}
   ```

**Day 2: 配置完善**

1. 配置代码规范
   - ESLint + Prettier
   - Husky + lint-staged
   - Commitlint

2. 创建基础类型定义
   ```typescript
   // src/types/extraction.ts
   export interface Extraction {
     id: string;
     url: string;
     title: string;
     platform: string;
     originalText: string;
     summary: string;
     analysisStatus: 'completed' | 'pending' | 'failed';
     solutionCount: number;
     savedSolutionCount: number;
     truncated: boolean;
     capturedAt: Date;
     createdAt: Date;
     updatedAt: Date;
   }

   // src/types/solution.ts
   export interface Solution {
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

3. Git 初始提交
   ```bash
   git add .
   git commit -m "feat: initial project setup with Plasmo framework

   - Initialize project structure
   - Configure TypeScript and ESLint
   - Set up basic manifest.json
   - Add core dependencies (LangChain, Dexie, Zustand)"
   ```

**验收标准**:
- ✅ `pnpm dev` 成功启动开发服务器
- ✅ 项目结构符合规范
- ✅ TypeScript 编译无错误
- ✅ ESLint 检查通过

---

### 阶段 1: Week 1-5 开发路线图

> **注**: 跳过 Week 0 验证，直接进入开发阶段。节省 3-5 天时间，但需在开发过程中密切关注技术风险。

#### Week 1: 内容提取稳定性 (5 天)

**目标**: 构建稳定可靠的内容提取系统

**Day 1-2: 平台适配器完善**

1. 完善 Reddit/知乎 Extractor
   ```typescript
   // src/content-scripts/reddit/RedditExtractor.ts
   export class RedditExtractor implements PlatformExtractor {
     async extract(): Promise<ExtractionResult> {
       try {
         const title = this.extractTitle();
         const content = this.extractContent();
         const comments = this.extractComments();

         const originalText = [title, content, ...comments].join('\n\n');

         return {
           id: generateUUID(),
           url: window.location.href,
           title: title,
           platform: 'reddit',
           originalText,
           summary: await this.generateSummary(originalText),
           analysisStatus: 'pending',
           solutionCount: 0,
           savedSolutionCount: 0,
           truncated: false,
           capturedAt: new Date(),
           createdAt: new Date(),
           updatedAt: new Date()
         };
       } catch (error) {
         throw new ExtractionError(`Reddit extraction failed: ${error.message}`);
       }
     }

     private extractTitle(): string {
       const titleElement = document.querySelector('[data-testid="post-content"] h3');
       return titleElement?.textContent?.trim() || '';
     }

     private extractContent(): string {
       const contentElement = document.querySelector('[data-testid="post-content"] div[data-test-id="post-content"]');
       return contentElement?.textContent?.trim() || '';
     }

     private extractComments(): string[] {
       return Array.from(document.querySelectorAll('[data-testid="comment"]'))
         .map(el => el.textContent?.trim())
         .filter(Boolean)
         .slice(0, 50); // 限制评论数量
     }
   }
   ```

2. 实现通用 Readability 提取器
   ```typescript
   // src/content-scripts/generic/GenericExtractor.ts
   import { Readability } from '@mozilla/readability';
   import TurndownService from 'turndown';

   export class GenericExtractor implements PlatformExtractor {
     async extract(): Promise<ExtractionResult> {
       const reader = new Readability(document.cloneNode(true) as Document);
       const article = reader.parse();

       if (!article) {
         throw new ExtractionError('Failed to parse page content');
       }

       const turndown = new TurndownService();
       const content = turndown.turndown(article.content);

       return {
         id: generateUUID(),
         url: window.location.href,
         title: article.title || document.title,
         platform: 'generic',
         originalText: content,
         summary: this.truncateText(content, 500),
         analysisStatus: 'pending',
         solutionCount: 0,
         savedSolutionCount: 0,
         truncated: content.length > 20000,
         capturedAt: new Date(),
         createdAt: new Date(),
         updatedAt: new Date()
       };
     }

     private truncateText(text: string, maxLength: number): string {
       return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
     }
   }
   ```

3. 错误处理与回退策略
   ```typescript
   // src/content-scripts/shared/extractor-factory.ts
   export function createExtractor(): PlatformExtractor {
     const hostname = window.location.hostname;

     if (hostname.includes('reddit.com')) {
       return new RedditExtractor();
     } else if (hostname.includes('zhihu.com')) {
       return new ZhihuExtractor();
     } else {
       return new GenericExtractor();
     }
   }
   ```

**Day 3: Content Script 注入机制**

1. 动态注入实现
   ```typescript
   // src/background/service-worker.ts
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     if (request.type === "EXTRACT_CONTENT") {
       // 检查站点白名单
       const siteConfig = getSiteConfig(sender.tab.url);
       if (!siteConfig.allowed) {
         sendResponse({
           success: false,
           error: 'Site not in whitelist. Please enable in settings.'
         });
         return;
       }

       // 动态注入 content script
       chrome.scripting.executeScript(
         {
           target: { tabId: sender.tab.id },
           func: () => {
             window.postMessage(
               { type: 'DR_EXTRACT_REQUEST' },
               '*'
             );
           }
         },
         () => {
           if (chrome.runtime.lastError) {
             sendResponse({
               success: false,
               error: chrome.runtime.lastError.message
             });
           } else {
             sendResponse({ success: true });
           }
         }
       );
       return true;
     }
   });
   ```

2. 权限请求机制
   ```typescript
   // src/background/utils/permissions.ts
   export async function requestSitePermission(url: string): Promise<boolean> {
     const domain = new URL(url).hostname;

     return new Promise((resolve) => {
       chrome.permissions.request(
         {
           origins: [`*://${domain}/*`]
         },
         (granted) => {
           resolve(granted);
         }
       );
     });
   }
   ```

**Day 4-5: 测试与优化**

1. 性能测试
   - 使用 Week 0 的 60 个测试样本验证
   - 提取时间 < 3s
   - 内存占用监控

2. PII 过滤实现
   ```typescript
   // src/utils/pii-filter.ts
   const PII_PATTERNS = {
     email: /[\w.-]+@[\w.-]+\.\w+/g,
     phone: /1[3-9]\d{9}/g,
     idCard: /\d{17}[\dXx]/g,
     creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
     ip: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g
   };

   export function filterPII(text: string): string {
     let filtered = text;
     filtered = filtered.replace(PII_PATTERNS.email, '[EMAIL]');
     filtered = filtered.replace(PII_PATTERNS.phone, '[PHONE]');
     filtered = filtered.replace(PII_PATTERNS.idCard, '[ID]');
     filtered = filtered.replace(PII_PATTERNS.creditCard, '[CARD]');
     filtered = filtered.replace(PII_PATTERNS.ip, '[IP]');
     return filtered;
   }
   ```

**周交付物**:
- ✅ 稳定的 Content Script（Reddit/知乎/通用）
- ✅ 平台适配器架构
- ✅ PII 过滤模块
- ✅ 测试报告（60 个样本，成功率 ≥ 90%）

#### Week 2: Side Panel 骨架 (5 天)

**目标**: 构建完整的用户界面

**Day 1-2: 基础 UI 框架**

1. 配置 Tailwind CSS
   ```typescript
   // tailwind.config.js
   module.exports = {
     content: ["./src/**/*.{ts,tsx}"],
     theme: {
       extend: {
         colors: {
           primary: {
             50: '#eff6ff',
             500: '#3b82f6',
             600: '#2563eb',
             700: '#1d4ed8'
           }
         }
       }
     },
     plugins: []
   };
   ```

2. 创建 UI 组件库
   ```tsx
   // src/components/ui/Button.tsx
   interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: 'primary' | 'secondary' | 'ghost';
     size?: 'sm' | 'md' | 'lg';
   }

   export const Button: React.FC<ButtonProps> = ({
     children,
     variant = 'primary',
     size = 'md',
     className = '',
     ...props
   }) => {
     const baseStyles = 'rounded font-medium transition-colors disabled:opacity-50';
     const variantStyles = {
       primary: 'bg-primary-600 text-white hover:bg-primary-700',
       secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
       ghost: 'bg-transparent text-primary-600 hover:bg-primary-50'
     };
     const sizeStyles = {
       sm: 'px-3 py-1.5 text-sm',
       md: 'px-4 py-2',
       lg: 'px-6 py-3 text-lg'
     };

     return (
       <button
         className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
         {...props}
       >
         {children}
       </button>
     );
   };
   ```

**Day 3-4: 核心视图开发**

1. 提炼视图
   ```tsx
   // src/components/sidepanel/RefineView.tsx
   export const RefineView: React.FC = () => {
     const [extracting, setExtracting] = useState(false);
     const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
     const [solutions, setSolutions] = useState<Solution[]>([]);

     const handleExtract = async () => {
       setExtracting(true);
       try {
         const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
         const response = await chrome.tabs.sendMessage(tab.id!, { type: "EXTRACT_CONTENT" });

         if (response.success) {
           setExtractionResult(response.data);
           // 调用 LLM 提炼
           const refinedSolutions = await refineWithLLM(response.data);
           setSolutions(refinedSolutions);
         }
       } catch (error) {
         console.error('Extraction failed:', error);
       } finally {
         setExtracting(false);
       }
     };

     return (
       <div className="flex flex-col h-full">
         {/* 页面信息 */}
         <div className="p-4 border-b">
           <h3 className="font-medium text-gray-900">📄 当前页面</h3>
           <div className="mt-2">
             <Button onClick={handleExtract} disabled={extracting}>
               {extracting ? '🔄 提炼中...' : '🔍 提炼此页面'}
             </Button>
           </div>
         </div>

         {/* 加载状态 */}
         {extracting && (
           <div className="flex-1 p-4">
             <LoadingSkeleton />
           </div>
         )}

         {/* 提炼结果 */}
         {solutions.length > 0 && (
           <div className="flex-1 overflow-y-auto p-4">
             <h4 className="font-medium text-gray-900 mb-4">
               💡 发现 {solutions.length} 个产品机会
             </h4>
             <SolutionCards
               solutions={solutions}
               onSave={(selectedSolutions) => saveSolutions(selectedSolutions)}
             />
           </div>
         )}
       </div>
     );
   };
   ```

2. 方案列表视图
   ```tsx
   // src/components/sidepanel/SolutionList.tsx
   export const SolutionList: React.FC = () => {
     const [solutions, setSolutions] = useState<Solution[]>([]);
     const [searchQuery, setSearchQuery] = useState('');
     const [filterTag, setFilterTag] = useState<string>('all');

     useEffect(() => {
       loadSolutions();
     }, []);

     const loadSolutions = async () => {
       const db = new DemandRadarDB();
       const allSolutions = await db.solutions.orderBy('createdAt').reverse().toArray();
       setSolutions(allSolutions);
     };

     const filteredSolutions = solutions.filter(solution => {
       const matchesSearch = solution.solution.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            solution.solution.description.toLowerCase().includes(searchQuery.toLowerCase());
       const matchesTag = filterTag === 'all' || solution.tags.includes(filterTag);
       return matchesSearch && matchesTag;
     });

     return (
       <div className="flex flex-col h-full">
         {/* 搜索栏 */}
         <div className="p-4 border-b">
           <input
             type="text"
             placeholder="搜索方案..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full px-3 py-2 border rounded"
           />
         </div>

         {/* 筛选器 */}
         <div className="p-4 border-b flex gap-2">
           <Button size="sm" variant={filterTag === 'all' ? 'primary' : 'ghost'}
                   onClick={() => setFilterTag('all')}>
             全部
           </Button>
           <Button size="sm" variant={filterTag === 'starred' ? 'primary' : 'ghost'}
                   onClick={() => setFilterTag('starred')}>
             ⭐ 收藏
           </Button>
         </div>

         {/* 方案列表 */}
         <div className="flex-1 overflow-y-auto">
           {filteredSolutions.map(solution => (
             <SolutionCard key={solution.id} solution={solution} />
           ))}
         </div>
       </div>
     );
   };
   ```

**Day 5: 设置页面**

1. LLM 配置界面
   ```tsx
   // src/components/sidepanel/Settings.tsx
   export const Settings: React.FC = () => {
     const [llmConfig, setLLMConfig] = useState<LLMConfig>({
       provider: 'openai',
       apiKey: '',
       modelName: 'gpt-4o-mini'
     });

     const handleSave = async () => {
       await chrome.storage.sync.set({ llmConfig });
       alert('配置已保存');
     };

     const testConnection = async () => {
       try {
         const result = await testLLMConnection(llmConfig);
         alert('连接成功！');
       } catch (error) {
         alert('连接失败：' + error.message);
       }
     };

     return (
       <div className="p-4">
         <h2 className="text-xl font-bold mb-4">⚙️ 设置</h2>

         <div className="space-y-4">
           {/* LLM 提供商选择 */}
           <div>
             <label className="block text-sm font-medium mb-2">LLM 提供商</label>
             <select
               value={llmConfig.provider}
               onChange={(e) => setLLMConfig({ ...llmConfig, provider: e.target.value as any })}
               className="w-full px-3 py-2 border rounded"
             >
               <option value="openai">OpenAI</option>
               <option value="google">Google (Gemini)</option>
               <option value="deepseek">DeepSeek</option>
               <option value="custom">自定义</option>
             </select>
           </div>

           {/* API Key */}
           <div>
             <label className="block text-sm font-medium mb-2">API Key</label>
             <input
               type="password"
               value={llmConfig.apiKey}
               onChange={(e) => setLLMConfig({ ...llmConfig, apiKey: e.target.value })}
               className="w-full px-3 py-2 border rounded"
               placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
             />
           </div>

           {/* 模型名称 */}
           <div>
             <label className="block text-sm font-medium mb-2">模型名称</label>
             <input
               type="text"
               value={llmConfig.modelName}
               onChange={(e) => setLLMConfig({ ...llmConfig, modelName: e.target.value })}
               className="w-full px-3 py-2 border rounded"
             />
           </div>

           {/* 操作按钮 */}
           <div className="flex gap-2">
             <Button onClick={testConnection}>测试连接</Button>
             <Button onClick={handleSave} variant="primary">保存配置</Button>
           </div>
         </div>
       </div>
     );
   };
   ```

**周交付物**:
- ✅ 完整的 Side Panel UI（3 个核心视图）
- ✅ 设置页面（LLM 配置）
- ✅ 基础样式系统（Tailwind）
- ✅ 组件库（Button, Input, Card 等）

#### Week 3: LLM 接入 + IndexedDB (5 天)

**目标**: 实现智能提炼和本地存储

**Day 1-2: LangChain 集成**

1. LLM 管理器
   ```typescript
   // src/background/langchain/models/manager.ts
   import { ChatOpenAI } from "@langchain/openai";
   import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
   import { ChatDeepSeek } from "@langchain/deepseek";

   export class LLMManager {
     private models = new Map<string, BaseChatModel>();

     async createModel(config: LLMConfig): Promise<BaseChatModel> {
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
             temperature: 0.7,
             maxTokens: 2000,
           });
           break;

         case 'google':
           model = new ChatGoogleGenerativeAI({
             apiKey: config.apiKey,
             model: config.modelName,
             temperature: 0.7,
             maxOutputTokens: 2000,
           });
           break;

         case 'deepseek':
           model = new ChatDeepSeek({
             apiKey: config.apiKey,
             baseURL: config.baseUrl,
             model: config.modelName,
             temperature: 0.7,
             maxTokens: 2000,
           });
           break;

         default:
           throw new Error(`Unsupported provider: ${config.provider}`);
       }

       this.models.set(modelKey, model);
       return model;
     }
   }
   ```

**Day 3: 提炼链实现**

1. RefinementChain
   ```typescript
   // src/background/langchain/chains/RefinementChain.ts
   import { RunnableSequence } from "@langchain/core/runnables";
   import { ChatPromptTemplate } from "@langchain/core/prompts";
   import { StructuredOutputParser } from "@langchain/core/output_parsers";
   import { z } from "zod";

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
     }))
   });

   export class RefinementChain {
     private chain: RunnableSequence;

     constructor(model: BaseChatModel) {
       const parser = StructuredOutputParser.fromZodSchema(SolutionSchema);

       this.chain = RunnableSequence.from([
         ChatPromptTemplate.fromMessages([
           ["system", SYSTEM_PROMPT],
           ["human", USER_PROMPT_TEMPLATE],
         ]),
         model,
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
   }
   ```

**Day 4: IndexedDB 存储**

1. 数据库 Schema
   ```typescript
   // src/background/db/schema.ts
   import Dexie, { Table } from 'dexie';

   export class DemandRadarDB extends Dexie {
     extractions!: Table<Extraction>;
     solutions!: Table<Solution>;

     constructor() {
       super('DemandRadarDB');
       this.version(1).stores({
         extractions: 'id, url, platform, capturedAt',
         solutions: 'id, extractionId, *tags, starred, archived, createdAt, [starred+createdAt], groupId'
       });
     }
   }

   export const db = new DemandRadarDB();
   ```

2. 存储操作封装
   ```typescript
   // src/background/db/operations.ts
   export class StorageService {
     async saveExtraction(extraction: Extraction): Promise<string> {
       // 检查 500KB 限制
       const size = JSON.stringify(extraction).length;
       if (size > 500 * 1024) {
         extraction = this.truncateExtraction(extraction);
         extraction.truncated = true;
       }

       const id = await db.extractions.add(extraction);
       return id.toString();
     }

     async saveSolutions(extractionId: string, solutions: Solution[]): Promise<string[]> {
       const savedIds: string[] = [];

       for (const solution of solutions) {
         const id = await db.solutions.add({
           ...solution,
           extractionId,
           createdAt: new Date(),
           updatedAt: new Date(),
         });
         savedIds.push(id.toString());
       }

       return savedIds;
     }

     private truncateExtraction(extraction: Extraction): Extraction {
       // 截断策略：优先截断 originalText
       const maxOriginalLength = 20000;
       const maxSummaryLength = 500;

       let truncated = false;
       let originalText = extraction.originalText;
       let summary = extraction.summary;

       if (originalText.length > maxOriginalLength) {
         originalText = originalText.substring(0, maxOriginalLength) + '...';
         truncated = true;
       }

       if (summary.length > maxSummaryLength) {
         summary = summary.substring(0, maxSummaryLength) + '...';
         truncated = true;
       }

       return {
         ...extraction,
         originalText,
         summary,
         truncated,
       };
     }
   }
   ```

**Day 5: 离线降级**

1. 降级策略实现
   ```typescript
   // src/background/services/fallback-service.ts
   export class FallbackService {
     async handleExtractionFailure(
       extraction: Extraction,
       error: Error
     ): Promise<ExtractionResult> {
       // 根据错误类型选择降级策略
       switch (error.name) {
         case 'NETWORK_ERROR':
           return this.offlineMode(extraction);

         case 'TIMEOUT':
           return this.timeoutMode(extraction);

         case 'QUOTA_EXCEEDED':
           return this.quotaExceededMode(extraction);

         default:
           return this.genericErrorMode(extraction, error);
       }
     }

     private offlineMode(extraction: Extraction): ExtractionResult {
       // 使用 Readability 生成基础摘要
       const summary = this.generateReadabilitySummary(extraction.originalText);

       return {
         ...extraction,
         summary,
         analysisStatus: 'pending',
       };
     }

     private timeoutMode(extraction: Extraction): ExtractionResult {
       // 保存原文，标记待分析
       return {
         ...extraction,
         analysisStatus: 'pending',
         summary: '内容已保存，待后台分析...',
       };
     }

     private quotaExceededMode(extraction: Extraction): ExtractionResult {
       // 提示用户检查 API 配额
       return {
         ...extraction,
         analysisStatus: 'failed',
         summary: 'API 配额已用尽，请检查您的配置',
       };
     }
   }
   ```

**周交付物**:
- ✅ LLM 多服务商支持（OpenAI/Google/DeepSeek）
- ✅ 完整的提炼流程（RefinementChain）
- ✅ IndexedDB 存储（500KB 限制）
- ✅ 离线降级机制（3 种模式）
- ✅ 方案质量验证（≥3.5/5 分）

#### Week 4: 安全 + 去重 + 打磨 (5 天)

**目标**: 完善安全功能，提升用户体验

**Day 1: PII 过滤**

1. 完善 PII 过滤模块
   ```typescript
   // src/utils/pii-filter.ts
   export class PIIFilter {
     private static readonly PATTERNS = {
       email: {
         regex: /[\w.-]+@[\w.-]+\.\w+/g,
         replacement: '[EMAIL]'
       },
       phone: {
         regex: /1[3-9]\d{9}/g,
         replacement: '[PHONE]'
       },
       idCard: {
         regex: /\d{17}[\dXx]/g,
         replacement: '[ID]'
       },
       creditCard: {
         regex: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
         replacement: '[CARD]'
       },
       ip: {
         regex: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
         replacement: '[IP]'
       }
     };

     static filter(text: string): string {
       let filtered = text;

       for (const pattern of Object.values(this.PATTERNS)) {
         filtered = filtered.replace(pattern.regex, pattern.replacement);
       }

       return filtered;
     }

     static filterBeforeLLM(extraction: Extraction): Extraction {
       return {
         ...extraction,
         originalText: this.filter(extraction.originalText),
         summary: this.filter(extraction.summary),
       };
     }
   }
   ```

**Day 2: 站点白名单/黑名单**

1. 站点过滤器
   ```typescript
   // src/background/config/site-filter.ts
   interface SiteFilterConfig {
     mode: 'whitelist' | 'blacklist' | 'all';
     whitelist: string[];
     blacklist: string[];
   }

   const DEFAULT_BLACKLIST = [
     '*://*.bank.*/*',
     '*://mail.*/*',
     '*://*.gov.*/*',
     '*://*/login*',
     '*://*/account*'
   ];

   export class SiteFilter {
     private config: SiteFilterConfig;

     constructor(config: SiteFilterConfig) {
       this.config = config;
     }

     isAllowed(url: string): boolean {
       const hostname = new URL(url).hostname;

       // 检查默认黑名单
       if (this.isInDefaultBlacklist(hostname)) {
         return false;
       }

       // 检查自定义黑名单
       if (this.config.blacklist.some(pattern => this.matchesPattern(hostname, pattern))) {
         return false;
       }

       // 白名单模式
       if (this.config.mode === 'whitelist') {
         return this.config.whitelist.some(pattern => this.matchesPattern(hostname, pattern));
       }

       return true;
     }

     private isInDefaultBlacklist(hostname: string): boolean {
       return DEFAULT_BLACKLIST.some(pattern => this.matchesPattern(hostname, pattern));
     }

     private matchesPattern(hostname: string, pattern: string): boolean {
       // 简单的模式匹配实现
       const regex = new RegExp(pattern.replace(/\*/g, '.*'));
       return regex.test(hostname);
     }
   }
   ```

**Day 3: 去重分析功能**

1. 去重分析 Agent
   ```typescript
   // src/background/langchain/agents/DeduplicationAgent.ts
   export class DeduplicationAgent {
     private llmManager: LLMManager;

     async analyze(solutions: Solution[]): Promise<DuplicateAnalysisResult> {
       const model = await this.llmManager.getDefaultModel();

       const prompt = ChatPromptTemplate.fromMessages([
         ["system", DEDUPLICATION_PROMPT],
         ["human", "{solutions}"]
       ]);

       const chain = prompt.pipe(model);
       const result = await chain.invoke({
         solutions: JSON.stringify(solutions, null, 2)
       });

       return this.parseResult(result.content);
     }

     private parseResult(content: string): DuplicateAnalysisResult {
       try {
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
           return JSON.parse(jsonMatch[0]);
         }
         throw new Error('No valid JSON found');
       } catch (error) {
         throw new Error(`Failed to parse deduplication result: ${error.message}`);
       }
     }
   }
   ```

**Day 4: 性能优化**

1. 虚拟滚动实现
   ```tsx
   // src/components/sidepanel/VirtualizedList.tsx
   export const VirtualizedList: React.FC<{
     items: Solution[];
     itemHeight: number;
     containerHeight: number;
   }> = ({ items, itemHeight, containerHeight }) => {
     const [scrollTop, setScrollTop] = useState(0);

     const visibleStart = Math.floor(scrollTop / itemHeight);
     const visibleEnd = Math.min(
       visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
       items.length
     );

     const visibleItems = items.slice(visibleStart, visibleEnd);
     const totalHeight = items.length * itemHeight;
     const offsetY = visibleStart * itemHeight;

     return (
       <div
         style={{ height: containerHeight, overflow: 'auto' }}
         onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
       >
         <div style={{ height: totalHeight, position: 'relative' }}>
           <div style={{ transform: `translateY(${offsetY}px)` }}>
             {visibleItems.map((item, index) => (
               <div key={visibleStart + index} style={{ height: itemHeight }}>
                 <SolutionCard solution={item} />
               </div>
             ))}
           </div>
         </div>
       </div>
     );
   };
   ```

2. 防抖搜索
   ```typescript
   // src/hooks/useDebounce.ts
   export function useDebounce<T>(value: T, delay: number): T {
     const [debouncedValue, setDebouncedValue] = useState<T>(value);

     useEffect(() => {
       const handler = setTimeout(() => {
         setDebouncedValue(value);
       }, delay);

       return () => {
         clearTimeout(handler);
       };
     }, [value, delay]);

     return debouncedValue;
   }
   ```

**Day 5: 埋点接入**

1. 埋点系统
   ```typescript
   // src/background/utils/analytics.ts
   interface AnalyticsEvent {
     event: string;
     params?: Record<string, any>;
     timestamp: number;
   }

   export class Analytics {
     private static EVENTS_KEY = 'analytics_events';

     static track(event: string, params?: Record<string, any>): void {
       const eventData: AnalyticsEvent = {
         event,
         params,
         timestamp: Date.now()
       };

       chrome.storage.local.get(this.EVENTS_KEY, (result) => {
         const events = result[this.EVENTS_KEY] || [];
         events.push(eventData);

         // 限制存储数量（最多 1000 条）
         if (events.length > 1000) {
           events.shift();
         }

         chrome.storage.local.set({ [this.EVENTS_KEY]: events });
       });
     }

     static trackPageView(): void {
       this.track('page_view', {
         url: window.location.href,
         title: document.title
       });
     }

     static trackExtraction(platform: string, success: boolean, duration: number): void {
       this.track('extraction', {
         platform,
         success,
         duration
       });
     }

     static trackSolutionSave(solutionCount: number): void {
       this.track('solution_save', {
         solution_count: solutionCount
       });
     }
   }
   ```

**周交付物**:
- ✅ PII 过滤模块（5 种类型）
- ✅ 站点白/黑名单机制
- ✅ 去重分析功能（LLM 驱动）
- ✅ 性能优化（虚拟滚动、防抖）
- ✅ 埋点系统（5 个核心事件）

#### Week 5: 测试 + 上架准备 (5 天)

**目标**: 完成测试，准备 Chrome 商店上架

**Day 1-2: 完整功能测试**

1. 端到端测试
   ```typescript
   // test/e2e/full-pipeline.test.ts
   describe('Full Pipeline E2E', () => {
     it('should complete extraction to storage flow', async () => {
       // 1. 打开测试页面
       await page.goto('https://reddit.com/r/SaaS/test-post');

       // 2. 打开 Side Panel
       await page.click('[data-testid="demand-radar-icon"]');

       // 3. 点击提炼按钮
       await page.click('button:has-text("提炼此页面")');

       // 4. 等待提炼完成
       await page.waitForSelector('[data-testid="solution-card"]', { timeout: 30000 });

       // 5. 验证方案数量
       const solutionCount = await page.locator('[data-testid="solution-card"]').count();
       expect(solutionCount).toBeGreaterThanOrEqual(1);

       // 6. 保存方案
       await page.click('button:has-text("保存选中")');

       // 7. 验证存储
       const storedSolutions = await getStoredSolutions();
       expect(storedSolutions.length).toBeGreaterThanOrEqual(1);
     });
   });
   ```

2. 性能测试
   ```typescript
   // test/performance/load-test.ts
   describe('Performance Tests', () => {
     it('should handle extraction within time limit', async () => {
       const startTime = Date.now();

       await extractPageContent(testUrl);

       const duration = Date.now() - startTime;
       expect(duration).toBeLessThan(3000); // < 3s
     });

     it('should not exceed memory limit', async () => {
       const memoryBefore = await page.evaluate(() => performance.memory?.usedJSHeapSize);

       await extractMultiplePages(50);

       const memoryAfter = await page.evaluate(() => performance.memory?.usedJSHeapSize);
       const memoryIncrease = memoryAfter - memoryBefore;

       expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
     });
   });
   ```

**Day 3: 商店页面准备**

1. 应用描述撰写
   ```
   标题: Demand Radar - AI产品机会发现器

   描述（≤132字符）:
   通过AI智能分析Reddit、知乎等平台的用户吐槽，发现可执行的产品方向和商业机会。

   详细描述:
   Demand Radar 是一款专为产品经理、创业者和独立开发者设计的智能浏览器插件。

   ✨ 核心功能：
   • 自动提取网页内容（支持Reddit、知乎等主流平台）
   • AI智能提炼产品方案（基于LangChain技术）
   • 本地存储，保护隐私（IndexedDB）
   • 多模型支持（OpenAI/Google/DeepSeek）

   🎯 适用场景：
   • 发现市场空白和产品机会
   • 竞品分析和用户研究
   • 收集用户反馈和痛点
   • 构建个人解决方案知识库

   🔒 隐私承诺：
   • 本地优先存储，数据不上传服务器
   • 仅在用户主动触发时提取内容
   • 发送至AI前自动过滤敏感信息

   立即安装，开启您的产品发现之旅！
   ```

2. 截图准备（5张 1280x800）
   - 截图1: Side Panel 界面展示
   - 截图2: 提炼结果页面
   - 截图3: 方案库列表
   - 截图4: 设置页面
   - 截图5: 使用场景示例

3. 隐私政策
   ```markdown
   # 隐私政策

   ## 数据收集
   Demand Radar 仅在用户主动触发时提取页面内容进行分析。我们不会收集任何个人身份信息（PII）。

   ## 数据使用
   - 提取的网页内容仅用于AI分析，提炼产品方案
   - 分析结果存储在用户本地设备（IndexedDB）
   - 不与第三方共享用户数据

   ## 数据存储
   - 所有数据默认存储在用户本地
   - 可随时导出或删除所有数据
   - 不运营任何服务器存储用户数据

   ## 联系我们
   如有隐私相关问题，请通过 GitHub Issues 联系我们。
   ```

**Day 4: 提交审核**

1. 打包发布版本
   ```bash
   # 构建生产版本
   pnpm build

   # 打包为 ZIP 文件
   pnpm package
   ```

2. Chrome 开发者控制台提交
   - 上传 demand-radar.zip
   - 填写应用信息
   - 提交审核

3. 准备申诉材料（如被拒）
   - 功能演示视频
   - 技术实现说明
   - 隐私保护措施

**Day 5: Buffer 时间**

- 修复测试中发现的 bug
- 优化用户体验细节
- 准备用户使用文档
- 监控审核状态

**周交付物**:
- ✅ 完整测试报告（E2E + 性能）
- ✅ Chrome 商店素材（描述 + 截图 + 隐私政策）
- ✅ 已提交审核
- ✅ 预留 Buffer 时间处理问题

#### Week 6: 缓冲周 (5 天)

**目标**: 应对突发情况，预研 P1 功能

**可用场景**:
1. Week 5 工作未完成
2. 审核反馈需要修改
3. 紧急 bug 修复
4. 用户反馈快速响应

**P1 功能预研**（若无问题）:

1. 云端同步架构设计
   ```typescript
   // P1: Supabase 同步方案
   interface SyncConfig {
     userId: string;
     syncEnabled: boolean;
     lastSyncedAt: Date;
   }

   class CloudSyncService {
     async syncToCloud(extractions: Extraction[], solutions: Solution[]): Promise<void> {
       // 增量同步策略
       const changes = this.calculateChanges(extractions, solutions);
       await this.supabase.from('demand_radar_sync').upsert(changes);
     }
   }
   ```

2. 跨设备同步方案
   - WebSocket 实时推送
   - 冲突解决策略（最后修改时间优先）
   - 离线优先设计

3. 批量分析功能设计
   - 任务队列系统
   - 进度跟踪
   - 速率限制

**周交付物**:
- ✅ 问题处理记录
- ✅ P1 功能技术方案
- ✅ 用户反馈分析

---

### 质量保障体系

#### 1. 代码质量标准

**TypeScript 严格模式**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**ESLint 规则**
```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**提交规范**
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

#### 2. 测试策略

**单元测试覆盖率目标**: ≥ 70%

**测试分类**:
- 平台提取器测试（Reddit/知乎/通用）
- LLM 链测试（RefinementChain/DeduplicationChain）
- 数据库操作测试（增删改查）
- 工具函数测试（PII 过滤/防抖等）

**集成测试**:
- 完整流程测试（提取→提炼→存储）
- Side Panel 交互测试
- 错误处理测试

**E2E 测试**:
- 真实页面测试（30 个 Reddit + 30 个知乎）
- 跨浏览器兼容性（Chrome/Edge）
- 性能测试（内存、响应时间）

#### 3. 验收标准

**功能验收**:
- ✅ Reddit 提取准确率 ≥ 90%
- ✅ 知乎提取准确率 ≥ 90%
- ✅ 方案质量评分 ≥ 3.5/5
- ✅ 存储截断功能正常
- ✅ 去重分析可用

**性能验收**:
- ✅ 提取时间 < 3s
- ✅ LLM 提炼 < 10s
- ✅ 常驻内存 < 80MB
- ✅ UI 响应 < 500ms
- ✅ 搜索响应 < 500ms

**安全验收**:
- ✅ PII 过滤覆盖 5 种类型
- ✅ 站点白名单默认开启
- ✅ 权限最小化（仅 4 个权限）
- ✅ 零敏感信息泄漏

---

### 风险管理与应对

#### 技术风险

| 风险 | 概率 | 影响 | 应对措施 | 预警信号 |
|------|------|------|---------|---------|
| 知乎反爬升级 | 高 | 高 | Week 0 验证；准备 Readability 降级；监测页面变化 | 提取成功率 < 80% |
| LLM API 成本过高 | 中 | 中 | 多服务商支持；用量预估提示；离线摘要模式 | 单次提炼成本 > $0.01 |
| 页面结构变化 | 中 | 中 | 平台适配器架构；快速更新机制；回退策略 | 选择器失效 |
| Chrome 审核被拒 | 中 | 中 | 预留 Week 6；提前研究政策；准备申诉材料 | 审核超过 7 天 |

#### 进度风险

| 风险 | 应对措施 | 资源调配 |
|------|---------|---------|
| Week 0 验证失败 | 调整策略；简化 MVP 范围；增加缓冲时间 | 延长至 7 天 |
| Week 1 延期 | 优先 Reddit；知乎移至 P1；使用通用提取器 | 聚焦核心功能 |
| Week 3 延期 | 优化 Prompt；调整模型参数；降低质量阈值 | 专注稳定性 |
| Week 5 延期 | 减少 P1 功能；专注核心流程；简化界面 | 砍掉非必要功能 |

#### 质量风险

| 风险 | 预防措施 | 监控指标 |
|------|---------|---------|
| 方案质量 < 3.5/5 | Week 0 提前验证；优化 Prompt；人工审核机制 | 每周质量评审 |
| 存储超限 | 500KB 截断策略；容量监控；用户提示 | 存储使用率 |
| 内存泄漏 | 定期性能测试；虚拟滚动；缓存清理 | 内存使用趋势 |

---

### 成功指标

#### MVP 成功标准

**Week 0**:
- ✅ 技术验证成功率 ≥ 90%
- ✅ 知乎/Reddit 提取器 POC 通过
- ✅ LLM Prompt 质量达标
- ✅ 技术可行性报告输出

**Week 1-6**:
- ✅ 按周完成交付物
- ✅ 无严重延期（> 2 天）
- ✅ 代码覆盖率 ≥ 70%
- ✅ 0 个 P0 级别 bug

**最终交付**:
- ✅ Reddit/知乎提取准确率 ≥ 90%
- ✅ 方案质量评分 ≥ 3.5/5
- ✅ Chrome 商店审核通过
- ✅ 用户满意度 ≥ 4.0 星

#### 质量指标

- **代码质量**: 0 个严重警告
- **测试覆盖**: 单元测试 ≥ 70%，集成测试覆盖核心流程
- **性能**: 内存泄漏 = 0，崩溃 = 0
- **安全**: PII 泄漏 = 0，权限滥用 = 0

---

## 总结

本实施计划遵循 **渐进式开发** 策略，通过 Week 0 技术验证降低风险，每周有明确的交付物和验收标准。核心优势：

1. **Week 0 验证优先** - 避免后期返工，降低技术风险
2. **每周独立可交付** - 降低集成风险，便于调整
3. **缓冲周应对不确定性** - Week 6 预留处理突发问题
4. **质量优先** - 每个阶段都有严格的量化验收标准

### 关键成功因素

1. **严格按照 Week 0 验证执行** - 3-5 天充分验证技术可行性
2. **每周复盘和调整** - 及时发现问题，调整策略
3. **质量优先于速度** - 不为赶进度牺牲质量
4. **用户反馈驱动** - Week 5 后持续收集反馈，快速迭代

### 建议执行方式

1. **每日站会**（15 分钟）- 同步进度，识别阻碍
2. **每周复盘**（1 小时）- 评估交付物质量，调整下周计划
3. **风险升级机制** - 风险发生时 24 小时内升级处理
4. **文档驱动开发** - 代码与文档同步更新

**预计总耗时**: 5-6 周（跳过 Week 0 验证）
**核心团队**: 1 名全栈开发工程师（全职投入）
**关键里程碑**: Week 1 内容提取 → Week 3 LLM 接入 → Week 5 提交审核

建议严格按照计划执行，密切关注技术风险，确保 5-6 周内交付可用的 MVP 版本。