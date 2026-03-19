import type {
  CertificationRecord,
  ExperienceBulletRecord,
  ExperienceRecord,
  MatchAnalysis,
  ProfileRecord,
  ProjectBulletRecord,
  ProjectRecord,
  SkillRecord,
  VacancyRecord,
} from "~/types";
import { composeResumeDocument } from "~/server/services/composer/resume";
import { createMockH3Event } from "~/tests/utils/h3";

const {
  requestStructuredCompletionMock,
  getResolvedAiSettingsMock,
  createSupabaseServerClientMock,
  warnLoggerMock,
} = vi.hoisted(() => ({
  requestStructuredCompletionMock: vi.fn(),
  getResolvedAiSettingsMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  warnLoggerMock: vi.fn(),
}));

vi.mock("~/server/services/novita/client", () => ({
  requestStructuredCompletion: requestStructuredCompletionMock,
}));

vi.mock("~/server/services/novita/settings", () => ({
  getResolvedAiSettings: getResolvedAiSettingsMock,
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: vi.fn(),
    warn: warnLoggerMock,
    error: vi.fn(),
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

interface ComposerSupabaseFixture {
  profiles: ProfileRecord;
  vacancies: VacancyRecord;
  skills: SkillRecord[];
  experiences: ExperienceRecord[];
  experience_bullets: ExperienceBulletRecord[];
  projects: ProjectRecord[];
  project_bullets: ProjectBulletRecord[];
  certifications: CertificationRecord[];
}

function createSupabaseMock(tableData: ComposerSupabaseFixture) {
  return {
    from(tableName: keyof ComposerSupabaseFixture) {
      const currentData = tableData[tableName];
      const response = { data: currentData, error: null };
      const builder = {
        then<TResult>(resolve: (value: typeof response) => TResult | PromiseLike<TResult>) {
          return Promise.resolve(response).then(resolve);
        },
        finally(onFinally: () => void) {
          return Promise.resolve(response).finally(onFinally);
        },
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        order() {
          return Promise.resolve(response);
        },
        maybeSingle() {
          return Promise.resolve(response);
        },
      };

      return builder;
    },
  };
}

describe("composeResumeDocument", () => {
  const event = createMockH3Event({
    path: "/api/resume/generate",
    method: "POST",
  });
  const analysis: MatchAnalysis = {
    overall_score: 0.87,
    must_have_coverage: 0.8,
    semantic_similarity: 0.75,
    keyword_coverage: 0.7,
    evidence_strength: 0.85,
    domain_seniority_fit: 0.9,
    penalties: [],
    requirements: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    getResolvedAiSettingsMock.mockResolvedValue({
      provider: "novita",
      baseUrl: "https://api.novita.ai/openai",
      model: "google/gemma-3-12b-it",
      apiKey: "test-key",
      temperature: 0.2,
      maxTokens: 900,
    });

    createSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        profiles: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          user_id: "user-1",
          full_name: "Jane Doe",
          headline: "Senior Frontend Engineer",
          email: "jane@example.com",
          phone: "+100000000",
          location: "Remote",
          linkedin_url: "https://linkedin.com/in/jane",
          github_url: "https://github.com/jane",
          website_url: "https://jane.dev",
          summary_default: "Experienced frontend engineer.",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        vacancies: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          title: "Staff Frontend Engineer",
          company: "Acme",
          profile_id: "profile-1",
        },
        skills: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            profile_id: "profile-1",
            name: "TypeScript",
            keywords: [],
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            profile_id: "profile-1",
            name: "Nuxt",
            keywords: [],
          },
        ],
        experiences: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            profile_id: "profile-1",
            company: "Acme",
            role_title: "Senior Frontend Engineer",
            location: "Remote",
            start_date: "2023-01-01",
            end_date: null,
            is_current: true,
          },
        ],
        experience_bullets: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            experience_id: "33333333-3333-4333-8333-333333333333",
            text_raw: "Built Nuxt 3 applications with TypeScript.",
            text_refined: "Built Nuxt 3 applications with TypeScript.",
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            experience_id: "33333333-3333-4333-8333-333333333333",
            text_raw: "Improved SSR performance for customer-facing flows.",
            text_refined: "Improved SSR performance for customer-facing flows.",
          },
        ],
        projects: [
          {
            id: "66666666-6666-4666-8666-666666666666",
            profile_id: "profile-1",
            title: "Platform Rewrite",
            description: "Migrated the frontend stack.",
            url: "https://example.com/project",
          },
        ],
        project_bullets: [
          {
            id: "77777777-7777-4777-8777-777777777777",
            project_id: "66666666-6666-4666-8666-666666666666",
            text_raw: "Led a Nuxt migration for a legacy portal.",
            text_refined: "Led a Nuxt migration for a legacy portal.",
          },
        ],
        certifications: [
          {
            id: "88888888-8888-4888-8888-888888888888",
            profile_id: "profile-1",
            name: "AWS Certified Developer",
            issuer: "AWS",
            issued_at: "2024-01-01",
          },
        ],
      }),
    );
  });

  it("uses the AI-composed summary and prioritizes evidence-linked items", async () => {
    requestStructuredCompletionMock.mockResolvedValue({
      summary:
        "Senior frontend engineer with proven Nuxt and TypeScript delivery experience for customer-facing platforms.",
    });

    const documentTree = await composeResumeDocument(event, {
      profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: "99999999-9999-4999-8999-999999999999",
      vacancyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      analysis,
      evidenceLinks: [
        {
          requirement_id: "req-1",
          source_type: "skill",
          source_id: "22222222-2222-4222-8222-222222222222",
          score: 0.95,
          reason: "Nuxt is directly required.",
        },
        {
          requirement_id: "req-2",
          source_type: "experience_bullet",
          source_id: "44444444-4444-4444-8444-444444444444",
          score: 0.91,
          reason: "Nuxt 3 delivery is proven.",
        },
        {
          requirement_id: "req-3",
          source_type: "project_bullet",
          source_id: "77777777-7777-4777-8777-777777777777",
          score: 0.89,
          reason: "Migration experience is relevant.",
        },
      ],
    });

    expect(documentTree.summary).toContain("proven Nuxt and TypeScript");
    expect(documentTree.skills[0]).toBe("Nuxt");
    expect(documentTree.experiences[0]?.bullets[0]).toMatchObject({
      text: "Built Nuxt 3 applications with TypeScript.",
      sourceType: "experience_bullet",
      included: true,
    });
    expect(documentTree.projects[0]?.bullets[0]).toMatchObject({
      text: "Led a Nuxt migration for a legacy portal.",
      sourceType: "project_bullet",
      included: true,
    });
    expect(documentTree.profile.contacts).toContain("jane@example.com");
  });

  it("falls back to deterministic summary when the AI request fails", async () => {
    requestStructuredCompletionMock.mockRejectedValue(new Error("provider unavailable"));

    const documentTree = await composeResumeDocument(event, {
      profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: "99999999-9999-4999-8999-999999999999",
      vacancyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      analysis,
      evidenceLinks: [
        {
          requirement_id: "req-1",
          source_type: "experience_bullet",
          source_id: "44444444-4444-4444-8444-444444444444",
          score: 0.91,
          reason: "Nuxt 3 delivery is proven.",
        },
      ],
    });

    expect(documentTree.summary).toContain("Senior Frontend Engineer");
    expect(documentTree.summary).toContain("Target role: Staff Frontend Engineer.");
    expect(warnLoggerMock).toHaveBeenCalledTimes(1);
  });
});
