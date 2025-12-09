/**
 * Demand - 产品方向，核心实体，最小管理单元
 * 从「痛点评分」改为「解决方案 + 验证依据」结构
 */
export interface Demand {
  id: string; // UUID
  extractionId: string; // 关联的提取记录 ID

  // ===== 核心：解决方案 =====
  solution: {
    title: string; // 产品名/一句话描述（如「本地 PDF 批量处理工具」）
    description: string; // 详细描述（2-3 句话）
    targetUser: string; // 目标用户（如「需要频繁处理 PDF 的办公人员」）
    keyDifferentiators: string[]; // 核心差异点（3-5 个）
  };

  // ===== 支撑：验证依据 =====
  validation: {
    painPoints: string[]; // 用户痛点（如「现有工具太贵」）
    competitors: string[]; // 竞品名称（如「Adobe Acrobat」）
    competitorGaps: string[]; // 竞品不足（如「订阅制，功能臃肿」）
    quotes: string[]; // 原文证据（用户原话）
  };

  // ===== 来源快照（冗余，便于列表展示）=====
  sourceUrl: string;
  sourceTitle: string;
  sourcePlatform: string;

  // ===== 用户管理字段 =====
  tags: string[]; // 用户标签
  starred: boolean; // 是否收藏
  archived: boolean; // 是否归档
  notes: string; // 用户笔记

  // ===== 需求分组（P1，用户确认去重后填充）=====
  groupId?: string; // 同一需求的分组 ID
  groupName?: string; // 分组名称（如「PDF 工具需求」）

  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建 Demand 的参数（从 LLM 分析结果创建）
 */
export interface CreateDemandParams {
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
  tags?: string[];
}

/**
 * 更新 Demand 的参数
 */
export interface UpdateDemandParams {
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  notes?: string;
  groupId?: string;
  groupName?: string;
}

/**
 * 从 Side Panel 传入的需求输入（用于保存）
 */
export interface DemandInput {
  id?: string; // 可选，如果不提供则自动生成
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
  sourceUrl?: string;
  sourceTitle?: string;
  sourcePlatform?: string;
  tags?: string[];
}
