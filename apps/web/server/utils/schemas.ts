import { z } from "zod";

const nullableTrimmedString = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
});

const stringArray = z.array(z.string().trim().min(1)).default([]);

export const authSessionSchema = z.object({
  mode: z.enum(["sign_in", "sign_up"]),
  email: z.string().email(),
  password: z.string().min(8),
});

export const profileUpsertSchema = z.object({
  full_name: z.string().trim().min(2),
  headline: nullableTrimmedString,
  email: nullableTrimmedString,
  phone: nullableTrimmedString,
  location: nullableTrimmedString,
  linkedin_url: nullableTrimmedString,
  github_url: nullableTrimmedString,
  website_url: nullableTrimmedString,
  summary_default: nullableTrimmedString,
});

export const vacancyCreateSchema = z.object({
  title: nullableTrimmedString,
  company: nullableTrimmedString,
  raw_text: z.string().trim().min(20),
});

export const vacancyParserResponseSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  seniority: z.enum(["junior", "middle", "senior", "lead"]).nullable(),
  domain: stringArray,
  must_have: stringArray,
  nice_to_have: stringArray,
  responsibilities: stringArray,
  soft_signals: stringArray,
});

export const requirementNormalizerResponseSchema = z.object({
  normalized_label: z.string().trim().min(1),
  aliases: stringArray,
  category: z.enum(["tech", "domain", "responsibility", "soft_signal"]),
  keywords: stringArray,
});

export const evidenceSelectorResponseSchema = z.object({
  best_matches: z
    .array(
      z.object({
        source_type: z.enum(["experience_bullet", "project_bullet", "skill"]),
        source_id: z.string().uuid(),
        score: z.number().min(0).max(1),
        reason: z.string().trim().min(1),
      }),
    )
    .max(5),
});

export const summaryComposerResponseSchema = z.object({
  summary: z.string().trim().min(20).max(700),
});

export const aiSettingsInputSchema = z.object({
  provider: z.string().trim().min(1).default("novita"),
  base_url: z.string().url(),
  model: z.string().trim().min(1),
  api_key: z.string().trim().optional().default(""),
  temperature: z.number().min(0).max(1).default(0.2),
  max_tokens: z.number().int().min(128).max(4096).default(900),
});

export const aiTestSchema = aiSettingsInputSchema;

export const resumeGenerateSchema = z.object({
  vacancyId: z.string().uuid(),
});

export const documentTreeSchema = z.object({
  profile: z.object({
    fullName: z.string().trim().min(1),
    headline: z.string().nullable(),
    contacts: z.array(z.string().trim().min(1)),
  }),
  summary: z.string().trim().min(1),
  skills: z.array(z.string().trim().min(1)),
  experiences: z.array(
    z.object({
      id: z.string().uuid(),
      company: z.string().trim().min(1),
      roleTitle: z.string().trim().min(1),
      location: z.string().nullable(),
      dateRange: z.string().trim().min(1),
      bullets: z.array(z.string().trim().min(1)),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      bullets: z.array(z.string().trim().min(1)),
      url: z.string().nullable(),
    }),
  ),
  certifications: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1),
      issuer: z.string().nullable(),
      issuedAt: z.string().nullable(),
    }),
  ),
  education: z.array(z.string().trim().min(1)),
  languages: z.array(z.string().trim().min(1)),
});

export const resumeUpdateSchema = z.object({
  title: z.string().trim().min(1),
  document_tree: documentTreeSchema,
});

export const matchAnalysisSchema = z.object({
  overall_score: z.number().min(0).max(1),
  must_have_coverage: z.number().min(0).max(1),
  semantic_similarity: z.number().min(0).max(1),
  keyword_coverage: z.number().min(0).max(1),
  evidence_strength: z.number().min(0).max(1),
  domain_seniority_fit: z.number().min(0).max(1),
  penalties: z.array(z.string()),
  requirements: z.array(
    z.object({
      requirement_id: z.string().uuid(),
      label: z.string(),
      type: z.enum(["must_have", "nice_to_have", "responsibility", "domain", "soft_signal"]),
      coverage_score: z.number().min(0).max(1),
      evidence: z.array(
        z.object({
          requirement_id: z.string().uuid(),
          source_type: z.enum(["experience_bullet", "project_bullet", "skill"]),
          source_id: z.string().uuid(),
          score: z.number().min(0).max(1),
          reason: z.string(),
        }),
      ),
    }),
  ),
});

export const vacancyParserJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "company",
    "seniority",
    "domain",
    "must_have",
    "nice_to_have",
    "responsibilities",
    "soft_signals",
  ],
  properties: {
    title: { type: ["string", "null"] },
    company: { type: ["string", "null"] },
    seniority: { type: ["string", "null"], enum: ["junior", "middle", "senior", "lead", null] },
    domain: { type: "array", items: { type: "string" } },
    must_have: { type: "array", items: { type: "string" } },
    nice_to_have: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } },
    soft_signals: { type: "array", items: { type: "string" } },
  },
};

export const summaryComposerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string" },
  },
};
