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
          company: "Acme",
          seniority: "senior",
          domain: ["frontend"],
          must_have: ["Nuxt 3", "TypeScript"],
          nice_to_have: ["GraphQL"],
          responsibilities: [],
          soft_signals: [],
        },
      },
      requirements: [
        {
          id: requirementIdOne,
          vacancy_id: "vacancy-1",
          label: "Nuxt 3",
          type: "must_have",
        },
        {
          id: requirementIdTwo,
          vacancy_id: "vacancy-1",
          label: "TypeScript",
          type: "must_have",
        },
        {
          id: requirementIdThree,
          vacancy_id: "vacancy-1",
          label: "GraphQL",
          type: "nice_to_have",
        },
      ],
      skills: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          profile_id: "profile-1",
          name: "Nuxt",
          level: "advanced",
          keywords: ["SSR", "frontend"],
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          profile_id: "profile-1",
          name: "TypeScript",
          level: "advanced",
          keywords: ["typed frontend"],
        },
      ],
      experienceBullets: [
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          experience_id: "experience-1",
          text_raw: "Built Nuxt 3 SSR dashboards with TypeScript for customer portals.",
          text_refined: "Built Nuxt 3 SSR dashboards with TypeScript for customer portals.",
          tech_tags: ["Nuxt 3", "TypeScript"],
          domain_tags: ["frontend"],
          result_tags: ["delivery"],
          seniority_tags: ["senior"],
        },
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          experience_id: "experience-1",
          text_raw: "Integrated GraphQL APIs and improved schema-driven frontend flows.",
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
          project_id: "project-1",
          text_raw: "Led frontend modernization for a Nuxt platform rollout.",
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
          company: "Acme",
          seniority: null,
          domain: ["data"],
          must_have: ["Python"],
          nice_to_have: [],
          responsibilities: [],
          soft_signals: [],
        },
      },
      requirements: [
        {
          id: requirementIdOne,
          vacancy_id: "vacancy-2",
          label: "Python",
          type: "must_have",
        },
      ],
      skills: [
        {
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          profile_id: "profile-2",
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
        vacancy: {
          parsed_json: {
            title: null,
            company: null,
            seniority: null,
            domain: [],
            must_have: [],
            nice_to_have: [],
            responsibilities: [],
            soft_signals: [],
          },
        },
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

  it("uses embedding similarity when keyword overlap is weak", () => {
    const result = buildMatchArtifacts({
      vacancy: {
        parsed_json: {
          title: "Platform Engineer",
          company: "Acme",
          seniority: "senior",
          domain: ["platform"],
          must_have: ["Distributed systems"],
          nice_to_have: [],
          responsibilities: [],
          soft_signals: [],
        },
      },
      requirements: [
        {
          id: requirementIdOne,
          vacancy_id: "vacancy-3",
          label: "Distributed systems",
          type: "must_have",
          embedding: "[1,0,0]",
        },
      ],
      skills: [],
      experienceBullets: [
        {
          id: "99999999-9999-4999-8999-999999999999",
          experience_id: "experience-2",
          text_raw: "Built event-driven platform services across multiple teams.",
          text_refined: "Built event-driven platform services across multiple teams.",
          tech_tags: ["Kafka"],
          domain_tags: ["platform"],
          result_tags: ["scalability"],
          seniority_tags: ["senior"],
          embedding: "[1,0,0]",
        },
      ],
      projectBullets: [],
    });

    expect(result.analysis.semantic_similarity).toBeGreaterThan(0.9);
    expect(result.analysis.requirements[0]?.coverage_score).toBeGreaterThan(0.5);
    expect(result.analysis.requirements[0]?.evidence[0]?.reason).toContain("semantic");
  });
});
