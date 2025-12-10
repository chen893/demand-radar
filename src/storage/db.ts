import Dexie, { type Table } from "dexie";
import type { Extraction } from "@/shared/types/extraction";
import type { Demand } from "@/shared/types/demand";
import type { ConfigItem } from "@/shared/types/config";

/**
 * 需求分组模型
 */
export interface DemandGroup {
  id: string;
  name: string;
  demandIds: string[];

  // 统计信息
  demandCount: number;
  platforms: string[];
  firstSeenAt: Date;
  lastSeenAt: Date;

  // LLM 分析结果
  commonPainPoints: string[];
  suggestedDifferentiators: string[];

  // 用户操作
  starred: boolean;
  notes?: string;

  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Demand Radar 数据库
 * 使用 Dexie.js 封装 IndexedDB
 */
export class DemandRadarDB extends Dexie {
  extractions!: Table<Extraction>;
  demands!: Table<Demand>;
  config!: Table<ConfigItem>;
  demandGroups!: Table<DemandGroup>;

  constructor() {
    super("DemandRadarDB");

    // 数据库版本 1
    this.version(1).stores({
      // 主键 + 索引
      extractions: "id, url, platform, capturedAt, analysisStatus",
      demands:
        "id, extractionId, *tags, starred, archived, groupId, createdAt, [starred+createdAt]",
      config: "key",
    });

    // v2.1: 数据库版本 2，添加需求分组表
    this.version(2).stores({
      extractions: "id, url, platform, capturedAt, analysisStatus",
      demands:
        "id, extractionId, *tags, starred, archived, groupId, createdAt, [starred+createdAt]",
      config: "key",
      demandGroups:
        "id, name, createdAt, [starred+createdAt], demandCount, firstSeenAt, lastSeenAt",
    }).upgrade((trans) => {
      // 数据迁移：为空需求添加默认分组
      return trans.table("demands").toCollection().modify((demand) => {
        if (!demand.groupId) {
          demand.groupId = null;
        }
      });
    });
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.transaction(
      "rw",
      [this.extractions, this.demands, this.demandGroups],
      async () => {
        await this.extractions.clear();
        await this.demands.clear();
        await this.demandGroups.clear();
      }
    );
  }

  /**
   * 导出所有数据
   */
  async exportAll(): Promise<{
    extractions: Extraction[];
    demands: Demand[];
    demandGroups: DemandGroup[];
    exportedAt: string;
    version: string;
  }> {
    const [extractions, demands, demandGroups] = await Promise.all([
      this.extractions.toArray(),
      this.demands.toArray(),
      this.demandGroups.toArray(),
    ]);

    return {
      extractions,
      demands,
      demandGroups,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * 导入数据
   */
  async importData(data: {
    extractions: Extraction[];
    demands: Demand[];
    demandGroups?: DemandGroup[];
  }): Promise<{ extractionsCount: number; demandsCount: number; demandGroupsCount: number }> {
    const result = await this.transaction(
      "rw",
      [this.extractions, this.demands, this.demandGroups],
      async () => {
        const extractionsCount = await this.extractions.bulkPut(
          data.extractions
        );
        const demandsCount = await this.demands.bulkPut(data.demands);
        const demandGroupsCount = data.demandGroups
          ? await this.demandGroups.bulkPut(data.demandGroups)
          : 0;
        return {
          extractionsCount:
            typeof extractionsCount === "number"
              ? extractionsCount
              : data.extractions.length,
          demandsCount:
            typeof demandsCount === "number"
              ? demandsCount
              : data.demands.length,
          demandGroupsCount:
            typeof demandGroupsCount === "number"
              ? demandGroupsCount
              : data.demandGroups?.length || 0,
        };
      }
    );

    return result;
  }
}

/**
 * 数据库单例
 */
export const db = new DemandRadarDB();
