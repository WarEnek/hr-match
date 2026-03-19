import { createError } from "h3";

export function createAppError(
  statusCode: number,
  statusMessage: string,
  data?: Record<string, unknown>,
) {
  return createError({
    statusCode,
    statusMessage,
    data,
  });
}
