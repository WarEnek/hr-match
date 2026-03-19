<script setup lang="ts">
import type { ResumeDocumentTree } from "~/types";

defineProps<{
  documentTree: ResumeDocumentTree;
}>();
</script>

<template>
  <article class="resume-preview">
    <section>
      <div class="header-row">
        <div>
          <h1>{{ documentTree.profile.fullName }}</h1>
          <p>{{ documentTree.profile.headline }}</p>
        </div>
        <div class="section-gap">
          <span v-for="contact in documentTree.profile.contacts" :key="contact">{{ contact }}</span>
        </div>
      </div>
    </section>

    <section>
      <h2>Professional Summary</h2>
      <p>{{ documentTree.summary }}</p>
    </section>

    <section v-if="documentTree.skills.length">
      <h2>Core Skills</h2>
      <p>{{ documentTree.skills.join(", ") }}</p>
    </section>

    <section v-if="documentTree.experiences.length">
      <h2>Work Experience</h2>
      <div class="section-gap">
        <article v-for="experience in documentTree.experiences" :key="experience.id">
          <div class="job-header">
            <strong>{{ experience.roleTitle }} - {{ experience.company }}</strong>
            <span>{{ experience.dateRange }}</span>
          </div>
          <p v-if="experience.location">{{ experience.location }}</p>
          <ul>
            <li v-for="bullet in experience.bullets" :key="bullet">{{ bullet }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section v-if="documentTree.projects.length">
      <h2>Selected Projects</h2>
      <div class="section-gap">
        <article v-for="project in documentTree.projects" :key="project.id">
          <div class="project-header">
            <strong>{{ project.title }}</strong>
            <a v-if="project.url" :href="project.url" target="_blank" rel="noreferrer">{{
              project.url
            }}</a>
          </div>
          <p>{{ project.description }}</p>
          <ul v-if="project.bullets.length">
            <li v-for="bullet in project.bullets" :key="bullet">{{ bullet }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section v-if="documentTree.certifications.length">
      <h2>Certifications</h2>
      <ul>
        <li v-for="certification in documentTree.certifications" :key="certification.id">
          {{ certification.name
          }}<span v-if="certification.issuer"> - {{ certification.issuer }}</span>
        </li>
      </ul>
    </section>

    <section v-if="documentTree.education.length">
      <h2>Education</h2>
      <ul>
        <li v-for="entry in documentTree.education" :key="entry">{{ entry }}</li>
      </ul>
    </section>

    <section v-if="documentTree.languages.length">
      <h2>Languages</h2>
      <p>{{ documentTree.languages.join(", ") }}</p>
    </section>
  </article>
</template>
