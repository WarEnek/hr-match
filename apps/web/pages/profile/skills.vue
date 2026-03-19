<script setup lang="ts">
import { reactive, ref } from "vue";

import { navigateTo, useFetch } from "#imports";

import type { SkillRecord } from "~/types";
import { useAuthStore } from "~/stores/auth";
import {
  joinCommaSeparated,
  normalizeOptionalNumber,
  normalizeOptionalText,
  splitCommaSeparated,
} from "~/utils/form-helpers";

interface SkillFormState {
  name: string;
  category: string;
  years: string;
  level: string;
  keywords: string;
}

function createSkillFormState(): SkillFormState {
  return {
    name: "",
    category: "",
    years: "",
    level: "",
    keywords: "",
  };
}

const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const { data, refresh } = await useFetch<{ skills: SkillRecord[] }>("/api/skills");
const form = reactive<SkillFormState>(createSkillFormState());
const editingSkillId = ref<string | null>(null);
const saving = ref(false);
const deletingSkillId = ref<string | null>(null);
const notice = ref("");

function resetForm(): void {
  Object.assign(form, createSkillFormState());
  editingSkillId.value = null;
}

function startEdit(skill: SkillRecord): void {
  editingSkillId.value = skill.id;
  form.name = skill.name;
  form.category = skill.category || "";
  form.years = skill.years === null || skill.years === undefined ? "" : String(skill.years);
  form.level = skill.level || "";
  form.keywords = joinCommaSeparated(skill.keywords);
  notice.value = "";
}

async function saveSkill(): Promise<void> {
  saving.value = true;
  notice.value = "";

  const payload = {
    name: form.name,
    category: normalizeOptionalText(form.category),
    years: normalizeOptionalNumber(form.years),
    level: normalizeOptionalText(form.level),
    keywords: splitCommaSeparated(form.keywords),
  };

  try {
    if (editingSkillId.value) {
      await $fetch(`/api/skills/${editingSkillId.value}`, {
        method: "PUT",
        body: payload,
      });
      notice.value = "Skill updated.";
    } else {
      await $fetch("/api/skills", {
        method: "POST",
        body: payload,
      });
      notice.value = "Skill created.";
    }

    await refresh();
    resetForm();
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Skill save failed.";
  } finally {
    saving.value = false;
  }
}

async function deleteSkill(skillId: string): Promise<void> {
  deletingSkillId.value = skillId;
  notice.value = "";

  try {
    await $fetch(`/api/skills/${skillId}`, {
      method: "DELETE",
    });
    await refresh();
    if (editingSkillId.value === skillId) {
      resetForm();
    }
    notice.value = "Skill deleted.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Skill delete failed.";
  } finally {
    deletingSkillId.value = null;
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Skills</h1>
      <p class="panel-subtitle">
        Capture core skills, levels, years of experience, and keywords used by the matching layer.
      </p>
    </section>

    <section class="two-column">
      <div class="panel">
        <h2>{{ editingSkillId ? "Edit skill" : "Add skill" }}</h2>
        <div class="form-grid">
          <label class="field">
            <span>Name</span>
            <input v-model="form.name" type="text" />
          </label>
          <label class="field">
            <span>Category</span>
            <input v-model="form.category" type="text" placeholder="frontend, backend, cloud" />
          </label>
          <label class="field">
            <span>Years</span>
            <input v-model="form.years" type="number" min="0" step="0.1" />
          </label>
          <label class="field">
            <span>Level</span>
            <input v-model="form.level" type="text" placeholder="advanced, intermediate" />
          </label>
          <label class="field full">
            <span>Keywords</span>
            <input v-model="form.keywords" type="text" placeholder="nuxt, typescript, ssr" />
          </label>
        </div>
        <div class="actions" style="margin-top: 1rem">
          <button class="button" :disabled="saving" @click="saveSkill">
            {{ saving ? "Saving..." : editingSkillId ? "Update skill" : "Create skill" }}
          </button>
          <button v-if="editingSkillId" class="button-secondary" @click="resetForm">Cancel</button>
        </div>
        <p v-if="notice" class="hint" style="margin-top: 0.75rem">{{ notice }}</p>
      </div>

      <div class="panel">
        <h2>Saved skills</h2>
        <div v-if="data?.skills?.length" class="record-list">
          <article v-for="skill in data.skills" :key="skill.id" class="record-card">
            <div class="record-header">
              <div>
                <strong>{{ skill.name }}</strong>
                <p class="muted">{{ skill.level || "No level specified" }}</p>
              </div>
              <div class="actions">
                <button class="button-secondary" @click="startEdit(skill)">Edit</button>
                <button
                  class="button-danger"
                  :disabled="deletingSkillId === skill.id"
                  @click="deleteSkill(skill.id)"
                >
                  {{ deletingSkillId === skill.id ? "Deleting..." : "Delete" }}
                </button>
              </div>
            </div>
            <div class="record-meta">
              <span>Category: {{ skill.category || "n/a" }}</span>
              <span>Years: {{ skill.years ?? "n/a" }}</span>
            </div>
            <p class="muted">Keywords: {{ skill.keywords.join(", ") || "n/a" }}</p>
          </article>
        </div>
        <p v-else class="muted">No skills saved yet.</p>
      </div>
    </section>
  </div>
</template>
