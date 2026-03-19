export function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaSeparated(values?: string[] | null): string {
  return values?.join(", ") || "";
}

export function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function normalizeOptionalDate(value: string): string | null {
  return normalizeOptionalText(value);
}

export function normalizeOptionalNumber(value: string | number): number | null {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return value;
    }

    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedValue = Number(trimmed);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}
