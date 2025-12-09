import { db } from "./db";
import { STORAGE_CONFIG } from "@/shared/constants";
import { formatSize } from "@/shared/utils/text-utils";

/**
 * 存储使用情况
 */
export interface StorageUsage {
  used: number;
  limit: number;
  percentage: number;
  formattedUsed: string;
  formattedLimit: string;
  status: "normal" | "warning" | "critical";
}

/**
 * 存储检查结果
 */
export interface StorageCheckResult {
  allowed: boolean;
  warning?: string;
  usage: StorageUsage;
}

/**
 * 容量管理器
 * 负责监控和管理存储容量
 */
export class CapacityManager {
  /**
   * 获取当前存储使用情况
   */
  async getUsage(): Promise<StorageUsage> {
    const [demands, extractions] = await Promise.all([
      db.demands.toArray(),
      db.extractions.toArray(),
    ]);

    const demandsSize = demands.reduce(
      (sum, d) => sum + JSON.stringify(d).length * 2,
      0
    );
    const extractionsSize = extractions.reduce(
      (sum, e) => sum + JSON.stringify(e).length * 2,
      0
    );
    const used = demandsSize + extractionsSize;

    const limit = STORAGE_CONFIG.TOTAL_SOFT_LIMIT;
    const percentage = used / limit;

    let status: "normal" | "warning" | "critical" = "normal";
    if (used > STORAGE_CONFIG.TOTAL_HARD_LIMIT) {
      status = "critical";
    } else if (percentage >= STORAGE_CONFIG.WARNING_THRESHOLD) {
      status = "warning";
    }

    return {
      used,
      limit,
      percentage,
      formattedUsed: formatSize(used),
      formattedLimit: formatSize(limit),
      status,
    };
  }

  /**
   * 检查是否可以存储新数据
   */
  async canStore(dataSize: number): Promise<StorageCheckResult> {
    const usage = await this.getUsage();

    // 硬限制检查
    if (usage.used + dataSize > STORAGE_CONFIG.TOTAL_HARD_LIMIT) {
      return {
        allowed: false,
        warning: `存储已满（${usage.formattedUsed}/${formatSize(STORAGE_CONFIG.TOTAL_HARD_LIMIT)}），请清理后继续`,
        usage,
      };
    }

    // 软限制警告
    if (usage.percentage >= STORAGE_CONFIG.WARNING_THRESHOLD) {
      return {
        allowed: true,
        warning: `存储空间即将用尽（${Math.round(usage.percentage * 100)}%），建议导出或清理`,
        usage,
      };
    }

    return { allowed: true, usage };
  }

  /**
   * 检查单条记录大小
   */
  checkRecordSize(data: unknown): {
    allowed: boolean;
    size: number;
    warning?: string;
  } {
    const size = JSON.stringify(data).length * 2;

    if (size > STORAGE_CONFIG.SINGLE_RECORD_LIMIT) {
      return {
        allowed: false,
        size,
        warning: `单条记录过大（${formatSize(size)}），需要截断`,
      };
    }

    return { allowed: true, size };
  }

  /**
   * 获取详细存储统计
   */
  async getDetailedStats(): Promise<{
    usage: StorageUsage;
    demandsCount: number;
    extractionsCount: number;
    demandsSize: number;
    extractionsSize: number;
  }> {
    const [demands, extractions] = await Promise.all([
      db.demands.toArray(),
      db.extractions.toArray(),
    ]);

    const demandsSize = demands.reduce(
      (sum, d) => sum + JSON.stringify(d).length * 2,
      0
    );
    const extractionsSize = extractions.reduce(
      (sum, e) => sum + JSON.stringify(e).length * 2,
      0
    );

    const usage = await this.getUsage();

    return {
      usage,
      demandsCount: demands.length,
      extractionsCount: extractions.length,
      demandsSize,
      extractionsSize,
    };
  }

  /**
   * 清理建议
   */
  async getCleanupSuggestions(): Promise<
    Array<{
      action: string;
      description: string;
      estimatedSavings: number;
    }>
  > {
    const suggestions: Array<{
      action: string;
      description: string;
      estimatedSavings: number;
    }> = [];

    // 检查已归档的需求
    const archivedDemands = await db.demands
      .where("archived")
      .equals(1)
      .toArray();
    if (archivedDemands.length > 0) {
      const size = archivedDemands.reduce(
        (sum, d) => sum + JSON.stringify(d).length * 2,
        0
      );
      suggestions.push({
        action: "delete_archived",
        description: `删除 ${archivedDemands.length} 个已归档的需求`,
        estimatedSavings: size,
      });
    }

    // 检查失败的提取记录
    const failedExtractions = await db.extractions
      .where("analysisStatus")
      .equals("failed")
      .toArray();
    if (failedExtractions.length > 0) {
      const size = failedExtractions.reduce(
        (sum, e) => sum + JSON.stringify(e).length * 2,
        0
      );
      suggestions.push({
        action: "delete_failed",
        description: `删除 ${failedExtractions.length} 个失败的提取记录`,
        estimatedSavings: size,
      });
    }

    // 检查旧的提取记录（30天前）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldExtractions = await db.extractions
      .filter((e) => e.capturedAt < thirtyDaysAgo && e.savedDemandCount === 0)
      .toArray();
    if (oldExtractions.length > 0) {
      const size = oldExtractions.reduce(
        (sum, e) => sum + JSON.stringify(e).length * 2,
        0
      );
      suggestions.push({
        action: "delete_old_unused",
        description: `删除 ${oldExtractions.length} 个 30 天前未保存需求的提取记录`,
        estimatedSavings: size,
      });
    }

    return suggestions;
  }
}

/**
 * 容量管理器单例
 */
export const capacityManager = new CapacityManager();
