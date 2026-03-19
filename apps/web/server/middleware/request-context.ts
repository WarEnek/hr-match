import { randomUUID } from "node:crypto";

export default defineEventHandler((event) => {
  event.context.requestId = getHeader(event, "x-request-id") || randomUUID();
  event.context.startedAt = Date.now();
});
