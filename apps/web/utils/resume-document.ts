import type {
  JsonValue,
  ResumeDocumentBullet,
  ResumeDocumentExperience,
  ResumeDocumentProject,
  ResumeSectionVisibility,
  ResumeDocumentTree,
} from "~/types";

interface LegacyExperienceBlock {
  id?: string;
  company?: string;
  roleTitle?: string;
  location?: string | null;
  dateRange?: string;
  bullets?: Array<string | ResumeDocumentBullet>;
}

interface LegacyProjectBlock {
  id?: string;
  title?: string;
  description?: string;
  bullets?: Array<string | ResumeDocumentBullet>;
  url?: string | null;
}

function isResumeDocumentBullet(value: unknown): value is ResumeDocumentBullet {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ResumeDocumentBullet>;
  return (
    typeof candidate.sourceId === "string" &&
    (candidate.sourceType === "experience_bullet" || candidate.sourceType === "project_bullet") &&
    typeof candidate.text === "string" &&
    typeof candidate.included === "boolean"
  );
}

function normalizeBullet(
  value: string | ResumeDocumentBullet,
  sourceType: ResumeDocumentBullet["sourceType"],
  fallbackPrefix: string,
  index: number,
): ResumeDocumentBullet {
  if (isResumeDocumentBullet(value)) {
    return value;
  }

  return {
    sourceId: `${fallbackPrefix}-${index + 1}`,
    sourceType,
    text: value,
    included: true,
  };
}

function normalizeExperienceBlock(block: LegacyExperienceBlock): ResumeDocumentExperience {
  return {
    id: block.id || crypto.randomUUID(),
    company: block.company || "Unknown company",
    roleTitle: block.roleTitle || "Unknown role",
    location: block.location || null,
    dateRange: block.dateRange || "Unknown period",
    bullets: (block.bullets || []).map((bullet, index) =>
      normalizeBullet(bullet, "experience_bullet", block.id || "experience", index),
    ),
  };
}

function normalizeProjectBlock(block: LegacyProjectBlock): ResumeDocumentProject {
  return {
    id: block.id || crypto.randomUUID(),
    title: block.title || "Untitled project",
    description: block.description || "",
    bullets: (block.bullets || []).map((bullet, index) =>
      normalizeBullet(bullet, "project_bullet", block.id || "project", index),
    ),
    url: block.url || null,
  };
}

function normalizeSectionVisibility(
  value: Partial<ResumeSectionVisibility> | undefined,
): ResumeSectionVisibility {
  return {
    summary: value?.summary ?? true,
    skills: value?.skills ?? true,
    experience: value?.experience ?? true,
    projects: value?.projects ?? true,
    certifications: value?.certifications ?? true,
    education: value?.education ?? true,
    languages: value?.languages ?? true,
  };
}

export function normalizeResumeDocumentTree(
  input: JsonValue | ResumeDocumentTree,
): ResumeDocumentTree {
  const value = input as Partial<ResumeDocumentTree>;

  return {
    version: 2,
    sectionVisibility: normalizeSectionVisibility(value.sectionVisibility),
    profile: {
      fullName: value.profile?.fullName || "Unnamed Candidate",
      headline: value.profile?.headline || null,
      contacts: value.profile?.contacts || [],
    },
    summary: value.summary || "",
    skills: value.skills || [],
    experiences: ((value.experiences as LegacyExperienceBlock[] | undefined) || []).map(
      normalizeExperienceBlock,
    ),
    projects: ((value.projects as LegacyProjectBlock[] | undefined) || []).map(
      normalizeProjectBlock,
    ),
    certifications: value.certifications || [],
    education: value.education || [],
    languages: value.languages || [],
  };
}

export function getIncludedTextCount(documentTree: ResumeDocumentTree): number {
  const experienceCount = documentTree.experiences.reduce(
    (sum, experience) => sum + experience.bullets.filter((bullet) => bullet.included).length,
    0,
  );
  const projectCount = documentTree.projects.reduce(
    (sum, project) => sum + project.bullets.filter((bullet) => bullet.included).length,
    0,
  );

  return experienceCount + projectCount;
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];

  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= nextItems.length ||
    toIndex >= nextItems.length ||
    fromIndex === toIndex
  ) {
    return nextItems;
  }

  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}
