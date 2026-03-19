// @vitest-environment happy-dom

import { ref } from "vue";

import ResumeDetailPage from "~/pages/resumes/[id].vue";
import { useFetchMock, useRouteMock } from "~/tests/mocks/nuxt-imports";
import { mountSuspended } from "~/tests/utils/mountSuspended";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: useAuthStoreMock,
}));

describe("resume detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStoreMock.mockReturnValue({
      initialized: true,
      user: {
        id: "user-1",
      },
      fetchSession: vi.fn(),
    });

    useRouteMock.mockReturnValue({
      path: "/resumes/resume-1",
      params: {
        id: "resume-1",
      },
    });
  });

  it("renders export history and latest PDF action", async () => {
    useFetchMock.mockResolvedValue({
      data: ref({
        resume: {
          title: "Resume draft",
          document_tree: {
            version: 2,
            profile: {
              fullName: "Jane Doe",
              headline: "Engineer",
              contacts: [],
            },
            summary: "Summary",
            skills: [],
            experiences: [],
            projects: [],
            certifications: [],
            education: [],
            languages: [],
          },
          analysis_json: {
            overall_score: 0.9,
            must_have_coverage: 0.8,
            semantic_similarity: 0.7,
            keyword_coverage: 0.75,
            evidence_strength: 0.85,
            domain_seniority_fit: 0.8,
            penalties: [],
            requirements: [],
          },
        },
        evidenceLinks: [],
        latestExportJob: {
          id: "job-1",
          resume_generation_id: "resume-1",
          status: "completed",
          error_message: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:01:00.000Z",
        },
        exportJobs: [
          {
            id: "job-1",
            resume_generation_id: "resume-1",
            status: "completed",
            error_message: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:01:00.000Z",
          },
          {
            id: "job-2",
            resume_generation_id: "resume-1",
            status: "failed",
            error_message: "Storage upload failed",
            created_at: "2025-12-31T00:00:00.000Z",
            updated_at: "2025-12-31T00:01:00.000Z",
          },
        ],
        pdfUrl: "https://example.com/resume.pdf",
      }),
      refresh: vi.fn(),
    });

    const wrapper = await mountSuspended(ResumeDetailPage, {
      global: {
        stubs: {
          SharedMetricCard: {
            props: ["label", "value"],
            template: '<div class="metric-card">{{ label }}: {{ value }}</div>',
          },
          ResumeResumeDocumentView: {
            props: ["documentTree"],
            template: '<div class="resume-preview-stub">{{ documentTree.profile.fullName }}</div>',
          },
          NuxtLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Export job history");
    expect(wrapper.text()).toContain("Storage upload failed");
    expect(wrapper.text()).toContain("Open latest PDF");
    expect(wrapper.text()).toContain("completed");
  });
});
