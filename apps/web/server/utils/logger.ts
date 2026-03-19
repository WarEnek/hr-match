import type { H3Event } from "h3";

type LogLevel = "info" | "warn" | "error";

function serializeMeta(meta?: Record<string, unknown>) {
  if (!meta) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' {"meta":"unserializable"}';
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${serializeMeta(meta)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function buildRequestLogContext(event: H3Event, extra?: Record<string, unknown>) {
  return {
    requestId: event.context.requestId || "missing-request-id",
    userId: event.context.userId || null,
    route: event.path,
    method: event.method,
    latencyMs: event.context.startedAt ? Date.now() - event.context.startedAt : null,
    ...extra,
  };
}

export const appLogger = {
  info(message: string, meta?: Record<string, unknown>) {
    log("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    log("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    log("error", message, meta);
  },
};
