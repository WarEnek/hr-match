<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";

import { navigateTo, useFetch } from "#imports";

import type { ExperienceBulletRecord, ExperienceRecord } from "~/types";
import { useAuthStore } from "~/stores/auth";
import {
  joinCommaSeparated,
  normalizeOptionalDate,
  normalizeOptionalText,
  splitCommaSeparated,
} from "~/utils/form-helpers";

interface ExperienceFormState {
  company: string;
  role_title: string;
  employment_type: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  domain_tags: string;
  stack_tags: string;
}

interface BulletFormState {
  text_raw: string;
  text_refined: string;
  tech_tags: string;
  domain_tags: string;
  result_tags: string;
  seniority_tags: string;
}

function createExperienceFormState(): ExperienceFormState {
  return {
    company: "",
    role_title: "",
    employment_type: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    domain_tags: "",
    stack_tags: "",
  };
}

function createBulletFormState(): BulletFormState {
  return {
    text_raw: "",
    text_refined: "",
    tech_tags: "",
    domain_tags: "",
    result_tags: "",
    seniority_tags: "",
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
  experiences: ExperienceRecord[];
  bullets: ExperienceBulletRecord[];
}>("/api/experiences");
const experienceForm = reactive<ExperienceFormState>(createExperienceFormState());
const editingExperienceId = ref<string | null>(null);
const editingBulletId = ref<string | null>(null);
const savingExperience = ref(false);
const deletingExperienceId = ref<string | null>(null);
const savingBulletTargetId = ref<string | null>(null);
const deletingBulletId = ref<string | null>(null);
const notice = ref("");
const newBulletForms = reactive<Record<string, BulletFormState>>({});
const editBulletForms = reactive<Record<string, BulletFormState>>({});

watchEffect(() => {
  for (const experience of data.value?.experiences || []) {
    if (!newBulletForms[experience.id]) {
      newBulletForms[experience.id] = createBulletFormState();
    }
  }
});

const bulletsByExperience = computed<Record<string, ExperienceBulletRecord[]>>(() => {
  const groupedBullets: Record<string, ExperienceBulletRecord[]> = {};

  for (const bullet of data.value?.bullets || []) {
    if (!groupedBullets[bullet.experience_id]) {
      groupedBullets[bullet.experience_id] = [];
    }

    groupedBullets[bullet.experience_id]?.push(bullet);
  }

  return groupedBullets;
});

function resetExperienceForm(): void {
  Object.assign(experienceForm, createExperienceFormState());
  editingExperienceId.value = null;
}

function resetBulletForm(form: BulletFormState): void {
  Object.assign(form, createBulletFormState());
}

function fillExperienceForm(experience: ExperienceRecord): void {
  editingExperienceId.value = experience.id;
  experienceForm.company = experience.company;
  experienceForm.role_title = experience.role_title;
  experienceForm.employment_type = experience.employment_type || "";
  experienceForm.location = experience.location || "";
  experienceForm.start_date = experience.start_date || "";
  experienceForm.end_date = experience.end_date || "";
  experienceForm.is_current = experience.is_current;
  experienceForm.domain_tags = joinCommaSeparated(experience.domain_tags);
  experienceForm.stack_tags = joinCommaSeparated(experience.stack_tags);
  notice.value = "";
}

function fillBulletForm(target: BulletFormState, bullet: ExperienceBulletRecord): void {
  target.text_raw = bullet.text_raw || "";
  target.text_refined = bullet.text_refined || "";
  target.tech_tags = joinCommaSeparated(bullet.tech_tags);
  target.domain_tags = joinCommaSeparated(bullet.domain_tags);
  target.result_tags = joinCommaSeparated(bullet.result_tags);
  target.seniority_tags = joinCommaSeparated(bullet.seniority_tags);
}

function buildExperiencePayload() {
  return {
    company: experienceForm.company,
    role_title: experienceForm.role_title,
    employment_type: normalizeOptionalText(experienceForm.employment_type),
    location: normalizeOptionalText(experienceForm.location),
    start_date: normalizeOptionalDate(experienceForm.start_date),
    end_date: normalizeOptionalDate(experienceForm.end_date),
    is_current: experienceForm.is_current,
    domain_tags: splitCommaSeparated(experienceForm.domain_tags),
    stack_tags: splitCommaSeparated(experienceForm.stack_tags),
  };
}

function buildBulletPayload(form: BulletFormState) {
  return {
    text_raw: form.text_raw,
    text_refined: normalizeOptionalText(form.text_refined),
    tech_tags: splitCommaSeparated(form.tech_tags),
    domain_tags: splitCommaSeparated(form.domain_tags),
    result_tags: splitCommaSeparated(form.result_tags),
    seniority_tags: splitCommaSeparated(form.seniority_tags),
  };
}

function startEditBullet(bullet: ExperienceBulletRecord): void {
  editingBulletId.value = bullet.id;
  if (!editBulletForms[bullet.id]) {
    editBulletForms[bullet.id] = createBulletFormState();
  }
  fillBulletForm(editBulletForms[bullet.id], bullet);
  notice.value = "";
}

async function saveExperience(): Promise<void> {
  savingExperience.value = true;
  notice.value = "";

  try {
    if (editingExperienceId.value) {
      await $fetch(`/api/experiences/${editingExperienceId.value}`, {
        method: "PUT",
        body: buildExperiencePayload(),
      });
      notice.value = "Experience updated.";
    } else {
      await $fetch("/api/experiences", {
        method: "POST",
        body: buildExperiencePayload(),
      });
      notice.value = "Experience created.";
    }

    await refresh();
    resetExperienceForm();
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Experience save failed.";
  } finally {
    savingExperience.value = false;
  }
}

async function deleteExperience(experienceId: string): Promise<void> {
  deletingExperienceId.value = experienceId;
  notice.value = "";

  try {
    await $fetch(`/api/experiences/${experienceId}`, {
      method: "DELETE",
    });
    await refresh();
    if (editingExperienceId.value === experienceId) {
      resetExperienceForm();
    }
    notice.value = "Experience deleted.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Experience delete failed.";
  } finally {
    deletingExperienceId.value = null;
  }
}

async function createBullet(experienceId: string): Promise<void> {
  const form = newBulletForms[experienceId];
  if (!form) {
    return;
  }

  savingBulletTargetId.value = experienceId;
  notice.value = "";

  try {
    await $fetch(`/api/experiences/${experienceId}/bullets`, {
      method: "POST",
      body: buildBulletPayload(form),
    });
    await refresh();
    resetBulletForm(form);
    notice.value = "Experience bullet created.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Experience bullet save failed.";
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
    await $fetch(`/api/bullets/${bulletId}`, {
      method: "PUT",
      body: buildBulletPayload(form),
    });
    await refresh();
    editingBulletId.value = null;
    notice.value = "Experience bullet updated.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Experience bullet update failed.";
  } finally {
    savingBulletTargetId.value = null;
  }
}

async function deleteBullet(bulletId: string): Promise<void> {
  deletingBulletId.value = bulletId;
  notice.value = "";

  try {
    await $fetch(`/api/bullets/${bulletId}`, {
      method: "DELETE",
    });
    await refresh();
    if (editingBulletId.value === bulletId) {
      editingBulletId.value = null;
    }
    notice.value = "Experience bullet deleted.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Experience bullet delete failed.";
  } finally {
    deletingBulletId.value = null;
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Experience</h1>
      <p class="panel-subtitle">
        Manage work history and factual bullets used for evidence-based resume composition.
      </p>
    </section>

    <section class="panel">
      <h2>{{ editingExperienceId ? "Edit experience" : "Add experience" }}</h2>
      <div class="form-grid">
        <label class="field">
          <span>Company</span>
          <input v-model="experienceForm.company" type="text" />
        </label>
        <label class="field">
          <span>Role title</span>
          <input v-model="experienceForm.role_title" type="text" />
        </label>
        <label class="field">
          <span>Employment type</span>
          <input v-model="experienceForm.employment_type" type="text" />
        </label>
        <label class="field">
          <span>Location</span>
          <input v-model="experienceForm.location" type="text" />
        </label>
        <label class="field">
          <span>Start date</span>
          <input v-model="experienceForm.start_date" type="date" />
        </label>
        <label class="field">
          <span>End date</span>
          <input
            v-model="experienceForm.end_date"
            type="date"
            :disabled="experienceForm.is_current"
          />
        </label>
        <label class="field">
          <span>Domain tags</span>
          <input
            v-model="experienceForm.domain_tags"
            type="text"
            placeholder="fintech, ecommerce"
          />
        </label>
        <label class="field">
          <span>Stack tags</span>
          <input v-model="experienceForm.stack_tags" type="text" placeholder="vue, nuxt, node" />
        </label>
        <label class="field full">
          <span>
            <input
              v-model="experienceForm.is_current"
              type="checkbox"
              style="width: auto; margin-right: 0.5rem"
            />
            Current role
          </span>
        </label>
      </div>
      <div class="actions" style="margin-top: 1rem">
        <button class="button" :disabled="savingExperience" @click="saveExperience">
          {{
            savingExperience
              ? "Saving..."
              : editingExperienceId
                ? "Update experience"
                : "Create experience"
          }}
        </button>
        <button v-if="editingExperienceId" class="button-secondary" @click="resetExperienceForm">
          Cancel
        </button>
      </div>
      <p v-if="notice" class="hint" style="margin-top: 0.75rem">{{ notice }}</p>
    </section>

    <section class="panel">
      <h2>Saved experience</h2>
      <div v-if="data?.experiences?.length" class="record-list">
        <article v-for="experience in data.experiences" :key="experience.id" class="record-card">
          <div class="record-header">
            <div>
              <strong>{{ experience.role_title }} - {{ experience.company }}</strong>
              <p class="muted">{{ experience.location || "No location" }}</p>
            </div>
            <div class="actions">
              <button class="button-secondary" @click="fillExperienceForm(experience)">Edit</button>
              <button
                class="button-danger"
                :disabled="deletingExperienceId === experience.id"
                @click="deleteExperience(experience.id)"
              >
                {{ deletingExperienceId === experience.id ? "Deleting..." : "Delete" }}
              </button>
            </div>
          </div>
          <div class="record-meta">
            <span
              >{{ experience.start_date || "n/a" }} -
              {{ experience.is_current ? "Present" : experience.end_date || "n/a" }}</span
            >
            <span>{{ experience.employment_type || "Employment type n/a" }}</span>
          </div>
          <p class="muted">Domain tags: {{ experience.domain_tags?.join(", ") || "n/a" }}</p>
          <p class="muted">Stack tags: {{ experience.stack_tags?.join(", ") || "n/a" }}</p>

          <div class="nested-panel">
            <h3>Bullets</h3>
            <div v-if="bulletsByExperience[experience.id]?.length" class="record-list">
              <div
                v-for="bullet in bulletsByExperience[experience.id]"
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
                    <label class="field">
                      <span>Seniority tags</span>
                      <input v-model="editBulletForms[bullet.id].seniority_tags" type="text" />
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
                  <p class="muted">Domain: {{ bullet.domain_tags?.join(", ") || "n/a" }}</p>
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
            <p v-else class="muted">No bullets for this experience yet.</p>

            <div v-if="newBulletForms[experience.id]" class="nested-panel">
              <h3>Add bullet</h3>
              <div class="inline-grid">
                <label class="field" style="grid-column: 1 / -1">
                  <span>Raw text</span>
                  <textarea
                    v-model="newBulletForms[experience.id].text_raw"
                    class="compact-textarea"
                  ></textarea>
                </label>
                <label class="field" style="grid-column: 1 / -1">
                  <span>Refined text</span>
                  <textarea
                    v-model="newBulletForms[experience.id].text_refined"
                    class="compact-textarea"
                  ></textarea>
                </label>
                <label class="field">
                  <span>Tech tags</span>
                  <input v-model="newBulletForms[experience.id].tech_tags" type="text" />
                </label>
                <label class="field">
                  <span>Domain tags</span>
                  <input v-model="newBulletForms[experience.id].domain_tags" type="text" />
                </label>
                <label class="field">
                  <span>Result tags</span>
                  <input v-model="newBulletForms[experience.id].result_tags" type="text" />
                </label>
                <label class="field">
                  <span>Seniority tags</span>
                  <input v-model="newBulletForms[experience.id].seniority_tags" type="text" />
                </label>
              </div>
              <div class="actions">
                <button
                  class="button"
                  :disabled="savingBulletTargetId === experience.id"
                  @click="createBullet(experience.id)"
                >
                  {{ savingBulletTargetId === experience.id ? "Saving..." : "Create bullet" }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
      <p v-else class="muted">No experiences saved yet.</p>
    </section>
  </div>
</template>
