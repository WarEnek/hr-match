import {
  aiSettingsInputSchema,
  profileUpsertSchema,
  vacancyParserResponseSchema,
} from "~/server/utils/schemas";

describe("schema validation", () => {
  it("normalizes empty optional profile fields to null", () => {
    const profile = profileUpsertSchema.parse({
      full_name: "Jane Doe",
      headline: "   ",
      email: undefined,
      phone: null,
      location: " Remote ",
      linkedin_url: "",
      github_url: " https://github.com/jane ",
      website_url: " ",
      summary_default: " Experienced engineer ",
    });

    expect(profile).toEqual({
      full_name: "Jane Doe",
      headline: null,
      email: null,
      phone: null,
      location: "Remote",
      linkedin_url: null,
      github_url: "https://github.com/jane",
      website_url: null,
      summary_default: "Experienced engineer",
    });
  });

  it("rejects non-http(s) URLs on profile link fields", () => {
    expect(() =>
      profileUpsertSchema.parse({
        full_name: "Jane Doe",
        linkedin_url: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it("applies defaults for vacancy parser arrays", () => {
    const parsedVacancy = vacancyParserResponseSchema.parse({
      title: "Frontend Engineer",
      company: null,
      seniority: "senior",
    });

    expect(parsedVacancy.domain).toEqual([]);
    expect(parsedVacancy.must_have).toEqual([]);
    expect(parsedVacancy.nice_to_have).toEqual([]);
    expect(parsedVacancy.responsibilities).toEqual([]);
    expect(parsedVacancy.soft_signals).toEqual([]);
  });

  it("fills optional AI settings fields with safe defaults", () => {
    const settings = aiSettingsInputSchema.parse({
      provider: "novita",
      base_url: "https://api.novita.ai/openai",
      model: "google/gemma-3-12b-it",
    });

    expect(settings.api_key).toBe("");
    expect(settings.temperature).toBe(0.2);
    expect(settings.max_tokens).toBe(900);
  });
});
