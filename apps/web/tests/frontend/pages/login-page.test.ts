// @vitest-environment happy-dom

import LoginPage from "~/pages/login.vue";
import { navigateToMock } from "~/tests/mocks/nuxt-imports";
import { mountSuspended } from "~/tests/utils/mountSuspended";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: useAuthStoreMock,
}));

describe("login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits sign in by default and navigates to the dashboard", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);

    useAuthStoreMock.mockReturnValue({
      initialized: true,
      user: null,
      loading: false,
      fetchSession: vi.fn(),
      signIn,
      signUp: vi.fn(),
    });

    const wrapper = await mountSuspended(LoginPage);
    const inputs = wrapper.findAll("input");

    await inputs[0]!.setValue("jane@example.com");
    await inputs[1]!.setValue("password123");
    await wrapper.findAll("button")[2]!.trigger("click");

    expect(signIn).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "password123",
    });
    expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
  });

  it("switches to sign up mode and shows authentication errors", async () => {
    const signUp = vi.fn().mockRejectedValue(new Error("Signup failed"));

    useAuthStoreMock.mockReturnValue({
      initialized: true,
      user: null,
      loading: false,
      fetchSession: vi.fn(),
      signIn: vi.fn(),
      signUp,
    });

    const wrapper = await mountSuspended(LoginPage);
    const buttons = wrapper.findAll("button");

    await buttons[1]!.trigger("click");

    const inputs = wrapper.findAll("input");
    await inputs[0]!.setValue("new@example.com");
    await inputs[1]!.setValue("password123");
    await buttons[2]!.trigger("click");

    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
    });
    expect(wrapper.text()).toContain("Signup failed");
  });
});
