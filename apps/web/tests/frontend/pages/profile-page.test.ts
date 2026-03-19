// @vitest-environment happy-dom

import { ref } from "vue";

import ProfilePage from "~/pages/profile/index.vue";
import { useFetchMock } from "~/tests/mocks/nuxt-imports";
import { mountSuspended } from "~/tests/utils/mountSuspended";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: useAuthStoreMock,
}));

describe("profile page", () => {
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

  it("prefills the form and updates an existing profile with PUT", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({});

    useFetchMock.mockResolvedValue({
      data: ref({
        profile: {
          full_name: "Jane Doe",
          headline: "Senior Frontend Engineer",
          email: "jane@example.com",
          phone: "+100000000",
          location: "Remote",
          linkedin_url: "https://linkedin.com/in/jane",
          github_url: "https://github.com/jane",
          website_url: "https://jane.dev",
          summary_default: "Existing summary",
        },
      }),
      refresh,
    });
    vi.stubGlobal("$fetch", fetchMock);

    const wrapper = await mountSuspended(ProfilePage);
    const inputs = wrapper.findAll("input");

    expect((inputs[0]!.element as HTMLInputElement).value).toBe("Jane Doe");
    expect((inputs[1]!.element as HTMLInputElement).value).toBe("Senior Frontend Engineer");

    await inputs[0]!.setValue("Jane Updated");
    await wrapper.get("textarea").setValue("Updated summary");
    await wrapper.get("button").trigger("click");

    expect(fetchMock).toHaveBeenCalledWith("/api/profile", {
      method: "PUT",
      body: {
        full_name: "Jane Updated",
        headline: "Senior Frontend Engineer",
        email: "jane@example.com",
        phone: "+100000000",
        location: "Remote",
        linkedin_url: "https://linkedin.com/in/jane",
        github_url: "https://github.com/jane",
        website_url: "https://jane.dev",
        summary_default: "Updated summary",
      },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Profile saved.");
  });

  it("creates a new profile with POST when no profile exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue({});

    useFetchMock.mockResolvedValue({
      data: ref({
        profile: null,
      }),
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    vi.stubGlobal("$fetch", fetchMock);

    const wrapper = await mountSuspended(ProfilePage);
    const inputs = wrapper.findAll("input");

    await inputs[0]!.setValue("New User");
    await wrapper.get("button").trigger("click");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
