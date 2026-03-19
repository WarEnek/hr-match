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

const [{ data: profileData }, { data: vacancyData }, { data: resumeData }] = await Promise.all([
  useFetch<{ profile: { full_name?: string } | null }>("/api/profile"),
  useFetch<{ vacancies: Array<{ id: string }> }>("/api/vacancies"),
  useFetch<{ resumes: ResumeListItem[] }>("/api/resume"),
]);
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Dashboard</h1>
      <p class="panel-subtitle">
        Central entry point for profile completeness, recent vacancies, and generated resumes.
      </p>
    </section>

    <section class="metrics-grid">
      <SharedMetricCard
        label="Profile status"
        :value="profileData?.profile ? 'Ready' : 'Missing'"
        help="Create a profile before generating targeted resumes."
      />
      <SharedMetricCard
        label="Vacancies"
        :value="vacancyData?.vacancies?.length || 0"
        help="Stored vacancy descriptions and parsed requirements."
      />
      <SharedMetricCard
        label="Generated resumes"
        :value="resumeData?.resumes?.length || 0"
        help="History of ATS-safe resume generations."
      />
    </section>

    <section class="page-grid">
      <div class="panel">
        <h2>Profile</h2>
        <p class="muted">{{ profileData?.profile?.full_name || "No profile created yet." }}</p>
        <div class="actions">
          <NuxtLink class="button" to="/profile">Open profile</NuxtLink>
        </div>
      </div>

      <div class="panel">
        <h2>Vacancies</h2>
        <p class="muted">
          Add a vacancy, parse it through Novita, then inspect requirement coverage.
        </p>
        <div class="actions">
          <NuxtLink class="button" to="/vacancies">Manage vacancies</NuxtLink>
        </div>
      </div>

      <div class="panel">
        <h2>Resumes</h2>
        <p class="muted">
          Review generated resume drafts, evidence mapping, and PDF export status.
        </p>
        <div class="actions">
          <NuxtLink class="button-secondary" to="/resumes">Open history</NuxtLink>
        </div>
        <ul v-if="resumeData?.resumes?.length" class="unstyled-list" style="margin-top: 1rem">
          <li v-for="resume in resumeData.resumes.slice(0, 3)" :key="resume.id">
            <NuxtLink :to="`/resumes/${resume.id}`">
              <strong>{{ resume.title }}</strong>
              <p class="muted">
                Score: {{ resume.score ?? "n/a" }} · Export:
                {{ resume.latest_export_job?.status || resume.status || "draft" }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
