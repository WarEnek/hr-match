<script setup lang="ts">
import { reactive, ref, watchEffect } from "vue";

import { navigateTo, useFetch } from "#imports";

import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const { data, refresh } = await useFetch<{
  profile: {
    full_name: string;
    headline: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    website_url: string | null;
    summary_default: string | null;
  } | null;
}>("/api/profile");
const saving = ref(false);
const message = ref("");
const form = reactive({
  full_name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  linkedin_url: "",
  github_url: "",
  website_url: "",
  summary_default: "",
});

watchEffect(() => {
  const profile = data.value?.profile;

  if (!profile) {
    return;
  }

  form.full_name = profile.full_name || "";
  form.headline = profile.headline || "";
  form.email = profile.email || "";
  form.phone = profile.phone || "";
  form.location = profile.location || "";
  form.linkedin_url = profile.linkedin_url || "";
  form.github_url = profile.github_url || "";
  form.website_url = profile.website_url || "";
  form.summary_default = profile.summary_default || "";
});

async function saveProfile() {
  saving.value = true;
  message.value = "";

  try {
    const method = data.value?.profile ? "PUT" : "POST";
    await $fetch("/api/profile", {
      method,
      body: form,
    });
    await refresh();
    message.value = "Profile saved.";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Profile save failed.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Candidate profile</h1>
      <p class="panel-subtitle">
        Source of truth for ATS-safe resume generation. Only stored facts can be used later.
      </p>
    </section>

    <section class="panel">
      <div class="form-grid">
        <label class="field">
          <span>Full name</span>
          <input v-model="form.full_name" type="text" />
        </label>
        <label class="field">
          <span>Headline</span>
          <input v-model="form.headline" type="text" />
        </label>
        <label class="field">
          <span>Email</span>
          <input v-model="form.email" type="email" />
        </label>
        <label class="field">
          <span>Phone</span>
          <input v-model="form.phone" type="text" />
        </label>
        <label class="field">
          <span>Location</span>
          <input v-model="form.location" type="text" />
        </label>
        <label class="field">
          <span>LinkedIn URL</span>
          <input v-model="form.linkedin_url" type="url" />
        </label>
        <label class="field">
          <span>GitHub URL</span>
          <input v-model="form.github_url" type="url" />
        </label>
        <label class="field">
          <span>Website URL</span>
          <input v-model="form.website_url" type="url" />
        </label>
        <label class="field full">
          <span>Default summary</span>
          <textarea v-model="form.summary_default"></textarea>
        </label>
      </div>
      <div class="actions" style="margin-top: 1rem">
        <button class="button" :disabled="saving" @click="saveProfile">
          {{ saving ? "Saving..." : "Save profile" }}
        </button>
      </div>
      <p v-if="message" class="hint" style="margin-top: 0.75rem">{{ message }}</p>
    </section>

    <section class="page-grid">
      <article class="panel">
        <h2>Experience</h2>
        <p class="muted">Manage employers, dates, stack tags, and evidence bullets.</p>
        <div class="actions">
          <NuxtLink class="button-secondary" to="/profile/experience">Open experience</NuxtLink>
        </div>
      </article>

      <article class="panel">
        <h2>Skills</h2>
        <p class="muted">Store core skills, levels, and matching keywords.</p>
        <div class="actions">
          <NuxtLink class="button-secondary" to="/profile/skills">Open skills</NuxtLink>
        </div>
      </article>

      <article class="panel">
        <h2>Projects</h2>
        <p class="muted">Add project evidence with supporting bullets.</p>
        <div class="actions">
          <NuxtLink class="button-secondary" to="/profile/projects">Open projects</NuxtLink>
        </div>
      </article>

      <article class="panel">
        <h2>Certifications</h2>
        <p class="muted">Track certificates and credential links used in the resume.</p>
        <div class="actions">
          <NuxtLink class="button-secondary" to="/profile/certifications">
            Open certifications
          </NuxtLink>
        </div>
      </article>
    </section>
  </div>
</template>
