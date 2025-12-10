import type { AnalysisTask } from "@/shared/types/analysis-task";

/**
 * 简单的有限并发任务队列
 */
export class TaskQueue {
  private queue: AnalysisTask[] = [];
  private running = 0;

  constructor(
    private readonly processTask: (task: AnalysisTask) => Promise<void>,
    private readonly maxConcurrent = 3
  ) {}

  enqueue(task: AnalysisTask): void {
    this.queue.push(task);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.running >= this.maxConcurrent) {
      return;
    }

    const next = this.queue.shift();
    if (!next) return;

    this.running += 1;
    try {
      await this.processTask(next);
    } finally {
      this.running -= 1;
      void this.drain();
    }
  }
}
