import {
  EMBEDDING_DIMENSION,
  buildEmbeddingInput,
  cosineSimilarity,
  formatVectorLiteral,
  generateDeterministicEmbedding,
  parseStoredEmbedding,
} from "~/server/services/embeddings/generator";

describe("embedding generator", () => {
  it("builds deterministic embeddings with the expected dimension", () => {
    const firstVector = generateDeterministicEmbedding("Nuxt TypeScript SSR");
    const secondVector = generateDeterministicEmbedding("Nuxt TypeScript SSR");

    expect(firstVector).toHaveLength(EMBEDDING_DIMENSION);
    expect(secondVector).toHaveLength(EMBEDDING_DIMENSION);
    expect(firstVector).toEqual(secondVector);
  });

  it("builds a combined embedding input and formats vectors for pgvector", () => {
    const input = buildEmbeddingInput("Built ATS-safe resumes", ["nuxt", "playwright"]);
    const vector = generateDeterministicEmbedding(input);
    const literal = formatVectorLiteral(vector);

    expect(input).toContain("Built ATS-safe resumes");
    expect(input).toContain("nuxt playwright");
    expect(literal.startsWith("[")).toBe(true);
    expect(literal.endsWith("]")).toBe(true);
  });

  it("parses stored vectors and computes cosine similarity", () => {
    const parsed = parseStoredEmbedding("[1,0,0]");
    const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0]);
    const oppositeSimilarity = cosineSimilarity([1, 0, 0], [-1, 0, 0]);

    expect(parsed).toEqual([1, 0, 0]);
    expect(similarity).toBe(1);
    expect(oppositeSimilarity).toBe(-1);
  });
});
