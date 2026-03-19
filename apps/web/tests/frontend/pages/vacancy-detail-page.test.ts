// @vitest-environment happy-dom

import { ref } from "vue";

import VacancyDetailPage from "~/pages/vacancies/[id].vue";
import { navigateToMock, useFetchMock, useRouteMock } from "~/tests/mocks/nuxt-imports";
import { mountSuspended } from "~/tests/utils/mountSuspended";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: useAuthStoreMock,
}));

describe("vacancy detail page", () => {
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
      path: "/vacancies/vacancy-1",
      params: {
        id: "vacancy-1",
      },
    });
  });

  it("parses a vacancy and runs match analysis from UI actions", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        analysis: {
          overall_score: 0.91,
          must_have_coverage: 0.8,
          semantic_similarity: 0.75,
          keyword_coverage: 0.7,
          evidence_strength: 0.85,
          domain_seniority_fit: 0.9,
          penalties: [],
          requirements: [],
        },
      });

    useFetchMock.mockResolvedValue({
      data: ref({
        vacancy: {
          title: "Senior Frontend Engineer",
          company: "Acme",
          raw_text: "Vacancy raw text",
          parsed_json: null,
        },
        requirements: [],
      }),
      refresh,
    });
    vi.stubGlobal("$fetch", fetchMock);

    const wrapper = await mountSuspended(VacancyDetailPage, {
      global: {
        stubs: {
          SharedMetricCard: {
            props: ["label", "value"],
            template: '<div class="metric-card">{{ label }}: {{ value }}</div>',
          },
        },
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/vacancies/vacancy-1/parse", {
      method: "POST",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Vacancy parsed successfully.");

    await buttons[1]!.trigger("click");

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/match/vacancy-1", {
      method: "POST",
    });
    expect(wrapper.text()).toContain("Match analysis updated.");
    expect(wrapper.text()).toContain("Overall score: 0.91");
  });

  it("generates a resume and navigates to the draft page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      resume: {
        id: "resume-1",
      },
    });

    useFetchMock.mockResolvedValue({
      data: ref({
        vacancy: {
          title: "Senior Frontend Engineer",
          company: "Acme",
          raw_text: "Vacancy raw text",
          parsed_json: null,
        },
        requirements: [],
      }),
      refresh: vi.fn(),
    });
    vi.stubGlobal("$fetch", fetchMock);

    const wrapper = await mountSuspended(VacancyDetailPage);
    const buttons = wrapper.findAll("button");

    await buttons[2]!.trigger("click");

    expect(fetchMock).toHaveBeenCalledWith("/api/resume/generate", {
      method: "POST",
      body: {
        vacancyId: "vacancy-1",
      },
    });
    expect(navigateToMock).toHaveBeenCalledWith("/resumes/resume-1");
  });
});
