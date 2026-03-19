<script setup lang="ts">
import { navigateTo, useFetch } from "#imports";

import type { ResumeListItem } from "~/types";

import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const { data } = await useFetch<{ resumes: ResumeListItem[] }>("/api/resume");
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Resume generations</h1>
      <p class="panel-subtitle">
        Review generated resume drafts, export statuses, and available PDF files.
      </p>
    </section>
    <section class="panel">
      <div v-if="data?.resumes?.length" class="record-list">
        <article v-for="resume in data.resumes" :key="resume.id" class="record-card">
          <div class="record-header">
            <div>
              <strong>{{ resume.title }}</strong>
              <p class="muted">Score: {{ resume.score ?? "n/a" }}</p>
            </div>
            <span
              :class="
                resume.latest_export_job?.status === 'completed'
                  ? 'status-success'
                  : resume.latest_export_job?.status === 'failed'
                    ? 'status-error'
                    : 'status-warning'
              "
            >
              {{ resume.latest_export_job?.status || resume.status || "draft" }}
            </span>
          </div>
          <div class="record-meta">
            <span>Created: {{ resume.created_at || "n/a" }}</span>
            <span>Updated: {{ resume.updated_at || "n/a" }}</span>
          </div>
          <p v-if="resume.latest_export_job?.error_message" class="status-error">
            {{ resume.latest_export_job.error_message }}
          </p>
          <div class="actions">
            <NuxtLink class="button" :to="`/resumes/${resume.id}`">Open draft</NuxtLink>
            <a
              v-if="resume.pdf_url"
              class="button-secondary"
              :href="resume.pdf_url"
              target="_blank"
              rel="noreferrer"
            >
              Open PDF
            </a>
          </div>
        </article>
      </div>
      <p v-else class="muted">No generated resumes yet.</p>
    </section>
  </div>
</template>
