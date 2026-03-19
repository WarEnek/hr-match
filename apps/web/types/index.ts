export type RequirementType =
  | "must_have"
  | "nice_to_have"
  | "responsibility"
  | "domain"
  | "soft_signal";
export type EvidenceSourceType = "experience_bullet" | "project_bullet" | "skill";

export interface ProfileRecord {
  id: string;
  user_id: string;
  full_name: string;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  summary_default: string | null;
  created_at: string;
  updated_at: string;
}

export interface VacancyParseResult {
  title: string | null;
  company: string | null;
  seniority: "junior" | "middle" | "senior" | "lead" | null;
  domain: string[];
  must_have: string[];
  nice_to_have: string[];
  responsibilities: string[];
  soft_signals: string[];
}

export interface MatchEvidence {
  requirement_id: string;
  source_type: EvidenceSourceType;
  source_id: string;
  score: number;
  reason: string;
}

export interface MatchAnalysis {
  overall_score: number;
  must_have_coverage: number;
  semantic_similarity: number;
  keyword_coverage: number;
  evidence_strength: number;
  domain_seniority_fit: number;
  penalties: string[];
  requirements: Array<{
    requirement_id: string;
    label: string;
    type: RequirementType;
    coverage_score: number;
    evidence: MatchEvidence[];
  }>;
}

export interface ResumeDocumentTree {
  profile: {
    fullName: string;
    headline: string | null;
    contacts: string[];
  };
  summary: string;
  skills: string[];
  experiences: Array<{
    id: string;
    company: string;
    roleTitle: string;
    location: string | null;
    dateRange: string;
    bullets: string[];
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    bullets: string[];
    url: string | null;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string | null;
    issuedAt: string | null;
  }>;
  education: string[];
  languages: string[];
}
