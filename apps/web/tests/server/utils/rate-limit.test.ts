import { clearRateLimitStore, enforceRateLimit } from "~/server/utils/rate-limit";

function createEvent(overrides?: { userId?: string; forwardedFor?: string }) {
  return {
    context: {
      userId: overrides?.userId,
    },
    node: {
      req: {
        headers: {
          "x-forwarded-for": overrides?.forwardedFor || "127.0.0.1",
        },
      },
    },
  } as any;
}

describe("rate limiting", () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests up to the configured limit", () => {
    const event = createEvent({ userId: "user-1" });

    expect(() =>
      enforceRateLimit(event, "vacancy-parse", {
        limit: 2,
        windowMs: 1_000,
      }),
    ).not.toThrow();

    expect(() =>
      enforceRateLimit(event, "vacancy-parse", {
        limit: 2,
        windowMs: 1_000,
      }),
    ).not.toThrow();
  });

  it("throws after the configured limit is exceeded", () => {
    const event = createEvent({ userId: "user-1" });

    enforceRateLimit(event, "vacancy-parse", {
      limit: 1,
      windowMs: 1_000,
    });

    try {
      enforceRateLimit(event, "vacancy-parse", {
        limit: 1,
        windowMs: 1_000,
      });
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 429,
        statusMessage: "Too many requests. Please retry later.",
      });
      return;
    }

    throw new Error("Expected enforceRateLimit to throw after the limit is exceeded.");
  });

  it("resets the limit after the window expires", () => {
    vi.useFakeTimers();

    const event = createEvent({ userId: "user-1" });

    enforceRateLimit(event, "vacancy-parse", {
      limit: 1,
      windowMs: 1_000,
    });

    vi.advanceTimersByTime(1_001);

    expect(() =>
      enforceRateLimit(event, "vacancy-parse", {
        limit: 1,
        windowMs: 1_000,
      }),
    ).not.toThrow();
  });
});
