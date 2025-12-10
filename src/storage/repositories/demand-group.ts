import { db } from "../db";
import type { DemandGroup } from "@/shared/types/demand-group";
import { generateUUID } from "@/shared/utils/text-utils";

export class DemandGroupRepository {
  async create(name: string, demandIds: string[], commonPainPoints: string[] = []): Promise<DemandGroup> {
    const now = new Date();
    const group: DemandGroup = {
      id: generateUUID(),
      name,
      demandIds,
      commonPainPoints,
      createdAt: now,
      updatedAt: now,
    };

    await db.demandGroups.add(group);
    return group;
  }

  async getAll(): Promise<DemandGroup[]> {
    return db.demandGroups.toArray();
  }

  async getById(id: string): Promise<DemandGroup | undefined> {
    return db.demandGroups.get(id);
  }

  async update(id: string, updates: Partial<DemandGroup>): Promise<void> {
    await db.demandGroups.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    await db.demandGroups.delete(id);
  }
}

export const demandGroupRepo = new DemandGroupRepository();
