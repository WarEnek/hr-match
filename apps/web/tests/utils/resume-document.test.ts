import { getIncludedTextCount, normalizeResumeDocumentTree } from "~/utils/resume-document";

describe("resume document normalization", () => {
  it("normalizes legacy string bullets into editable bullet objects", () => {
    const documentTree = normalizeResumeDocumentTree({
      profile: {
        fullName: "Jane Doe",
        headline: null,
        contacts: [],
      },
      summary: "Summary",
      skills: ["Nuxt"],
      experiences: [
        {
          id: "experience-1",
          company: "Acme",
          roleTitle: "Engineer",
          location: null,
          dateRange: "2023 - Present",
          bullets: ["Built ATS-safe resumes"],
        },
      ],
      projects: [],
      certifications: [],
      education: [],
      languages: [],
    });

    expect(documentTree.version).toBe(2);
    expect(documentTree.experiences[0]?.bullets[0]).toEqual({
      sourceId: "experience-1-1",
      sourceType: "experience_bullet",
      text: "Built ATS-safe resumes",
      included: true,
    });
  });

  it("counts only included bullets across experience and projects", () => {
    const count = getIncludedTextCount({
      version: 2,
      profile: {
        fullName: "Jane Doe",
        headline: null,
        contacts: [],
      },
      summary: "Summary",
      skills: [],
      experiences: [
        {
          id: "experience-1",
          company: "Acme",
          roleTitle: "Engineer",
          location: null,
          dateRange: "2023 - Present",
          bullets: [
            {
              sourceId: "bullet-1",
              sourceType: "experience_bullet",
              text: "Included bullet",
              included: true,
            },
            {
              sourceId: "bullet-2",
              sourceType: "experience_bullet",
              text: "Hidden bullet",
              included: false,
            },
          ],
        },
      ],
      projects: [
        {
          id: "project-1",
          title: "Project",
          description: "Description",
          url: null,
          bullets: [
            {
              sourceId: "bullet-3",
              sourceType: "project_bullet",
              text: "Included project bullet",
              included: true,
            },
          ],
        },
      ],
      certifications: [],
      education: [],
      languages: [],
    });

    expect(count).toBe(2);
  });
});
