/**
 * 需求分组仓储
 * v2.1: 管理需求分组的 CRUD 操作
 */

import { db, type DemandGroup } from "../db";
import type { Demand } from "@/shared/types/demand";
import { generateId } from "@/shared/utils/text-utils";

/**
 * 创建分组参数
 */
export interface CreateGroupParams {
  name: string;
  demandIds: string[];
  demands: Demand[];
  commonPainPoints?: string[];
  suggestedDifferentiators?: string[];
  notes?: string;
}

/**
 * 更新分组参数
 */
export interface UpdateGroupParams {
  id: string;
  name?: string;
  notes?: string;
  starred?: boolean;
}

/**
 * 需求分组仓储类
 */
export class DemandGroupRepository {
  /**
   * 创建新分组
   */
  async create(params: CreateGroupParams): Promise<DemandGroup> {
    const now = new Date();

    // 获取需求的时间范围
    const demandDates = params.demands.map((d) => d.createdAt).sort((a, b) => a.getTime() - b.getTime());

    const group: DemandGroup = {
      id: generateId(),
      name: params.name,
      demandIds: params.demandIds,
      demandCount: params.demandIds.length,
      platforms: [...new Set(params.demands.map((d) => d.sourcePlatform))],
      firstSeenAt: demandDates[0] || now,
      lastSeenAt: demandDates[demandDates.length - 1] || now,
      commonPainPoints: params.commonPainPoints || [],
      suggestedDifferentiators: params.suggestedDifferentiators || [],
      starred: false,
      notes: params.notes,
      createdAt: now,
      updatedAt: now,
    };

    await db.demandGroups.add(group);

    // 更新需求的分组 ID
    await this.updateDemandGroupIds(params.demandIds, group.id);

    return group;
  }

  /**
   * 根据 ID 获取分组
   */
  async getById(id: string): Promise<DemandGroup | undefined> {
    return db.demandGroups.get(id);
  }

  /**
   * 获取所有分组
   */
  async getAll(options?: { starred?: boolean }): Promise<DemandGroup[]> {
    let query = db.demandGroups.orderBy("createdAt").reverse();

    if (options?.starred !== undefined) {
      query = query.filter((g) => g.starred === options.starred);
    }

    return query.toArray();
  }

  /**
   * 获取分组的完整信息（包括需求列表）
   */
  async getWithDemands(id: string): Promise<{ group: DemandGroup; demands: Demand[] } | null> {
    const group = await this.getById(id);
    if (!group) return null;

    const demands = await db.demands
      .where("id")
      .anyOf(group.demandIds)
      .toArray();

    return { group, demands };
  }

  /**
   * 更新分组
   */
  async update(id: string, updates: Partial<UpdateGroupParams>): Promise<void> {
    const group = await this.getById(id);
    if (!group) {
      throw new Error("分组不存在");
    }

    const updatedGroup: Partial<DemandGroup> = {
      ...updates,
      updatedAt: new Date(),
    };

    await db.demandGroups.update(id, updatedGroup);
  }

  /**
   * 删除分组
   */
  async delete(id: string): Promise<void> {
    const group = await this.getById(id);
    if (!group) return;

    // 清除需求的分组 ID
    await this.updateDemandGroupIds(group.demandIds, null);

    // 删除分组
    await db.demandGroups.delete(id);
  }

  /**
   * 切换分组收藏状态
   */
  async toggleStar(id: string): Promise<void> {
    const group = await this.getById(id);
    if (!group) return;

    await db.demandGroups.update(id, {
      starred: !group.starred,
      updatedAt: new Date(),
    });
  }

  /**
   * 解散分组（将需求移出分组但不删除分组）
   */
  async dissolve(id: string): Promise<void> {
    const group = await this.getById(id);
    if (!group) return;

    // 清除需求的分组 ID
    await this.updateDemandGroupIds(group.demandIds, null);

    // 删除分组
    await db.demandGroups.delete(id);
  }

  /**
   * 获取分组的统计信息
   */
  async getStats(id: string): Promise<{
    totalDemands: number;
    platforms: string[];
    dateRange: { first: Date; last: Date };
    starredDemands: number;
  } | null> {
    const group = await this.getById(id);
    if (!group) return null;

    const demands = await db.demands
      .where("id")
      .anyOf(group.demandIds)
      .toArray();

    return {
      totalDemands: demands.length,
      platforms: [...new Set(demands.map((d) => d.sourcePlatform))],
      dateRange: {
        first: group.firstSeenAt,
        last: group.lastSeenAt,
      },
      starredDemands: demands.filter((d) => d.starred).length,
    };
  }

  /**
   * 更新需求的分组 ID
   */
  private async updateDemandGroupIds(demandIds: string[], groupId: string | null): Promise<void> {
    await db.demands
      .where("id")
      .anyOf(demandIds)
      .modify((demand) => {
        demand.groupId = groupId || undefined;
        if (groupId) {
          demand.groupName = undefined; // 分组名称冗余存储，可根据需要更新
          demand.addedToGroupAt = new Date();
        } else {
          demand.addedToGroupAt = undefined;
        }
      });
  }

  /**
   * 搜索分组
   */
  async search(query: string): Promise<DemandGroup[]> {
    const lowerQuery = query.toLowerCase();
    return db.demandGroups
      .filter((group) => {
        return Boolean(
          group.name.toLowerCase().includes(lowerQuery) ||
            group.notes?.toLowerCase().includes(lowerQuery)
        );
      })
      .toArray();
  }

  /**
   * 获取已分组的数量统计
   */
  async getGroupedCount(): Promise<number> {
    return db.demandGroups.count();
  }

  /**
   * 获取需求总数统计
   */
  async getTotalDemandCount(): Promise<number> {
    return db.demands.count();
  }
}

/**
 * 需求分组仓储单例
 */
export const demandGroupRepo = new DemandGroupRepository();
