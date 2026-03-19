<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

import { navigateTo, useFetch, useRoute } from "#imports";

import type { ExportJobRecord, MatchAnalysis, ResumeDocumentTree } from "~/types";

import { useAuthStore } from "~/stores/auth";
import { getIncludedTextCount, normalizeResumeDocumentTree } from "~/utils/resume-document";

const route = useRoute();
const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const resumeId = route.params.id as string;
const { data, refresh } = await useFetch<{
  resume: {
    title: string;
    document_tree: ResumeDocumentTree;
    analysis_json: MatchAnalysis;
  };
  evidenceLinks: Array<{
    id: string;
    source_type: string;
    score: number;
    reason: string;
  }>;
  exportJobs: ExportJobRecord[];
  latestExportJob: ExportJobRecord | null;
  pdfUrl: string | null;
}>(`/api/resume/${resumeId}`);
const exporting = ref(false);
const saving = ref(false);
const notice = ref("");
const editableTitle = ref("");
const editableDocumentTree = ref<ResumeDocumentTree | null>(null);

watchEffect(() => {
  editableTitle.value = data.value?.resume?.title || "";
  editableDocumentTree.value = data.value?.resume?.document_tree
    ? normalizeResumeDocumentTree(data.value.resume.document_tree)
    : null;
});

async function saveDraft() {
  if (!editableDocumentTree.value) {
    return;
  }

  saving.value = true;
  notice.value = "";

  try {
    await $fetch(`/api/resume/${resumeId}`, {
      method: "PUT",
      body: {
        title: editableTitle.value,
        document_tree: editableDocumentTree.value,
      },
    });
    await refresh();
    notice.value = "Resume draft updated.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Save failed.";
  } finally {
    saving.value = false;
  }
}

async function exportPdf() {
  exporting.value = true;
  notice.value = "";

  try {
    await $fetch(`/api/export/pdf/${resumeId}`, { method: "POST" });
    await refresh();
    notice.value = "PDF export completed.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "PDF export failed.";
  } finally {
    exporting.value = false;
  }
}

function toggleExperienceBullet(experienceId: string, sourceId: string): void {
  const experience = editableDocumentTree.value?.experiences.find(
    (item) => item.id === experienceId,
  );
  const bullet = experience?.bullets.find((item) => item.sourceId === sourceId);

  if (!bullet) {
    return;
  }

  bullet.included = !bullet.included;
}

function toggleProjectBullet(projectId: string, sourceId: string): void {
  const project = editableDocumentTree.value?.projects.find((item) => item.id === projectId);
  const bullet = project?.bullets.find((item) => item.sourceId === sourceId);

  if (!bullet) {
    return;
  }

  bullet.included = !bullet.included;
}

const documentTree = computed(() => editableDocumentTree.value);
const analysis = computed(() => data.value?.resume?.analysis_json as MatchAnalysis | null);
const includedBulletCount = computed(() => {
  if (!editableDocumentTree.value) {
    return 0;
  }

  return getIncludedTextCount(editableDocumentTree.value);
});
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Resume draft</h1>
      <div class="form-grid">
        <label class="field full">
          <span>Draft title</span>
          <input v-model="editableTitle" type="text" />
        </label>
      </div>
      <p class="hint" style="margin-top: 0.75rem">
        Included bullets in draft: {{ includedBulletCount }}
      </p>
      <div class="actions" style="margin-top: 1rem">
        <button class="button" :disabled="saving" @click="saveDraft">
          {{ saving ? "Saving..." : "Save draft" }}
        </button>
        <NuxtLink class="button-secondary" :to="`/resumes/${resumeId}/preview`" target="_blank">
          Open preview
        </NuxtLink>
        <button class="button-secondary" :disabled="exporting" @click="exportPdf">
          {{ exporting ? "Exporting..." : "Export PDF" }}
        </button>
      </div>
      <p v-if="notice" class="hint" style="margin-top: 0.75rem">{{ notice }}</p>
    </section>

    <section class="panel">
      <h2>Export status</h2>
      <div class="record-meta">
        <span>Current resume status: {{ data?.resume?.analysis_json ? "ready" : "draft" }}</span>
        <span>Latest export: {{ data?.latestExportJob?.status || "not started" }}</span>
      </div>
      <p v-if="data?.latestExportJob?.error_message" class="status-error">
        {{ data.latestExportJob.error_message }}
      </p>
      <div class="actions" style="margin-top: 1rem">
        <a
          v-if="data?.pdfUrl"
          class="button-secondary"
          :href="data.pdfUrl"
          target="_blank"
          rel="noreferrer"
        >
          Open latest PDF
        </a>
      </div>
    </section>

    <section v-if="analysis" class="metrics-grid">
      <SharedMetricCard label="Overall score" :value="analysis.overall_score" />
      <SharedMetricCard label="Must-have coverage" :value="analysis.must_have_coverage" />
      <SharedMetricCard label="Semantic similarity" :value="analysis.semantic_similarity" />
      <SharedMetricCard label="Keyword coverage" :value="analysis.keyword_coverage" />
    </section>

    <section class="panel" v-if="data?.evidenceLinks?.length">
      <h2>Requirement to evidence map</h2>
      <ul class="unstyled-list">
        <li v-for="link in data.evidenceLinks" :key="link.id">
          <strong>{{ link.source_type }}</strong> - score {{ link.score }}
          <p class="muted">{{ link.reason }}</p>
        </li>
      </ul>
    </section>

    <section class="panel" v-if="data?.exportJobs?.length">
      <h2>Export job history</h2>
      <div class="record-list">
        <article v-for="job in data.exportJobs" :key="job.id" class="record-card">
          <div class="record-header">
            <strong>Job {{ job.id }}</strong>
            <span
              :class="
                job.status === 'completed'
                  ? 'status-success'
                  : job.status === 'failed'
                    ? 'status-error'
                    : 'status-warning'
              "
            >
              {{ job.status }}
            </span>
          </div>
          <div class="record-meta">
            <span>Created: {{ job.created_at }}</span>
            <span>Updated: {{ job.updated_at }}</span>
          </div>
          <p v-if="job.error_message" class="status-error">{{ job.error_message }}</p>
        </article>
      </div>
    </section>

    <section v-if="documentTree" class="panel">
      <h2>Included experience bullets</h2>
      <div class="record-list">
        <article
          v-for="experience in documentTree.experiences"
          :key="experience.id"
          class="record-card"
        >
          <div class="record-header">
            <strong>{{ experience.roleTitle }} - {{ experience.company }}</strong>
            <span class="muted">{{ experience.dateRange }}</span>
          </div>
          <label
            v-for="bullet in experience.bullets"
            :key="`${bullet.sourceType}:${bullet.sourceId}`"
            class="field"
          >
            <span>
              <input
                :checked="bullet.included"
                type="checkbox"
                style="width: auto; margin-right: 0.5rem"
                @change="toggleExperienceBullet(experience.id, bullet.sourceId)"
              />
              {{ bullet.text }}
            </span>
          </label>
        </article>
      </div>
    </section>

    <section v-if="documentTree?.projects.length" class="panel">
      <h2>Included project bullets</h2>
      <div class="record-list">
        <article v-for="project in documentTree.projects" :key="project.id" class="record-card">
          <div class="record-header">
            <strong>{{ project.title }}</strong>
            <span class="muted">{{ project.url || "No URL" }}</span>
          </div>
          <label
            v-for="bullet in project.bullets"
            :key="`${bullet.sourceType}:${bullet.sourceId}`"
            class="field"
          >
            <span>
              <input
                :checked="bullet.included"
                type="checkbox"
                style="width: auto; margin-right: 0.5rem"
                @change="toggleProjectBullet(project.id, bullet.sourceId)"
              />
              {{ bullet.text }}
            </span>
          </label>
        </article>
      </div>
    </section>

    <ResumeResumeDocumentView v-if="documentTree" :document-tree="documentTree" />
  </div>
</template>
