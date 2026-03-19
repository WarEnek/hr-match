// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";

import ResumeDocumentView from "~/components/resume/ResumeDocumentView.vue";

describe("ResumeDocumentView", () => {
  it("renders only included bullets", () => {
    const wrapper = mount(ResumeDocumentView, {
      props: {
        documentTree: {
          version: 2,
          sectionVisibility: {
            summary: true,
            skills: false,
            experience: true,
            projects: true,
            certifications: true,
            education: true,
            languages: true,
          },
          profile: {
            fullName: "Jane Doe",
            headline: "Engineer",
            contacts: ["jane@example.com"],
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
              bullets: [
                {
                  sourceId: "bullet-1",
                  sourceType: "experience_bullet",
                  text: "Visible bullet",
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
                  text: "Visible project bullet",
                  included: true,
                },
                {
                  sourceId: "bullet-4",
                  sourceType: "project_bullet",
                  text: "Hidden project bullet",
                  included: false,
                },
              ],
            },
          ],
          certifications: [],
          education: [],
          languages: [],
        },
      },
    });

    expect(wrapper.text()).toContain("Visible bullet");
    expect(wrapper.text()).not.toContain("Hidden bullet");
    expect(wrapper.text()).toContain("Visible project bullet");
    expect(wrapper.text()).not.toContain("Hidden project bullet");
    expect(wrapper.text()).not.toContain("Core Skills");
  });
});
