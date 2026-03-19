export const evidenceSelectorPromptVersion = "v1";

interface EvidenceCandidatePromptInput {
  source_type: "experience_bullet" | "project_bullet" | "skill";
  source_id: string;
  text: string;
  keyword_score: number;
  semantic_score: number;
  combined_score: number;
}

export function buildEvidenceSelectorPrompt(
  requirement: { label: string; type: string },
  candidates: EvidenceCandidatePromptInput[],
): { system: string; user: string } {
  return {
    system: [
      "You select the best factual evidence for one resume requirement.",
      "Only use the provided candidates.",
      "Prefer candidates that directly support the requirement without inventing extra claims.",
      "Return up to 3 matches in strict JSON.",
    ].join(" "),
    user: [
      `Prompt version: ${evidenceSelectorPromptVersion}`,
      `Requirement type: ${requirement.type}`,
      `Requirement label: ${requirement.label}`,
      "Candidates:",
      ...candidates.map((candidate, index) =>
        [
          `Candidate ${index + 1}`,
          `source_type: ${candidate.source_type}`,
          `source_id: ${candidate.source_id}`,
          `combined_score: ${candidate.combined_score}`,
          `keyword_score: ${candidate.keyword_score}`,
          `semantic_score: ${candidate.semantic_score}`,
          `text: ${candidate.text}`,
        ].join("\\n"),
      ),
    ].join("\\n\\n"),
  };
}
