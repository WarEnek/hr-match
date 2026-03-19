import type { H3Event } from "h3";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { matchAnalysisSchema } from "~/server/utils/schemas";

interface CandidateEvidence {
  source_type: "experience_bullet" | "project_bullet" | "skill";
  source_id: string;
  text: string;
  tags: string[];
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

export async function runMatchPipeline(event: H3Event, profileId: string, vacancyId: string) {
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

  if (!requirements?.length) {
    throw createAppError(400, "Vacancy requirements are missing. Parse the vacancy first.");
  }

  const candidateEvidence: CandidateEvidence[] = [
    ...(skills || []).map((skill: any) => ({
      source_type: "skill" as const,
      source_id: skill.id,
      text: `${skill.name} ${skill.level || ""}`.trim(),
      tags: skill.keywords || [],
    })),
    ...(experienceBullets || []).map((bullet: any) => ({
      source_type: "experience_bullet" as const,
      source_id: bullet.id,
      text: bullet.text_refined || bullet.text_raw || "",
      tags: [
        ...(bullet.tech_tags || []),
        ...(bullet.domain_tags || []),
        ...(bullet.result_tags || []),
        ...(bullet.seniority_tags || []),
      ],
    })),
    ...(projectBullets || []).map((bullet: any) => ({
      source_type: "project_bullet" as const,
      source_id: bullet.id,
      text: bullet.text_refined || bullet.text_raw || "",
      tags: [
        ...(bullet.tech_tags || []),
        ...(bullet.domain_tags || []),
        ...(bullet.result_tags || []),
      ],
    })),
  ].filter((item) => item.text.trim().length > 0);

  appLogger.info(
    "Match pipeline input snapshot.",
    buildRequestLogContext(event, {
      vacancyId,
      profileId,
      requirementCount: requirements.length,
      candidateEvidenceCount: candidateEvidence.length,
    }),
  );

  const requirementSummaries = requirements.map((requirement: any) => {
    const ranked = candidateEvidence
      .map((item) => {
        const score = computeOverlapScore(requirement.label, item);
        return {
          requirement_id: requirement.id,
          source_type: item.source_type,
          source_id: item.source_id,
          score: Number(score.toFixed(4)),
          reason:
            score > 0
              ? `Matched by keyword overlap against: ${item.text.slice(0, 140)}`
              : "No meaningful overlap detected.",
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
    };
  });

  const mustHaveRequirements = requirementSummaries.filter((item) => item.type === "must_have");
  const mustHaveCoverage = mustHaveRequirements.length
    ? mustHaveRequirements.filter((item) => item.coverage_score >= 0.5).length /
      mustHaveRequirements.length
    : 0;

  const allCoverageScores = requirementSummaries.map((item) => item.coverage_score);
  const averageCoverage = allCoverageScores.length
    ? allCoverageScores.reduce((sum, value) => sum + value, 0) / allCoverageScores.length
    : 0;
  const keywordCoverage = averageCoverage;
  const semanticSimilarity = Math.min(1, averageCoverage * 0.9 + 0.05);
  const leadingEvidenceScoreSum = requirementSummaries.reduce((sum, item) => {
    if (!item.evidence.length) {
      return sum;
    }

    return sum + item.evidence[0].score;
  }, 0);
  const evidenceStrength = requirementSummaries.length
    ? leadingEvidenceScoreSum / requirementSummaries.length
    : 0;

  const parsedJson = vacancy.parsed_json || {};
  const seniority = parsedJson.seniority || "";
  const domainTerms = Array.isArray(parsedJson.domain) ? parsedJson.domain : [];
  const profileHeadline = `${parsedJson.title || ""} ${seniority}`.trim().toLowerCase();
  const domainFitHits = domainTerms.filter((term: string) =>
    normalizeTokens(profileHeadline).includes(term.toLowerCase()),
  ).length;
  const seniorityBonus = seniority ? 0.1 : 0;
  const domainSeniorityFit = domainTerms.length
    ? Math.min(1, domainFitHits / domainTerms.length + seniorityBonus)
    : 0.2;

  const penalties: string[] = [];

  if (mustHaveRequirements.some((item) => item.coverage_score < 0.35)) {
    penalties.push("Critical must-have requirements are not sufficiently covered.");
  }

  if (candidateEvidence.length < 5) {
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

  const analysis = matchAnalysisSchema.parse({
    overall_score: Number(overallScore.toFixed(4)),
    must_have_coverage: Number(mustHaveCoverage.toFixed(4)),
    semantic_similarity: Number(semanticSimilarity.toFixed(4)),
    keyword_coverage: Number(keywordCoverage.toFixed(4)),
    evidence_strength: Number(evidenceStrength.toFixed(4)),
    domain_seniority_fit: Number(domainSeniorityFit.toFixed(4)),
    penalties,
    requirements: requirementSummaries,
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

  appLogger.info(
    "Match pipeline completed.",
    buildRequestLogContext(event, {
      vacancyId,
      profileId,
      overallScore: analysis.overall_score,
      mustHaveCoverage: analysis.must_have_coverage,
      penalties: analysis.penalties.length,
    }),
  );

  return {
    analysis,
    evidenceLinks,
  };
}
