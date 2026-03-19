import type { H3Event } from "h3";

import type {
  ExperienceBulletRecord,
  MatchAnalysis,
  SkillRecord,
  VacancyParseResult,
  VacancyRecord,
  VacancyRequirementRecord,
  EvidenceLinkRecord,
  ProjectBulletRecord,
} from "~/types";

import {
  buildEmbeddingInput,
  cosineSimilarity,
  generateDeterministicEmbedding,
  parseStoredEmbedding,
} from "~/server/services/embeddings/generator";
import { rerankRequirementEvidence } from "~/server/services/scoring/rerank";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { matchAnalysisSchema } from "~/server/utils/schemas";

interface CandidateEvidence {
  source_type: "experience_bullet" | "project_bullet" | "skill";
  source_id: string;
  text: string;
  tags: string[];
  embedding: number[];
  hasStoredEmbedding: boolean;
}

interface MatchComputationInput {
  vacancy: Pick<VacancyRecord, "parsed_json">;
  requirements: VacancyRequirementRecord[] | null | undefined;
  skills?: SkillRecord[] | null;
  experienceBullets?: ExperienceBulletRecord[] | null;
  projectBullets?: ProjectBulletRecord[] | null;
}

interface MatchArtifacts {
  analysis: MatchAnalysis;
  evidenceLinks: EvidenceLinkRecord[];
  candidateEvidenceCount: number;
  candidateEvidenceWithStoredEmbeddings: number;
  requirementsWithStoredEmbeddings: number;
  requirementSummaries: RequirementSummary[];
}

interface RequirementSummaryEvidence extends EvidenceLinkRecord {
  keyword_score: number;
  semantic_score: number;
  text: string;
}

interface RequirementSummary {
  requirement_id: string;
  label: string;
  type: "must_have" | "nice_to_have" | "responsibility" | "domain" | "soft_signal";
  coverage_score: number;
  evidence: RequirementSummaryEvidence[];
  semantic_top_score: number;
  keyword_top_score: number;
  has_stored_embedding: boolean;
}

const synonymMap: Record<string, string[]> = {
  js: ["javascript"],
  ts: ["typescript"],
  vue: ["vue.js", "vue3", "vue 3"],
  nuxt: ["nuxt3", "nuxt 3"],
  postgres: ["postgresql"],
  ci: ["continuous integration"],
  cd: ["continuous delivery", "continuous deployment"],
  llm: ["large language model"],
  ai: ["artificial intelligence"],
};

function normalizeTokens(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      const aliases = synonymMap[token];
      if (!aliases) {
        return [token];
      }

      return [token, ...aliases];
    });
}

function computeOverlapScore(requirement: string, evidence: CandidateEvidence) {
  const requirementTokens = new Set(normalizeTokens(requirement));
  const evidenceTokens = new Set([
    ...normalizeTokens(evidence.text),
    ...evidence.tags.flatMap((tag) => normalizeTokens(tag)),
  ]);
  let overlap = 0;

  for (const token of requirementTokens) {
    if (evidenceTokens.has(token)) {
      overlap += 1;
    }
  }

  if (!requirementTokens.size) {
    return 0;
  }

  const coverage = overlap / requirementTokens.size;
  const containsPhrase = evidence.text.toLowerCase().includes(requirement.toLowerCase());

  if (containsPhrase) {
    return Math.min(1, coverage + 0.25);
  }

  return Math.min(1, coverage);
}

function buildFallbackEmbedding(text: string, tags: string[]): number[] {
  return generateDeterministicEmbedding(buildEmbeddingInput(text, tags));
}

function finalizeMatchArtifacts(
  vacancy: Pick<VacancyRecord, "parsed_json">,
  requirementSummaries: RequirementSummary[],
  candidateEvidenceCount: number,
  candidateEvidenceWithStoredEmbeddings: number,
): MatchArtifacts {
  const mustHaveRequirements = requirementSummaries.filter((item) => item.type === "must_have");
  const mustHaveCoverage = mustHaveRequirements.length
    ? mustHaveRequirements.filter((item) => item.coverage_score >= 0.5).length /
      mustHaveRequirements.length
    : 0;

  const keywordCoverage = requirementSummaries.length
    ? requirementSummaries.reduce((sum, item) => sum + item.keyword_top_score, 0) /
      requirementSummaries.length
    : 0;
  const semanticSimilarity = requirementSummaries.length
    ? requirementSummaries.reduce((sum, item) => sum + item.semantic_top_score, 0) /
      requirementSummaries.length
    : 0;
  const evidenceStrength = requirementSummaries.length
    ? requirementSummaries.reduce((sum, item) => {
        if (!item.evidence.length) {
          return sum;
        }

        const supportBonus = Math.min(0.1, 0.05 * Math.max(0, item.evidence.length - 1));
        return sum + Math.min(1, item.evidence[0].score + supportBonus);
      }, 0) / requirementSummaries.length
    : 0;

  const parsedJson: VacancyParseResult = vacancy.parsed_json || {
    title: null,
    company: null,
    seniority: null,
    domain: [],
    must_have: [],
    nice_to_have: [],
    responsibilities: [],
    soft_signals: [],
  };
  const seniority =
    typeof parsedJson.seniority === "string" && parsedJson.seniority.length
      ? parsedJson.seniority
      : "";
  const domainTerms = Array.isArray(parsedJson.domain) ? parsedJson.domain : [];
  const profileHeadline = `${parsedJson.title || ""} ${seniority}`.trim().toLowerCase();
  const normalizedHeadlineTokens = normalizeTokens(profileHeadline);
  const domainFitHits = domainTerms.filter((term) => {
    if (typeof term !== "string") {
      return false;
    }

    return normalizedHeadlineTokens.includes(term.toLowerCase());
  }).length;
  const seniorityBonus = seniority ? 0.1 : 0;
  const domainSeniorityFit = domainTerms.length
    ? Math.min(1, domainFitHits / domainTerms.length + seniorityBonus)
    : 0.2;

  const penalties: string[] = [];

  if (mustHaveRequirements.some((item) => item.coverage_score < 0.35)) {
    penalties.push("Critical must-have requirements are not sufficiently covered.");
  }

  if (candidateEvidenceCount < 5) {
    penalties.push("Evidence pool is too small for reliable matching.");
  }

  const penaltyWeight = penalties.length ? 0.08 * penalties.length : 0;
  const overallScore = Math.max(
    0,
    0.4 * mustHaveCoverage +
      0.2 * semanticSimilarity +
      0.15 * keywordCoverage +
      0.15 * evidenceStrength +
      0.1 * domainSeniorityFit -
      penaltyWeight,
  );

  const analysis: MatchAnalysis = matchAnalysisSchema.parse({
    overall_score: Number(overallScore.toFixed(4)),
    must_have_coverage: Number(mustHaveCoverage.toFixed(4)),
    semantic_similarity: Number(semanticSimilarity.toFixed(4)),
    keyword_coverage: Number(keywordCoverage.toFixed(4)),
    evidence_strength: Number(evidenceStrength.toFixed(4)),
    domain_seniority_fit: Number(domainSeniorityFit.toFixed(4)),
    penalties,
    requirements: requirementSummaries.map((requirement) => ({
      requirement_id: requirement.requirement_id,
      label: requirement.label,
      type: requirement.type,
      coverage_score: requirement.coverage_score,
      evidence: requirement.evidence.map((evidence) => ({
        requirement_id: evidence.requirement_id,
        source_type: evidence.source_type,
        source_id: evidence.source_id,
        score: evidence.score,
        reason: evidence.reason,
      })),
    })),
  });

  const evidenceLinks = requirementSummaries.flatMap((requirement) =>
    requirement.evidence.map((evidence) => ({
      requirement_id: requirement.requirement_id,
      source_type: evidence.source_type,
      source_id: evidence.source_id,
      score: evidence.score,
      reason: evidence.reason,
    })),
  );

  return {
    analysis,
    evidenceLinks,
    candidateEvidenceCount,
    candidateEvidenceWithStoredEmbeddings,
    requirementsWithStoredEmbeddings: requirementSummaries.filter(
      (item) => item.has_stored_embedding,
    ).length,
    requirementSummaries,
  };
}

export function buildMatchArtifacts({
  vacancy,
  requirements,
  skills,
  experienceBullets,
  projectBullets,
}: MatchComputationInput): MatchArtifacts {
  if (!requirements?.length) {
    throw createAppError(400, "Vacancy requirements are missing. Parse the vacancy first.");
  }

  const candidateEvidence: CandidateEvidence[] = [
    ...(skills || []).map((skill) => ({
      source_type: "skill" as const,
      source_id: skill.id,
      text: `${skill.name} ${skill.level || ""}`.trim(),
      tags: skill.keywords || [],
      embedding: buildFallbackEmbedding(
        `${skill.name} ${skill.level || ""}`.trim(),
        skill.keywords || [],
      ),
      hasStoredEmbedding: false,
    })),
    ...(experienceBullets || []).map((bullet) => ({
      text: bullet.text_refined || bullet.text_raw || "",
      tags: [
        ...(bullet.tech_tags || []),
        ...(bullet.domain_tags || []),
        ...(bullet.result_tags || []),
        ...(bullet.seniority_tags || []),
      ],
      source_type: "experience_bullet" as const,
      source_id: bullet.id,
      embedding:
        parseStoredEmbedding(bullet.embedding) ||
        buildFallbackEmbedding(bullet.text_refined || bullet.text_raw || "", [
          ...(bullet.tech_tags || []),
          ...(bullet.domain_tags || []),
          ...(bullet.result_tags || []),
          ...(bullet.seniority_tags || []),
        ]),
      hasStoredEmbedding: Boolean(parseStoredEmbedding(bullet.embedding)),
    })),
    ...(projectBullets || []).map((bullet) => ({
      text: bullet.text_refined || bullet.text_raw || "",
      tags: [
        ...(bullet.tech_tags || []),
        ...(bullet.domain_tags || []),
        ...(bullet.result_tags || []),
      ],
      source_type: "project_bullet" as const,
      source_id: bullet.id,
      embedding:
        parseStoredEmbedding(bullet.embedding) ||
        buildFallbackEmbedding(bullet.text_refined || bullet.text_raw || "", [
          ...(bullet.tech_tags || []),
          ...(bullet.domain_tags || []),
          ...(bullet.result_tags || []),
        ]),
      hasStoredEmbedding: Boolean(parseStoredEmbedding(bullet.embedding)),
    })),
  ].filter((item) => item.text.trim().length > 0);

  const candidateEvidenceWithStoredEmbeddings = candidateEvidence.filter(
    (item) => item.hasStoredEmbedding,
  ).length;

  const requirementSummaries: RequirementSummary[] = requirements.map((requirement) => {
    const requirementEmbedding =
      parseStoredEmbedding(requirement.embedding) ||
      buildFallbackEmbedding(requirement.label, [requirement.normalized_label || ""]);
    const requirementHasStoredEmbedding = Boolean(parseStoredEmbedding(requirement.embedding));

    const ranked = candidateEvidence
      .map((item) => {
        const keywordScore = computeOverlapScore(requirement.label, item);
        const semanticScore = Math.max(0, cosineSimilarity(requirementEmbedding, item.embedding));
        const score = Number((0.45 * keywordScore + 0.55 * semanticScore).toFixed(4));
        let reason = "No meaningful overlap detected.";

        if (score > 0) {
          reason = `Keyword ${keywordScore.toFixed(2)} / semantic ${semanticScore.toFixed(2)} against: ${item.text.slice(0, 140)}`;
        }

        return {
          requirement_id: requirement.id,
          source_type: item.source_type,
          source_id: item.source_id,
          score,
          keyword_score: Number(keywordScore.toFixed(4)),
          semantic_score: Number(semanticScore.toFixed(4)),
          reason,
          text: item.text,
        };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    const bestScore = ranked[0]?.score || 0;

    return {
      requirement_id: requirement.id,
      label: requirement.label,
      type: requirement.type,
      coverage_score: Number(bestScore.toFixed(4)),
      evidence: ranked,
      semantic_top_score: ranked[0]?.semantic_score || 0,
      keyword_top_score: ranked[0]?.keyword_score || 0,
      has_stored_embedding: requirementHasStoredEmbedding,
    };
  });

  return finalizeMatchArtifacts(
    vacancy,
    requirementSummaries,
    candidateEvidence.length,
    candidateEvidenceWithStoredEmbeddings,
  );
}

export async function runMatchPipeline(
  event: H3Event,
  profileId: string,
  vacancyId: string,
): Promise<MatchArtifacts> {
  const supabase = createSupabaseServerClient(event);

  const [
    { data: vacancy, error: vacancyError },
    { data: requirements, error: requirementsError },
    { data: skills },
    { data: experienceBullets },
    { data: projectBullets },
  ] = await Promise.all([
    supabase
      .from("vacancies")
      .select("*")
      .eq("id", vacancyId)
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("vacancy_requirements")
      .select("*")
      .eq("vacancy_id", vacancyId)
      .order("weight", { ascending: false }),
    supabase.from("skills").select("*").eq("profile_id", profileId),
    supabase.from("experience_bullets").select("*").eq("profile_id", profileId),
    supabase.from("project_bullets").select("*").eq("profile_id", profileId),
  ]);

  if (vacancyError || !vacancy) {
    throw createAppError(404, "Vacancy not found.");
  }

  if (requirementsError) {
    throw createAppError(500, "Failed to load vacancy requirements.", {
      cause: requirementsError.message,
    });
  }

  const result = buildMatchArtifacts({
    vacancy: vacancy as VacancyRecord,
    requirements: requirements as VacancyRequirementRecord[],
    skills: skills as SkillRecord[],
    experienceBullets: experienceBullets as ExperienceBulletRecord[],
    projectBullets: projectBullets as ProjectBulletRecord[],
  });
  const rerankResult = await rerankRequirementEvidence(event, result.requirementSummaries);
  const finalResult =
    rerankResult.fallbackCount === result.requirementSummaries.length
      ? result
      : finalizeMatchArtifacts(
          vacancy as VacancyRecord,
          rerankResult.summaries,
          result.candidateEvidenceCount,
          result.candidateEvidenceWithStoredEmbeddings,
        );

  appLogger.info(
    "Match pipeline input snapshot.",
    buildRequestLogContext(event, {
      vacancyId,
      profileId,
      requirementCount: requirements.length,
      candidateEvidenceCount: result.candidateEvidenceCount,
      candidateEvidenceWithStoredEmbeddings: result.candidateEvidenceWithStoredEmbeddings,
      requirementsWithStoredEmbeddings: result.requirementsWithStoredEmbeddings,
      rerankFallbackCount: rerankResult.fallbackCount,
    }),
  );

  appLogger.info(
    "Match pipeline completed.",
    buildRequestLogContext(event, {
      vacancyId,
      profileId,
      overallScore: finalResult.analysis.overall_score,
      mustHaveCoverage: finalResult.analysis.must_have_coverage,
      penalties: finalResult.analysis.penalties.length,
    }),
  );

  return finalResult;
}
