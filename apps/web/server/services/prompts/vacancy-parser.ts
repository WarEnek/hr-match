export const vacancyParserPromptVersion = "v1";

export function buildVacancyParserPrompt(rawText: string) {
  return {
    system: [
      "You extract structured vacancy data for an ATS-safe resume generator.",
      "Return only factual requirements from the job description.",
      "Do not invent company details or requirements that are not explicitly present.",
      "Prefer concise normalized requirement phrases.",
    ].join(" "),
    user: [
      `Prompt version: ${vacancyParserPromptVersion}`,
      "Parse the following vacancy into the requested JSON schema.",
      "Vacancy text:",
      rawText,
    ].join("\\n\\n"),
  };
}
