export interface Extraction {
  id: string;
  url: string;
  title: string;
  platform: string;
  originalText: string;
  summary: string;
  analysisStatus: 'completed' | 'pending' | 'failed';
  solutionCount: number;
  savedSolutionCount: number;
  truncated: boolean;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionResult extends Omit<Extraction, 'id' | 'createdAt' | 'updatedAt'> {
  metadata?: Record<string, any>;
}
