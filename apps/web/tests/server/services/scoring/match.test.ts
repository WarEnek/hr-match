import { buildMatchArtifacts } from "~/server/services/scoring/match";

const requirementIdOne = "11111111-1111-4111-8111-111111111111";
const requirementIdTwo = "22222222-2222-4222-8222-222222222222";
const requirementIdThree = "33333333-3333-4333-8333-333333333333";

describe("buildMatchArtifacts", () => {
  it("computes a strong match without penalties when evidence is rich", () => {
    const result = buildMatchArtifacts({
      vacancy: {
        parsed_json: {
          title: "Senior Frontend Engineer",
          seniority: "senior",
          domain: ["frontend"],
        },
      },
      requirements: [
        {
          id: requirementIdOne,
          label: "Nuxt 3",
          type: "must_have",
        },
        {
          id: requirementIdTwo,
          label: "TypeScript",
          type: "must_have",
        },
        {
          id: requirementIdThree,
          label: "GraphQL",
          type: "nice_to_have",
        },
      ],
      skills: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          name: "Nuxt",
          level: "advanced",
          keywords: ["SSR", "frontend"],
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          name: "TypeScript",
          level: "advanced",
          keywords: ["typed frontend"],
        },
      ],
      experienceBullets: [
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          text_refined: "Built Nuxt 3 SSR dashboards with TypeScript for customer portals.",
          tech_tags: ["Nuxt 3", "TypeScript"],
          domain_tags: ["frontend"],
          result_tags: ["delivery"],
          seniority_tags: ["senior"],
        },
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          text_refined: "Integrated GraphQL APIs and improved schema-driven frontend flows.",
          tech_tags: ["GraphQL"],
          domain_tags: ["frontend"],
          result_tags: ["performance"],
          seniority_tags: ["senior"],
        },
      ],
      projectBullets: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          text_refined: "Led frontend modernization for a Nuxt platform rollout.",
          tech_tags: ["Nuxt"],
          domain_tags: ["frontend"],
          result_tags: ["architecture"],
        },
      ],
    });

    expect(result.candidateEvidenceCount).toBe(5);
    expect(result.analysis.must_have_coverage).toBe(1);
    expect(result.analysis.penalties).toEqual([]);
    expect(result.analysis.overall_score).toBeGreaterThan(0.7);
    expect(result.analysis.requirements).toHaveLength(3);
    expect(result.evidenceLinks.length).toBeGreaterThan(0);
  });

  it("adds penalties when must-have requirements lack evidence", () => {
    const result = buildMatchArtifacts({
      vacancy: {
        parsed_json: {
          title: "Data Engineer",
          seniority: null,
          domain: ["data"],
        },
      },
      requirements: [
        {
          id: requirementIdOne,
          label: "Python",
          type: "must_have",
        },
      ],
      skills: [
        {
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          name: "Excel",
          level: "basic",
          keywords: ["spreadsheets"],
        },
      ],
      experienceBullets: [],
      projectBullets: [],
    });

    expect(result.analysis.must_have_coverage).toBe(0);
    expect(result.analysis.penalties).toContain(
      "Critical must-have requirements are not sufficiently covered.",
    );
    expect(result.analysis.penalties).toContain(
      "Evidence pool is too small for reliable matching.",
    );
    expect(result.analysis.overall_score).toBeLessThan(0.2);
  });

  it("fails fast when requirements are missing", () => {
    try {
      buildMatchArtifacts({
        vacancy: { parsed_json: {} },
        requirements: [],
        skills: [],
        experienceBullets: [],
        projectBullets: [],
      });
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        statusMessage: "Vacancy requirements are missing. Parse the vacancy first.",
      });
      return;
    }

    throw new Error("Expected buildMatchArtifacts to reject empty requirements.");
  });
});
