import { createError } from "h3";
import type { JsonObject } from "~/types";

export interface AppErrorData extends JsonObject {
  cause?: string;
}

export function createAppError(statusCode: number, statusMessage: string, data?: AppErrorData) {
  return createError({
    statusCode,
    statusMessage,
    data,
  });
}
