import type { H3Event } from "h3";

export interface MockH3EventShape {
  context: {
    requestId?: string;
    userId?: string;
    startedAt?: number;
  };
  path: string;
  method: string;
  node: {
    req: {
      headers: Record<string, string>;
    };
  };
}

export function createMockH3Event(
  overrides: Partial<MockH3EventShape> = {},
  contextOverrides: Partial<MockH3EventShape["context"]> = {},
): H3Event {
  const baseEvent: MockH3EventShape = {
    context: {},
    path: "/api/test",
    method: "POST",
    node: {
      req: {
        headers: {},
      },
    },
  };

  return {
    ...baseEvent,
    ...overrides,
    context: {
      ...baseEvent.context,
      ...overrides.context,
      ...contextOverrides,
    },
    node: {
      ...baseEvent.node,
      ...overrides.node,
      req: {
        ...baseEvent.node.req,
        ...overrides.node?.req,
        headers: {
          ...baseEvent.node.req.headers,
          ...overrides.node?.req?.headers,
        },
      },
    },
  } as unknown as H3Event;
}

export function stubDefineEventHandler(): void {
  vi.stubGlobal("defineEventHandler", <T>(handler: T): T => handler);
}
