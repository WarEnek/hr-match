// @vitest-environment happy-dom

import { ref } from "vue";

import ResumesIndexPage from "~/pages/resumes/index.vue";
import { useFetchMock } from "~/tests/mocks/nuxt-imports";
import { mountSuspended } from "~/tests/utils/mountSuspended";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: useAuthStoreMock,
}));

describe("resumes index page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStoreMock.mockReturnValue({
      initialized: true,
      user: {
        id: "user-1",
      },
      fetchSession: vi.fn(),
    });
  });

  it("renders resume history with export status and PDF action", async () => {
    useFetchMock.mockResolvedValue({
      data: ref({
        resumes: [
          {
            id: "resume-1",
            title: "Senior Frontend Engineer Resume",
            score: 0.88,
            status: "exported",
            pdf_url: "https://example.com/resume.pdf",
            latest_export_job: {
              id: "job-1",
              resume_generation_id: "resume-1",
              status: "completed",
              error_message: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:01:00.000Z",
            },
          },
        ],
      }),
    });

    const wrapper = await mountSuspended(ResumesIndexPage, {
      global: {
        stubs: {
          NuxtLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Senior Frontend Engineer Resume");
    expect(wrapper.text()).toContain("completed");
    expect(wrapper.text()).toContain("Open PDF");
  });
});
