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

describe("resume editor page", () => {
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

  it("saves summary, skill order, and section visibility changes", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({});

    useFetchMock.mockResolvedValue({
      data: ref({
        resume: {
          title: "Resume draft",
          document_tree: {
            version: 2,
            sectionVisibility: {
              summary: true,
              skills: true,
              experience: true,
              projects: true,
              certifications: true,
              education: true,
              languages: true,
            },
            profile: {
              fullName: "Jane Doe",
              headline: "Engineer",
              contacts: [],
            },
            summary: "Original summary",
            skills: ["Nuxt", "TypeScript"],
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
        latestExportJob: null,
        exportJobs: [],
        pdfUrl: null,
      }),
      refresh,
    });
    vi.stubGlobal("$fetch", fetchMock);

    const wrapper = await mountSuspended(ResumeDetailPage, {
      global: {
        stubs: {
          SharedMetricCard: {
            props: ["label", "value"],
            template: '<div class="metric-card">{{ label }}: {{ value }}</div>',
          },
          ResumeResumeDocumentView: {
            props: ["documentTree"],
            template: '<div class="resume-preview-stub">{{ documentTree.summary }}</div>',
          },
          NuxtLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    });

    const textareas = wrapper.findAll("textarea");
    await textareas[0]!.setValue("Updated summary");

    const buttons = wrapper.findAll("button");
    const moveDownButton = buttons.find((button) => button.text() === "Move down");
    const saveDraftButton = buttons.find((button) => button.text() === "Save draft");

    await moveDownButton!.trigger("click");

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0]!.setValue(false);

    await saveDraftButton!.trigger("click");

    expect(fetchMock).toHaveBeenCalledWith("/api/resume/resume-1", {
      method: "PUT",
      body: expect.objectContaining({
        title: "Resume draft",
        document_tree: expect.objectContaining({
          summary: "Updated summary",
          skills: ["TypeScript", "Nuxt"],
          sectionVisibility: expect.objectContaining({
            summary: false,
          }),
        }),
      }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
