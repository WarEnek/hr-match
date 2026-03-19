import type { H3Event } from "h3";

import { requestStructuredCompletion } from "~/server/services/novita/client";
import { getResolvedAiSettings } from "~/server/services/novita/settings";
import { buildEvidenceSelectorPrompt } from "~/server/services/prompts/evidence-selector";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { evidenceSelectorJsonSchema, evidenceSelectorResponseSchema } from "~/server/utils/schemas";

interface RerankCandidate {
  requirement_id: string;
  source_type: "experience_bullet" | "project_bullet" | "skill";
  source_id: string;
  score: number;
  keyword_score: number;
  semantic_score: number;
  reason: string;
  text: string;
}

interface RequirementSummaryForRerank {
  requirement_id: string;
  label: string;
  type: "must_have" | "nice_to_have" | "responsibility" | "domain" | "soft_signal";
  coverage_score: number;
  evidence: RerankCandidate[];
  semantic_top_score: number;
  keyword_top_score: number;
  has_stored_embedding: boolean;
}

export async function rerankRequirementEvidence(
  event: H3Event,
  requirementSummaries: RequirementSummaryForRerank[],
): Promise<{ summaries: RequirementSummaryForRerank[]; fallbackCount: number }> {
  const userId = event.context.userId;

  if (!userId) {
    return {
      summaries: requirementSummaries,
      fallbackCount: requirementSummaries.length,
    };
  }

  const settings = await getResolvedAiSettings(event, userId);
  let fallbackCount = 0;

  const summaries = await Promise.all(
    requirementSummaries.map(async (summary) => {
      const candidates = summary.evidence.slice(0, 5);

      if (candidates.length <= 1) {
        fallbackCount += 1;
        return summary;
      }

      try {
        const prompt = buildEvidenceSelectorPrompt(
          {
            label: summary.label,
            type: summary.type,
          },
          candidates.map((candidate) => ({
            source_type: candidate.source_type,
            source_id: candidate.source_id,
            text: candidate.text,
            keyword_score: candidate.keyword_score,
            semantic_score: candidate.semantic_score,
            combined_score: candidate.score,
          })),
        );

        const selection = await requestStructuredCompletion({
          event,
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          schemaName: "evidence_selector",
          jsonSchema: evidenceSelectorJsonSchema,
          validator: evidenceSelectorResponseSchema,
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          temperature: Math.min(settings.temperature, 0.2),
          maxTokens: Math.min(settings.maxTokens, 400),
        });

        const selectedEvidence = selection.best_matches
          .map((match) => {
            const candidate = candidates.find(
              (item) =>
                item.source_type === match.source_type && item.source_id === match.source_id,
            );

            if (!candidate) {
              return null;
            }

            return {
              ...candidate,
              score: Number(Math.max(candidate.score, match.score).toFixed(4)),
              reason: match.reason,
            };
          })
          .filter((candidate): candidate is RerankCandidate => Boolean(candidate))
          .sort((left, right) => right.score - left.score)
          .slice(0, 3);

        if (!selectedEvidence.length) {
          fallbackCount += 1;
          appLogger.warn(
            "Evidence rerank returned no valid matches, using fallback.",
            buildRequestLogContext(event, {
              requirementId: summary.requirement_id,
              candidateCount: candidates.length,
            }),
          );
          return summary;
        }

        appLogger.info(
          "Evidence rerank completed.",
          buildRequestLogContext(event, {
            requirementId: summary.requirement_id,
            candidateCount: candidates.length,
            rerankedCount: selectedEvidence.length,
            fallbackUsed: false,
          }),
        );

        return {
          ...summary,
          coverage_score: selectedEvidence[0]?.score || summary.coverage_score,
          evidence: selectedEvidence,
          semantic_top_score: selectedEvidence[0]?.semantic_score || summary.semantic_top_score,
          keyword_top_score: selectedEvidence[0]?.keyword_score || summary.keyword_top_score,
        };
      } catch (error) {
        fallbackCount += 1;
        appLogger.warn(
          "Evidence rerank failed, using deterministic fallback.",
          buildRequestLogContext(event, {
            requirementId: summary.requirement_id,
            candidateCount: candidates.length,
            fallbackUsed: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
        return summary;
      }
    }),
  );

  return {
    summaries,
    fallbackCount,
  };
}
