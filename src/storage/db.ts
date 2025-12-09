import Dexie, { type Table } from "dexie";
import type { Extraction } from "@/shared/types/extraction";
import type { Demand } from "@/shared/types/demand";
import type { ConfigItem } from "@/shared/types/config";

/**
 * Demand Radar 数据库
 * 使用 Dexie.js 封装 IndexedDB
 */
export class DemandRadarDB extends Dexie {
  extractions!: Table<Extraction>;
  demands!: Table<Demand>;
  config!: Table<ConfigItem>;

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

    // 可以在这里添加数据迁移逻辑
    // this.version(2).stores({...}).upgrade(...)
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.transaction("rw", [this.extractions, this.demands], async () => {
      await this.extractions.clear();
      await this.demands.clear();
    });
  }

  /**
   * 导出所有数据
   */
  async exportAll(): Promise<{
    extractions: Extraction[];
    demands: Demand[];
    exportedAt: string;
    version: string;
  }> {
    const [extractions, demands] = await Promise.all([
      this.extractions.toArray(),
      this.demands.toArray(),
    ]);

    return {
      extractions,
      demands,
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
  }): Promise<{ extractionsCount: number; demandsCount: number }> {
    const result = await this.transaction(
      "rw",
      [this.extractions, this.demands],
      async () => {
        const extractionsCount = await this.extractions.bulkPut(
          data.extractions
        );
        const demandsCount = await this.demands.bulkPut(data.demands);
        return {
          extractionsCount:
            typeof extractionsCount === "number"
              ? extractionsCount
              : data.extractions.length,
          demandsCount:
            typeof demandsCount === "number"
              ? demandsCount
              : data.demands.length,
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
