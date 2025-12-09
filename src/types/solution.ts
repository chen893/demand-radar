export interface Solution {
  id: string;
  extractionId: string;
  solution: {
    title: string;
    description: string;
    targetUser: string;
    keyDifferentiators: string[];
  };
  validation: {
    painPoints: string[];
    competitors: string[];
    competitorGaps: string[];
    quotes: string[];
  };
  sourceUrl: string;
  sourceTitle: string;
  sourcePlatform: string;
  tags: string[];
  starred: boolean;
  archived: boolean;
  notes: string;
  groupId?: string;
  groupName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DuplicateAnalysisResult {
  groups: Array<{
    suggestedName: string;
    solutionIds: string[];
    reason: string;
  }>;
  uniqueSolutions: string[];
}
