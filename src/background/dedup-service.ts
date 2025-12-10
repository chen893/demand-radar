import * as z from "zod";
import { ProviderFactory } from "./llm/provider-factory";
import { DEDUP_ANALYSIS_PROMPT } from "./llm/prompt-templates";
import type { LLMConfig } from "@/shared/types/config";

export interface DemandForDedup {
  id: string;
  title: string;
  description: string;
  targetUser?: string;
  differentiators?: string[];
}

const DedupResultSchema = z.object({
  groups: z
    .array(
      z.object({
        suggestedName: z.string(),
        demandIds: z.array(z.string()),
        reason: z.string(),
        commonPainPoints: z.array(z.string()).optional(),
      })
    )
    .default([]),
  uniqueDemands: z.array(z.string()).default([]),
});

export type DedupResult = z.infer<typeof DedupResultSchema>;

export class DedupService {
  async analyze(
    demands: DemandForDedup[],
    llmConfig: LLMConfig
  ): Promise<DedupResult> {
    const model = ProviderFactory.create(llmConfig);
    const structured = model.withStructuredOutput(DedupResultSchema, {
      strict: true,
    });

    const prompt = DEDUP_ANALYSIS_PROMPT.replace(
      "{demands}",
      this.formatDemands(demands)
    );

    return (await structured.invoke(prompt)) as DedupResult;
  }

  private formatDemands(demands: DemandForDedup[]): string {
    return demands
      .map(
        (d) => `
ID: ${d.id}
标题: ${d.title}
描述: ${d.description}
目标用户: ${d.targetUser || ""}
差异点: ${(d.differentiators || []).join(", ")}
`
      )
      .join("\n---\n");
  }
}
