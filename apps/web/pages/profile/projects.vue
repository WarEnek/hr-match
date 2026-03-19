<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";

import { navigateTo, useFetch } from "#imports";

import type { ProjectBulletRecord, ProjectRecord } from "~/types";
import { useAuthStore } from "~/stores/auth";
import {
  joinCommaSeparated,
  normalizeOptionalText,
  splitCommaSeparated,
} from "~/utils/form-helpers";

interface ProjectFormState {
  title: string;
  description: string;
  url: string;
  domain_tags: string;
  stack_tags: string;
}

interface ProjectBulletFormState {
  text_raw: string;
  text_refined: string;
  tech_tags: string;
  domain_tags: string;
  result_tags: string;
}

function createProjectFormState(): ProjectFormState {
  return {
    title: "",
    description: "",
    url: "",
    domain_tags: "",
    stack_tags: "",
  };
}

function createProjectBulletFormState(): ProjectBulletFormState {
  return {
    text_raw: "",
    text_refined: "",
    tech_tags: "",
    domain_tags: "",
    result_tags: "",
  };
}

const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const { data, refresh } = await useFetch<{
  projects: ProjectRecord[];
  bullets: ProjectBulletRecord[];
}>("/api/projects");
const projectForm = reactive<ProjectFormState>(createProjectFormState());
const editingProjectId = ref<string | null>(null);
const editingBulletId = ref<string | null>(null);
const savingProject = ref(false);
const deletingProjectId = ref<string | null>(null);
const savingBulletTargetId = ref<string | null>(null);
const deletingBulletId = ref<string | null>(null);
const notice = ref("");
const newBulletForms = reactive<Record<string, ProjectBulletFormState>>({});
const editBulletForms = reactive<Record<string, ProjectBulletFormState>>({});

watchEffect(() => {
  for (const project of data.value?.projects || []) {
    if (!newBulletForms[project.id]) {
      newBulletForms[project.id] = createProjectBulletFormState();
    }
  }
});

const bulletsByProject = computed<Record<string, ProjectBulletRecord[]>>(() => {
  const groupedBullets: Record<string, ProjectBulletRecord[]> = {};

  for (const bullet of data.value?.bullets || []) {
    if (!groupedBullets[bullet.project_id]) {
      groupedBullets[bullet.project_id] = [];
    }

    groupedBullets[bullet.project_id]?.push(bullet);
  }

  return groupedBullets;
});

function resetProjectForm(): void {
  Object.assign(projectForm, createProjectFormState());
  editingProjectId.value = null;
}

function resetBulletForm(form: ProjectBulletFormState): void {
  Object.assign(form, createProjectBulletFormState());
}

function fillProjectForm(project: ProjectRecord): void {
  editingProjectId.value = project.id;
  projectForm.title = project.title;
  projectForm.description = project.description;
  projectForm.url = project.url || "";
  projectForm.domain_tags = joinCommaSeparated(project.domain_tags);
  projectForm.stack_tags = joinCommaSeparated(project.stack_tags);
  notice.value = "";
}

function fillBulletForm(target: ProjectBulletFormState, bullet: ProjectBulletRecord): void {
  target.text_raw = bullet.text_raw || "";
  target.text_refined = bullet.text_refined || "";
  target.tech_tags = joinCommaSeparated(bullet.tech_tags);
  target.domain_tags = joinCommaSeparated(bullet.domain_tags);
  target.result_tags = joinCommaSeparated(bullet.result_tags);
}

function buildProjectPayload() {
  return {
    title: projectForm.title,
    description: projectForm.description,
    url: normalizeOptionalText(projectForm.url),
    domain_tags: splitCommaSeparated(projectForm.domain_tags),
    stack_tags: splitCommaSeparated(projectForm.stack_tags),
  };
}

function buildProjectBulletPayload(form: ProjectBulletFormState) {
  return {
    text_raw: form.text_raw,
    text_refined: normalizeOptionalText(form.text_refined),
    tech_tags: splitCommaSeparated(form.tech_tags),
    domain_tags: splitCommaSeparated(form.domain_tags),
    result_tags: splitCommaSeparated(form.result_tags),
  };
}

function startEditBullet(bullet: ProjectBulletRecord): void {
  editingBulletId.value = bullet.id;
  if (!editBulletForms[bullet.id]) {
    editBulletForms[bullet.id] = createProjectBulletFormState();
  }
  fillBulletForm(editBulletForms[bullet.id], bullet);
  notice.value = "";
}

async function saveProject(): Promise<void> {
  savingProject.value = true;
  notice.value = "";

  try {
    if (editingProjectId.value) {
      await $fetch(`/api/projects/${editingProjectId.value}`, {
        method: "PUT",
        body: buildProjectPayload(),
      });
      notice.value = "Project updated.";
    } else {
      await $fetch("/api/projects", {
        method: "POST",
        body: buildProjectPayload(),
      });
      notice.value = "Project created.";
    }

    await refresh();
    resetProjectForm();
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Project save failed.";
  } finally {
    savingProject.value = false;
  }
}

async function deleteProject(projectId: string): Promise<void> {
  deletingProjectId.value = projectId;
  notice.value = "";

  try {
    await $fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    await refresh();
    if (editingProjectId.value === projectId) {
      resetProjectForm();
    }
    notice.value = "Project deleted.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Project delete failed.";
  } finally {
    deletingProjectId.value = null;
  }
}

async function createBullet(projectId: string): Promise<void> {
  const form = newBulletForms[projectId];
  if (!form) {
    return;
  }

  savingBulletTargetId.value = projectId;
  notice.value = "";

  try {
    await $fetch(`/api/projects/${projectId}/bullets`, {
      method: "POST",
      body: buildProjectBulletPayload(form),
    });
    await refresh();
    resetBulletForm(form);
    notice.value = "Project bullet created.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Project bullet save failed.";
  } finally {
    savingBulletTargetId.value = null;
  }
}

async function updateBullet(bulletId: string): Promise<void> {
  const form = editBulletForms[bulletId];
  if (!form) {
    return;
  }

  savingBulletTargetId.value = bulletId;
  notice.value = "";

  try {
    await $fetch(`/api/project-bullets/${bulletId}`, {
      method: "PUT",
      body: buildProjectBulletPayload(form),
    });
    await refresh();
    editingBulletId.value = null;
    notice.value = "Project bullet updated.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Project bullet update failed.";
  } finally {
    savingBulletTargetId.value = null;
  }
}

async function deleteBullet(bulletId: string): Promise<void> {
  deletingBulletId.value = bulletId;
  notice.value = "";

  try {
    await $fetch(`/api/project-bullets/${bulletId}`, {
      method: "DELETE",
    });
    await refresh();
    if (editingBulletId.value === bulletId) {
      editingBulletId.value = null;
    }
    notice.value = "Project bullet deleted.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Project bullet delete failed.";
  } finally {
    deletingBulletId.value = null;
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Projects</h1>
      <p class="panel-subtitle">
        Store projects and project bullets that can be surfaced as selected project evidence.
      </p>
    </section>

    <section class="panel">
      <h2>{{ editingProjectId ? "Edit project" : "Add project" }}</h2>
      <div class="form-grid">
        <label class="field">
          <span>Title</span>
          <input v-model="projectForm.title" type="text" />
        </label>
        <label class="field">
          <span>URL</span>
          <input v-model="projectForm.url" type="url" />
        </label>
        <label class="field full">
          <span>Description</span>
          <textarea v-model="projectForm.description"></textarea>
        </label>
        <label class="field">
          <span>Domain tags</span>
          <input v-model="projectForm.domain_tags" type="text" placeholder="fintech, marketplace" />
        </label>
        <label class="field">
          <span>Stack tags</span>
          <input
            v-model="projectForm.stack_tags"
            type="text"
            placeholder="vue, supabase, playwright"
          />
        </label>
      </div>
      <div class="actions" style="margin-top: 1rem">
        <button class="button" :disabled="savingProject" @click="saveProject">
          {{ savingProject ? "Saving..." : editingProjectId ? "Update project" : "Create project" }}
        </button>
        <button v-if="editingProjectId" class="button-secondary" @click="resetProjectForm">
          Cancel
        </button>
      </div>
      <p v-if="notice" class="hint" style="margin-top: 0.75rem">{{ notice }}</p>
    </section>

    <section class="panel">
      <h2>Saved projects</h2>
      <div v-if="data?.projects?.length" class="record-list">
        <article v-for="project in data.projects" :key="project.id" class="record-card">
          <div class="record-header">
            <div>
              <strong>{{ project.title }}</strong>
              <p class="muted">{{ project.url || "No URL" }}</p>
            </div>
            <div class="actions">
              <button class="button-secondary" @click="fillProjectForm(project)">Edit</button>
              <button
                class="button-danger"
                :disabled="deletingProjectId === project.id"
                @click="deleteProject(project.id)"
              >
                {{ deletingProjectId === project.id ? "Deleting..." : "Delete" }}
              </button>
            </div>
          </div>
          <p>{{ project.description }}</p>
          <p class="muted">Domain tags: {{ project.domain_tags?.join(", ") || "n/a" }}</p>
          <p class="muted">Stack tags: {{ project.stack_tags?.join(", ") || "n/a" }}</p>

          <div class="nested-panel">
            <h3>Project bullets</h3>
            <div v-if="bulletsByProject[project.id]?.length" class="record-list">
              <div
                v-for="bullet in bulletsByProject[project.id]"
                :key="bullet.id"
                class="bullet-item"
              >
                <template v-if="editingBulletId === bullet.id && editBulletForms[bullet.id]">
                  <div class="inline-grid">
                    <label class="field" style="grid-column: 1 / -1">
                      <span>Raw text</span>
                      <textarea
                        v-model="editBulletForms[bullet.id].text_raw"
                        class="compact-textarea"
                      ></textarea>
                    </label>
                    <label class="field" style="grid-column: 1 / -1">
                      <span>Refined text</span>
                      <textarea
                        v-model="editBulletForms[bullet.id].text_refined"
                        class="compact-textarea"
                      ></textarea>
                    </label>
                    <label class="field">
                      <span>Tech tags</span>
                      <input v-model="editBulletForms[bullet.id].tech_tags" type="text" />
                    </label>
                    <label class="field">
                      <span>Domain tags</span>
                      <input v-model="editBulletForms[bullet.id].domain_tags" type="text" />
                    </label>
                    <label class="field">
                      <span>Result tags</span>
                      <input v-model="editBulletForms[bullet.id].result_tags" type="text" />
                    </label>
                  </div>
                  <div class="actions">
                    <button
                      class="button"
                      :disabled="savingBulletTargetId === bullet.id"
                      @click="updateBullet(bullet.id)"
                    >
                      {{ savingBulletTargetId === bullet.id ? "Saving..." : "Update bullet" }}
                    </button>
                    <button class="button-secondary" @click="editingBulletId = null">Cancel</button>
                  </div>
                </template>
                <template v-else>
                  <p>{{ bullet.text_refined || bullet.text_raw }}</p>
                  <p class="muted">Tech: {{ bullet.tech_tags?.join(", ") || "n/a" }}</p>
                  <div class="actions">
                    <button class="button-secondary" @click="startEditBullet(bullet)">
                      Edit bullet
                    </button>
                    <button
                      class="button-danger"
                      :disabled="deletingBulletId === bullet.id"
                      @click="deleteBullet(bullet.id)"
                    >
                      {{ deletingBulletId === bullet.id ? "Deleting..." : "Delete" }}
                    </button>
                  </div>
                </template>
              </div>
            </div>
            <p v-else class="muted">No project bullets yet.</p>

            <div v-if="newBulletForms[project.id]" class="nested-panel">
              <h3>Add project bullet</h3>
              <div class="inline-grid">
                <label class="field" style="grid-column: 1 / -1">
                  <span>Raw text</span>
                  <textarea
                    v-model="newBulletForms[project.id].text_raw"
                    class="compact-textarea"
                  ></textarea>
                </label>
                <label class="field" style="grid-column: 1 / -1">
                  <span>Refined text</span>
                  <textarea
                    v-model="newBulletForms[project.id].text_refined"
                    class="compact-textarea"
                  ></textarea>
                </label>
                <label class="field">
                  <span>Tech tags</span>
                  <input v-model="newBulletForms[project.id].tech_tags" type="text" />
                </label>
                <label class="field">
                  <span>Domain tags</span>
                  <input v-model="newBulletForms[project.id].domain_tags" type="text" />
                </label>
                <label class="field">
                  <span>Result tags</span>
                  <input v-model="newBulletForms[project.id].result_tags" type="text" />
                </label>
              </div>
              <div class="actions">
                <button
                  class="button"
                  :disabled="savingBulletTargetId === project.id"
                  @click="createBullet(project.id)"
                >
                  {{ savingBulletTargetId === project.id ? "Saving..." : "Create bullet" }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
      <p v-else class="muted">No projects saved yet.</p>
    </section>
  </div>
</template>
