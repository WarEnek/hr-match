import { z } from "zod";

function isHttpOrHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Optional profile-style URL: empty/null/undefined -> null; otherwise http(s) only.
 */
export const nullableHttpOrHttpsUrl = z.preprocess(
  (raw) => {
    if (raw === null || raw === undefined) {
      return null;
    }
    if (typeof raw !== "string") {
      return raw;
    }

    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  },
  z.union([
    z.null(),
    z.string().refine(isHttpOrHttpsUrl, {
      message: "URL must use http or https",
    }),
  ]),
);
