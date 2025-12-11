import { db } from "../db";
import type {
  Demand,
  CreateDemandParams,
  UpdateDemandParams,
} from "@/shared/types/demand";
import { generateUUID } from "@/shared/utils/text-utils";

/**
 * Demand 仓储类
 * 负责产品方向的 CRUD 操作
 */
export class DemandRepository {
  /**
   * 创建新的产品方向
   */
  async create(params: CreateDemandParams): Promise<Demand> {
    const now = new Date();
    const demand: Demand = {
      id: generateUUID(),
      extractionId: params.extractionId,
      solution: params.solution,
      validation: params.validation,
      sourceUrl: params.sourceUrl,
      sourceTitle: params.sourceTitle,
      sourcePlatform: params.sourcePlatform,
      tags: params.tags || [],
      starred: false,
      archived: false,
      notes: "",
      createdAt: now,
      updatedAt: now,
    };

    await db.demands.add(demand);
    return demand;
  }

  /**
   * 批量创建产品方向
   */
  async createMany(paramsList: CreateDemandParams[]): Promise<Demand[]> {
    const now = new Date();
    const demands: Demand[] = paramsList.map((params) => ({
      id: generateUUID(),
      extractionId: params.extractionId,
      solution: params.solution,
      validation: params.validation,
      sourceUrl: params.sourceUrl,
      sourceTitle: params.sourceTitle,
      sourcePlatform: params.sourcePlatform,
      tags: params.tags || [],
      starred: false,
      archived: false,
      notes: "",
      createdAt: now,
      updatedAt: now,
    }));

    await db.demands.bulkAdd(demands);
    return demands;
  }

  /**
   * 根据 ID 获取产品方向
   */
  async getById(id: string): Promise<Demand | undefined> {
    return db.demands.get(id);
  }

  /**
   * 根据 ID 列表批量获取产品方向（保持传入顺序）
   */
  async getByIds(ids: string[]): Promise<Demand[]> {
    if (ids.length === 0) return [];
    const results = await db.demands.bulkGet(ids);
    return ids
      .map((id, idx) => results[idx] || undefined)
      .filter((demand): demand is Demand => demand !== undefined);
  }

  /**
   * 获取所有产品方向
   */
  async getAll(
    options: {
      limit?: number;
      offset?: number;
      starred?: boolean;
      archived?: boolean;
      tags?: string[];
    } = {}
  ): Promise<Demand[]> {
    let collection = db.demands.orderBy("createdAt").reverse();

    // 获取数组后进行过滤
    let results = await collection.toArray();

    // 过滤收藏
    if (options.starred !== undefined) {
      results = results.filter((d) => d.starred === options.starred);
    }

    // 过滤归档
    if (options.archived !== undefined) {
      results = results.filter((d) => d.archived === options.archived);
    }

    // 过滤标签
    if (options.tags && options.tags.length > 0) {
      results = results.filter((d) =>
        options.tags!.some((tag) => d.tags.includes(tag))
      );
    }

    // 应用分页
    if (options.offset) {
      results = results.slice(options.offset);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 获取收藏的产品方向
   */
  async getStarred(): Promise<Demand[]> {
    return db.demands.where("starred").equals(1).reverse().sortBy("createdAt");
  }

  /**
   * 获取已归档的产品方向
   */
  async getArchived(): Promise<Demand[]> {
    return db.demands.where("archived").equals(1).reverse().sortBy("createdAt");
  }

  /**
   * 根据提取记录 ID 获取产品方向
   */
  async getByExtractionId(extractionId: string): Promise<Demand[]> {
    return db.demands
      .where("extractionId")
      .equals(extractionId)
      .reverse()
      .toArray();
  }

  /**
   * 搜索产品方向
   */
  async search(query: string): Promise<Demand[]> {
    if (!query.trim()) {
      return this.getAll({ archived: false });
    }

    const lowerQuery = query.toLowerCase();
    return db.demands
      .filter(
        (d) =>
          !d.archived &&
          (d.solution.title.toLowerCase().includes(lowerQuery) ||
            d.solution.description.toLowerCase().includes(lowerQuery) ||
            d.solution.targetUser.toLowerCase().includes(lowerQuery) ||
            d.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
            d.validation.painPoints.some((p) =>
              p.toLowerCase().includes(lowerQuery)
            ) ||
            d.validation.competitors.some((c) =>
              c.toLowerCase().includes(lowerQuery)
            ))
      )
      .toArray();
  }

  /**
   * 更新产品方向
   */
  async update(id: string, updates: UpdateDemandParams): Promise<void> {
    await db.demands.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * 批量更新分组信息
   */
  async updateGroup(demandIds: string[], groupId: string | null, groupName: string | null): Promise<void> {
    const updates = demandIds.map((id) =>
      db.demands.update(id, {
        groupId: groupId ?? undefined,
        groupName: groupName ?? undefined,
        updatedAt: new Date(),
      })
    );
    await Promise.all(updates);
  }

  /**
   * 根据分组获取需求
   */
  async getByGroupId(groupId: string): Promise<Demand[]> {
    return db.demands.where("groupId").equals(groupId).toArray();
  }

  /**
   * 切换收藏状态
   */
  async toggleStarred(id: string): Promise<boolean> {
    const demand = await db.demands.get(id);
    if (!demand) {
      throw new Error(`Demand not found: ${id}`);
    }

    const newStarred = !demand.starred;
    await db.demands.update(id, {
      starred: newStarred,
      updatedAt: new Date(),
    });
    return newStarred;
  }

  /**
   * 切换归档状态
   */
  async toggleArchived(id: string): Promise<boolean> {
    const demand = await db.demands.get(id);
    if (!demand) {
      throw new Error(`Demand not found: ${id}`);
    }

    const newArchived = !demand.archived;
    await db.demands.update(id, {
      archived: newArchived,
      updatedAt: new Date(),
    });
    return newArchived;
  }

  /**
   * 添加标签
   */
  async addTag(id: string, tag: string): Promise<void> {
    const demand = await db.demands.get(id);
    if (!demand) {
      throw new Error(`Demand not found: ${id}`);
    }

    if (!demand.tags.includes(tag)) {
      await db.demands.update(id, {
        tags: [...demand.tags, tag],
        updatedAt: new Date(),
      });
    }
  }

  /**
   * 移除标签
   */
  async removeTag(id: string, tag: string): Promise<void> {
    const demand = await db.demands.get(id);
    if (!demand) {
      throw new Error(`Demand not found: ${id}`);
    }

    await db.demands.update(id, {
      tags: demand.tags.filter((t) => t !== tag),
      updatedAt: new Date(),
    });
  }

  /**
   * 更新笔记
   */
  async updateNotes(id: string, notes: string): Promise<void> {
    await db.demands.update(id, {
      notes,
      updatedAt: new Date(),
    });
  }

  /**
   * 删除产品方向
   */
  async delete(id: string): Promise<void> {
    await db.demands.delete(id);
  }

  /**
   * 批量删除
   */
  async deleteMany(ids: string[]): Promise<void> {
    await db.demands.bulkDelete(ids);
  }

  /**
   * 删除已归档的产品方向
   */
  async deleteArchived(): Promise<number> {
    const archived = await db.demands.where("archived").equals(1).toArray();
    const ids = archived.map((d) => d.id);
    await db.demands.bulkDelete(ids);
    return ids.length;
  }

  /**
   * 获取记录总数
   */
  async count(options: { starred?: boolean; archived?: boolean } = {}): Promise<number> {
    let results = await db.demands.toArray();

    if (options.starred !== undefined) {
      results = results.filter((d) => d.starred === options.starred);
    }

    if (options.archived !== undefined) {
      results = results.filter((d) => d.archived === options.archived);
    }

    return results.length;
  }

  /**
   * 获取所有使用的标签
   */
  async getAllTags(): Promise<string[]> {
    const demands = await db.demands.toArray();
    const tagsSet = new Set<string>();
    demands.forEach((d) => d.tags.forEach((tag) => tagsSet.add(tag)));
    return Array.from(tagsSet).sort();
  }

  /**
   * 获取存储使用量（字节）
   */
  async getStorageUsage(): Promise<number> {
    const allDemands = await db.demands.toArray();
    return allDemands.reduce((sum, d) => sum + JSON.stringify(d).length * 2, 0);
  }
}

/**
 * Demand 仓储单例
 */
export const demandRepo = new DemandRepository();
