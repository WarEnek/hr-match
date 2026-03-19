import { assertSafeLlmBaseUrl, parseAllowedLlmHosts } from "~/server/utils/safe-llm-url";

const defaultOpts = {
  allowedHosts: ["api.novita.ai"],
  allowHttpLocalhost: false,
};

describe("parseAllowedLlmHosts", () => {
  it("parses comma-separated hosts with default", () => {
    expect(parseAllowedLlmHosts(undefined)).toEqual(["api.novita.ai"]);
    expect(parseAllowedLlmHosts("api.foo.com, api.bar.com ")).toEqual(["api.foo.com", "api.bar.com"]);
  });
});

describe("assertSafeLlmBaseUrl", () => {
  it("accepts allowed https URLs", () => {
    expect(() =>
      assertSafeLlmBaseUrl("https://api.novita.ai/openai/v1", defaultOpts),
    ).not.toThrow();
  });

  it("rejects http except localhost when allowed", () => {
    expect(() => assertSafeLlmBaseUrl("http://api.novita.ai/openai", defaultOpts)).toThrow();
    expect(() =>
      assertSafeLlmBaseUrl("http://127.0.0.1:11434/v1", {
        allowedHosts: ["127.0.0.1"],
        allowHttpLocalhost: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertSafeLlmBaseUrl("http://127.0.0.1:11434/v1", {
        allowedHosts: ["127.0.0.1"],
        allowHttpLocalhost: false,
      }),
    ).toThrow();
  });

  it("rejects private and metadata-style IPs in hostname", () => {
    expect(() =>
      assertSafeLlmBaseUrl("https://169.254.169.254/latest", {
        allowedHosts: ["169.254.169.254"],
        allowHttpLocalhost: false,
      }),
    ).toThrow();
    expect(() =>
      assertSafeLlmBaseUrl("https://10.0.0.1/v1", {
        allowedHosts: ["10.0.0.1"],
        allowHttpLocalhost: false,
      }),
    ).toThrow();
  });

  it("rejects hosts not in allowlist", () => {
    expect(() =>
      assertSafeLlmBaseUrl("https://evil.example/v1", defaultOpts),
    ).toThrow();
  });
});
