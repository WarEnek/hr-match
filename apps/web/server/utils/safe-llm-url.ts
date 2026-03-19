import { isIPv4 } from "node:net";

import { createAppError } from "~/server/utils/errors";

export function parseAllowedLlmHosts(envValue: string | undefined): string[] {
  const raw = envValue?.trim() || "api.novita.ai";
  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isBlockedIPv4Literal(host: string): boolean {
  if (!isIPv4(host)) {
    return false;
  }

  const parts = host.split(".").map((p) => Number(p));
  const [a, b] = parts;

  if (a === 10) {
    return true;
  }
  if (a === 127) {
    return true;
  }
  if (a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  return false;
}

export function assertSafeLlmBaseUrl(
  urlString: string,
  options: { allowedHosts: string[]; allowHttpLocalhost: boolean },
): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw createAppError(400, "Invalid AI API base URL.");
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  const isLocalHttpAllowed =
    protocol === "http:" &&
    options.allowHttpLocalhost &&
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    options.allowedHosts.includes(hostname);

  if (!isLocalHttpAllowed && isBlockedIPv4Literal(hostname)) {
    throw createAppError(400, "AI API base URL cannot target a private or local network address.");
  }

  if (hostname.includes(":")) {
    throw createAppError(400, "AI API base URL cannot use this hostname format.");
  }

  if (protocol === "https:") {
    // allowed
  } else if (isLocalHttpAllowed) {
    // local dev proxy only
  } else {
    throw createAppError(400, "AI API base URL must use HTTPS.");
  }

  if (!options.allowedHosts.includes(hostname)) {
    throw createAppError(
      400,
      "AI API host is not allowed. Configure NOVITA_ALLOWED_HOSTS for custom providers.",
    );
  }
}
