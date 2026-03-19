export type RequirementType =
  | "must_have"
  | "nice_to_have"
  | "responsibility"
  | "domain"
  | "soft_signal";
export type EvidenceSourceType = "experience_bullet" | "project_bullet" | "skill";
export type EmbeddingSourceType = "experience_bullet" | "project_bullet" | "vacancy_requirement";
export type ResumeBulletSourceType = "experience_bullet" | "project_bullet";

export interface ResumeSectionVisibility {
  summary: boolean;
  skills: boolean;
  experience: boolean;
  projects: boolean;
  certifications: boolean;
  education: boolean;
  languages: boolean;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type VectorValue = string | number[] | null;

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

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

export interface SkillRecord {
  id: string;
  profile_id: string;
  name: string;
  category?: string | null;
  years?: number | null;
  level?: string | null;
  keywords: string[];
}

export interface ExperienceRecord {
  id: string;
  profile_id: string;
  company: string;
  role_title: string;
  employment_type?: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  domain_tags?: string[];
  stack_tags?: string[];
}

export interface ExperienceBulletRecord {
  id: string;
  experience_id: string;
  profile_id?: string;
  text_raw: string | null;
  text_refined: string | null;
  tech_tags?: string[];
  domain_tags?: string[];
  result_tags?: string[];
  seniority_tags?: string[];
  embedding?: VectorValue;
}

export interface ProjectRecord {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  url: string | null;
  domain_tags?: string[];
  stack_tags?: string[];
}

export interface ProjectBulletRecord {
  id: string;
  project_id: string;
  profile_id?: string;
  text_raw: string | null;
  text_refined: string | null;
  tech_tags?: string[];
  domain_tags?: string[];
  result_tags?: string[];
  embedding?: VectorValue;
}

export interface CertificationRecord {
  id: string;
  profile_id: string;
  name: string;
  issuer: string | null;
  issued_at: string | null;
  expires_at?: string | null;
  credential_url?: string | null;
}

export interface VacancyRecord {
  id: string;
  profile_id?: string;
  title: string | null;
  company: string | null;
  raw_text?: string;
  parsed_json?: VacancyParseResult | null;
  status?: string;
}

export interface VacancyRequirementRecord {
  id: string;
  vacancy_id: string;
  type: RequirementType;
  label: string;
  normalized_label?: string | null;
  weight?: number;
  embedding?: VectorValue;
}

export interface ResumeGenerationRecord {
  id: string;
  profile_id: string;
  vacancy_id: string;
  title: string;
  status: string;
  score: number | null;
  document_tree: ResumeDocumentTree;
  analysis_json: MatchAnalysis;
  pdf_path?: string | null;
}

export interface EvidenceLinkRecord extends MatchEvidence {
  id?: string;
  resume_generation_id?: string;
}

export interface AiSettingsRecord {
  id?: string;
  user_id: string;
  provider: string;
  base_url: string;
  model: string;
  api_key_encrypted: string | null;
  temperature: number;
  max_tokens: number;
}

export interface EmbeddingJobRecord {
  id: string;
  profile_id: string;
  source_type: EmbeddingSourceType;
  source_id: string;
  input_text: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: number;
  last_error: string | null;
  locked_at: string | null;
  processed_at: string | null;
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
  version?: number;
  sectionVisibility: ResumeSectionVisibility;
  profile: {
    fullName: string;
    headline: string | null;
    contacts: string[];
  };
  summary: string;
  skills: string[];
  experiences: ResumeDocumentExperience[];
  projects: ResumeDocumentProject[];
  certifications: Array<{
    id: string;
    name: string;
    issuer: string | null;
    issuedAt: string | null;
  }>;
  education: string[];
  languages: string[];
}

export interface ResumeDocumentBullet {
  sourceId: string;
  sourceType: ResumeBulletSourceType;
  text: string;
  included: boolean;
}

export interface ResumeDocumentExperience {
  id: string;
  company: string;
  roleTitle: string;
  location: string | null;
  dateRange: string;
  bullets: ResumeDocumentBullet[];
}

export interface ResumeDocumentProject {
  id: string;
  title: string;
  description: string;
  bullets: ResumeDocumentBullet[];
  url: string | null;
}

export interface VacancyListItem {
  id: string;
  title: string | null;
  company: string | null;
  status?: string;
  updated_at?: string;
}

export interface ResumeListItem {
  id: string;
  title: string;
  status?: string;
  score: number | null;
  updated_at?: string;
  created_at?: string;
  pdf_path?: string | null;
  pdf_url?: string | null;
  latest_export_job?: ExportJobRecord | null;
}

export interface ExportJobRecord {
  id: string;
  resume_generation_id: string;
  status: "pending" | "running" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
