const EMBEDDING_DIMENSION = 1536;

function hashString(input: string, seed: number): number {
  let hash = 2166136261 ^ seed;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function parseStoredEmbedding(value: string | number[] | null | undefined): number[] | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry));
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return null;
  }

  const innerValue = trimmed.slice(1, -1).trim();
  if (!innerValue) {
    return [];
  }

  return innerValue.split(",").map((entry) => Number(entry.trim()));
}

export function cosineSimilarity(left: number[] | null, right: number[] | null): number {
  if (!left || !right || !left.length || !right.length || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function buildEmbeddingInput(text: string, tags: string[] = []): string {
  return [
    text.trim(),
    tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join("\\n");
}

export function generateDeterministicEmbedding(input: string): number[] {
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);

  if (!tokens.length) {
    return vector;
  }

  const tokenWeight = 1 / Math.sqrt(tokens.length);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const bucket = hashString(token, index) % EMBEDDING_DIMENSION;
    const sign = hashString(token, index + 17) % 2 === 0 ? 1 : -1;
    vector[bucket] += sign * tokenWeight;

    if (index < tokens.length - 1) {
      const bigram = `${token}_${tokens[index + 1]}`;
      const bigramBucket = hashString(bigram, index + 31) % EMBEDDING_DIMENSION;
      const bigramSign = hashString(bigram, index + 53) % 2 === 0 ? 1 : -1;
      vector[bigramBucket] += bigramSign * tokenWeight * 0.5;
    }
  }

  return normalizeVector(vector);
}

export function formatVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export { EMBEDDING_DIMENSION };
