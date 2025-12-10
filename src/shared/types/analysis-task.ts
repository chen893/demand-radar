import type { AnalysisResultPayload } from "./messages";

export type AnalysisTaskStatus =
  | "pending"
  | "extracting"
  | "analyzing"
  | "completed"
  | "error";

export interface AnalysisTaskError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AnalysisTask {
  id: string;
  source: {
    url: string;
    title: string;
    platform: string;
    favicon?: string;
  };
  status: AnalysisTaskStatus;
  progress?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: AnalysisResultPayload;
  error?: AnalysisTaskError;
}
