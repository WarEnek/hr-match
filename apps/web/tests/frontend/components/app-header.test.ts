// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";

import AppHeader from "~/components/shared/AppHeader.vue";
import { navigateToMock, useRouteMock } from "~/tests/mocks/nuxt-imports";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: useAuthStoreMock,
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useRouteMock.mockReturnValue({
      path: "/dashboard",
      params: {},
    });
  });

  it("loads the session on mount and shows sign-in for guests", async () => {
    const fetchSession = vi.fn();

    useAuthStoreMock.mockReturnValue({
      initialized: false,
      user: null,
      loading: false,
      fetchSession,
      signOut: vi.fn(),
    });

    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    });

    await Promise.resolve();

    expect(fetchSession).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Sign in");
    expect(wrapper.text()).not.toContain("Logout");
  });

  it("renders navigation for authenticated users and logs out", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);

    useAuthStoreMock.mockReturnValue({
      initialized: true,
      user: {
        id: "user-1",
      },
      loading: false,
      fetchSession: vi.fn(),
      signOut,
    });

    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.text()).toContain("Vacancies");
    expect(wrapper.text()).toContain("Logout");

    await wrapper.get("button").trigger("click");

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(navigateToMock).toHaveBeenCalledWith("/login");
  });
});
