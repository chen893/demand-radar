/**
 * 任务队列处理器
 * v2.1: 管理分析任务的并发执行，支持批量分析
 */

import type { AnalysisTask } from "@/shared/types/messages";
import { MessageType } from "@/shared/types/messages";

/**
 * 任务处理器接口
 * 定义如何处理单个分析任务
 */
export interface TaskProcessor {
  processTask(task: AnalysisTask): Promise<void>;
}

/**
 * 任务队列配置
 */
export interface TaskQueueConfig {
  maxConcurrent: number; // 最大并发数
  taskTimeout: number; // 单任务超时时间（毫秒）
  retryAttempts: number; // 失败重试次数
}

/**
 * 任务队列类
 * 负责管理任务的分发和并发控制
 */
export class TaskQueue {
  private config: TaskQueueConfig;
  private running: number = 0;
  private processor: TaskProcessor;
  private isProcessing: boolean = false;

  constructor(processor: TaskProcessor, config?: Partial<TaskQueueConfig>) {
    this.processor = processor;
    this.config = {
      maxConcurrent: 3,
      taskTimeout: 60000, // 60秒
      retryAttempts: 1,
      ...config,
    };
  }

  /**
   * 开始处理任务队列
   * 从 Zustand store 中获取待处理的任务并执行
   */
  async process(): Promise<void> {
    if (this.isProcessing) {
      console.log("[TaskQueue] 队列已在运行中");
      return;
    }

    this.isProcessing = true;
    console.log("[TaskQueue] 开始处理任务队列");

    try {
      // 注意：这里需要从 Side Panel 的 store 获取任务
      // 由于 Background Script 无法直接访问 Zustand store，
      // 需要通过消息通信或使用 SharedWorker
      // 简化实现：依赖外部调用 processNext

      await this.processNext();
    } finally {
      this.isProcessing = false;
      console.log("[TaskQueue] 队列处理完成");
    }
  }

  /**
   * 处理下一个待处理任务
   */
  private async processNext(): Promise<void> {
    // 获取待处理任务（需要从 Side Panel 获取）
    const pendingTasks = await this.getPendingTasks();

    for (const task of pendingTasks) {
      // 等待有可用的并发槽位
      if (this.running >= this.config.maxConcurrent) {
        await this.waitForSlot();
      }

      // 启动任务
      this.running++;
      this.processTask(task)
        .catch((error) => {
          console.error(`[TaskQueue] 任务执行失败:`, error);
        })
        .finally(() => {
          this.running--;
          // 继续处理下一个任务
          this.processNext();
        });
    }
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: AnalysisTask): Promise<void> {
    console.log(`[TaskQueue] 开始处理任务: ${task.id}`);

    try {
      // 设置超时控制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`任务超时 (${this.config.taskTimeout}ms)`));
        }, this.config.taskTimeout);
      });

      // 执行任务或超时
      await Promise.race([this.processor.processTask(task), timeoutPromise]);

      console.log(`[TaskQueue] 任务完成: ${task.id}`);
    } catch (error) {
      console.error(`[TaskQueue] 任务失败: ${task.id}`, error);

      // 检查是否需要重试
      if (!task.error || task.error.retryable) {
        // 这里可以添加重试逻辑
        // 简化实现：直接标记失败
      }
    }
  }

  /**
   * 等待有可用的并发槽位
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.running < this.config.maxConcurrent) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * 获取待处理任务
   * 注意：这是一个抽象方法，需要由调用者实现
   */
  private async getPendingTasks(): Promise<AnalysisTask[]> {
    // 由于 Background Script 无法直接访问 Zustand store，
    // 这里需要通过消息与 Side Panel 通信
    // 简化实现：返回空数组，实际使用时需要替换

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_PENDING_TASKS },
        (response) => {
          if (response?.success) {
            resolve(response.data || []);
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(
    taskId: string,
    status: AnalysisTask["status"],
    data?: Partial<AnalysisTask>
  ): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.TASK_STATUS_UPDATED,
        payload: { taskId, status, data },
      })
      .catch((error) => {
        console.error("[TaskQueue] 更新任务状态失败:", error);
      });
  }

  /**
   * 设置任务结果
   */
  setTaskResult(taskId: string, result: AnalysisTask["result"]): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.TASK_COMPLETED,
        payload: { taskId, result },
      })
      .catch((error) => {
        console.error("[TaskQueue] 设置任务结果失败:", error);
      });
  }

  /**
   * 设置任务错误
   */
  setTaskError(taskId: string, error: AnalysisTask["error"]): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.TASK_ERROR,
        payload: { taskId, error },
      })
      .catch((error) => {
        console.error("[TaskQueue] 设置任务错误失败:", error);
      });
  }

  /**
   * 取消所有待处理任务
   */
  cancelAll(): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.CANCEL_ALL_TASKS,
      })
      .catch((error) => {
        console.error("[TaskQueue] 取消任务失败:", error);
      });
  }

  /**
   * 获取队列统计信息
   */
  getStats(): { running: number; maxConcurrent: number } {
    return {
      running: this.running,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    this.isProcessing = false;
  }
}

/**
 * 默认任务处理器
 * 处理分析任务的主要逻辑
 */
export class DefaultTaskProcessor implements TaskProcessor {
  async processTask(task: AnalysisTask): Promise<void> {
    // 1. 更新状态为 extracting
    this.updateStatus(task.id, "extracting");

    try {
      // 2. 提取内容（如果尚未提取）
      // 这里应该调用内容提取逻辑
      // 简化实现：假设内容已提取

      // 3. 更新状态为 analyzing
      this.updateStatus(task.id, "analyzing", { progress: 0 });

      // 4. 调用 LLM 分析
      // 这里应该调用实际的 LLM 服务
      // 简化实现：模拟分析过程

      // 模拟进度更新
      for (let progress = 10; progress <= 100; progress += 10) {
        await this.sleep(200);
        this.updateStatus(task.id, "analyzing", { progress });
      }

      // 5. 模拟分析结果
      const mockResult = {
        extractionId: "ext_" + Date.now(),
        summary: "模拟分析摘要",
        demands: [],
      };

      // 6. 设置任务结果
      this.setResult(task.id, mockResult);

      console.log(`[DefaultTaskProcessor] 任务完成: ${task.id}`);
    } catch (error) {
      console.error(`[DefaultTaskProcessor] 任务失败: ${task.id}`, error);

      // 设置错误状态
      this.setError(task.id, {
        code: "PROCESSING_ERROR",
        message: error instanceof Error ? error.message : "处理失败",
        retryable: true,
      });
    }
  }

  private updateStatus(
    taskId: string,
    status: AnalysisTask["status"],
    data?: Partial<AnalysisTask>
  ): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.TASK_STATUS_UPDATED,
        payload: { taskId, status, data },
      })
      .catch((error) => {
        console.error("更新任务状态失败:", error);
      });
  }

  private setResult(taskId: string, result: AnalysisTask["result"]): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.TASK_COMPLETED,
        payload: { taskId, result },
      })
      .catch((error) => {
        console.error("设置任务结果失败:", error);
      });
  }

  private setError(taskId: string, error: AnalysisTask["error"]): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.TASK_ERROR,
        payload: { taskId, error },
      })
      .catch((error) => {
        console.error("设置任务错误失败:", error);
      });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 全局任务队列实例
 */
export const taskQueue = new TaskQueue(new DefaultTaskProcessor(), {
  maxConcurrent: 3,
  taskTimeout: 60000,
  retryAttempts: 1,
});
