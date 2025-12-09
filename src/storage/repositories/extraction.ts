import { db } from "./db";
import type {
  Extraction,
  CreateExtractionParams,
} from "@/shared/types/extraction";
import { generateUUID, truncateForStorage } from "@/shared/utils/text-utils";

/**
 * Extraction 仓储类
 * 负责提取记录的 CRUD 操作
 */
export class ExtractionRepository {
  /**
   * 创建新的提取记录
   */
  async create(params: CreateExtractionParams): Promise<Extraction> {
    const { originalText, summary, truncated, truncatedFields } =
      truncateForStorage({
        originalText: params.originalText,
        summary: params.summary,
      });

    const now = new Date();
    const extraction: Extraction = {
      id: generateUUID(),
      url: params.url,
      title: params.title,
      platform: params.platform,
      originalText,
      summary,
      analysisStatus: params.analysisStatus || "pending",
      demandCount: 0,
      savedDemandCount: 0,
      truncated: truncated || params.truncated || false,
      truncatedFields: truncatedFields.length > 0 ? truncatedFields : undefined,
      originalLength: params.originalLength,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.extractions.add(extraction);
    return extraction;
  }

  /**
   * 根据 ID 获取提取记录
   */
  async getById(id: string): Promise<Extraction | undefined> {
    return db.extractions.get(id);
  }

  /**
   * 根据 URL 获取提取记录
   */
  async getByUrl(url: string): Promise<Extraction | undefined> {
    return db.extractions.where("url").equals(url).first();
  }

  /**
   * 获取所有提取记录
   */
  async getAll(
    options: {
      limit?: number;
      offset?: number;
      status?: "completed" | "pending" | "failed";
    } = {}
  ): Promise<Extraction[]> {
    let query = db.extractions.orderBy("capturedAt").reverse();

    if (options.status) {
      query = db.extractions
        .where("analysisStatus")
        .equals(options.status)
        .reverse();
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query.toArray();
  }

  /**
   * 获取待分析的记录
   */
  async getPending(): Promise<Extraction[]> {
    return db.extractions
      .where("analysisStatus")
      .equals("pending")
      .reverse()
      .toArray();
  }

  /**
   * 更新提取记录
   */
  async update(
    id: string,
    updates: Partial<
      Pick<
        Extraction,
        | "summary"
        | "analysisStatus"
        | "demandCount"
        | "savedDemandCount"
        | "truncated"
        | "truncatedFields"
      >
    >
  ): Promise<void> {
    await db.extractions.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * 更新需求计数
   */
  async updateDemandCount(
    id: string,
    demandCount: number,
    savedDemandCount?: number
  ): Promise<void> {
    const updates: Partial<Extraction> = {
      demandCount,
      updatedAt: new Date(),
    };
    if (savedDemandCount !== undefined) {
      updates.savedDemandCount = savedDemandCount;
    }
    await db.extractions.update(id, updates);
  }

  /**
   * 删除提取记录
   */
  async delete(id: string): Promise<void> {
    await db.extractions.delete(id);
  }

  /**
   * 批量删除
   */
  async deleteMany(ids: string[]): Promise<void> {
    await db.extractions.bulkDelete(ids);
  }

  /**
   * 获取记录总数
   */
  async count(): Promise<number> {
    return db.extractions.count();
  }

  /**
   * 检查 URL 是否已存在
   */
  async existsByUrl(url: string): Promise<boolean> {
    const count = await db.extractions.where("url").equals(url).count();
    return count > 0;
  }
}

/**
 * Extraction 仓储单例
 */
export const extractionRepo = new ExtractionRepository();
