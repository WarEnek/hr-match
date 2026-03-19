/**
 * Returns the URL only if it is safe to use in href (http/https). Mitigates javascript:/data: in user content.
 */
export function safeExternalHref(url: string | null | undefined): string | undefined {
  if (url === null || url === undefined) {
    return undefined;
  }

  if (typeof url !== "string") {
    return undefined;
  }

  const trimmed = url.trim();
  if (!trimmed.length) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
