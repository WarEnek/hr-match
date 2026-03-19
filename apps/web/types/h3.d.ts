declare module "h3" {
  interface H3EventContext {
    requestId?: string;
    startedAt?: number;
    userId?: string;
  }
}

export {};
