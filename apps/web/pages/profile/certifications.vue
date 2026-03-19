<script setup lang="ts">
import { reactive, ref } from "vue";

import { navigateTo, useFetch } from "#imports";

import type { CertificationRecord } from "~/types";
import { useAuthStore } from "~/stores/auth";
import { normalizeOptionalDate, normalizeOptionalText } from "~/utils/form-helpers";

interface CertificationFormState {
  name: string;
  issuer: string;
  issued_at: string;
  expires_at: string;
  credential_url: string;
}

function createCertificationFormState(): CertificationFormState {
  return {
    name: "",
    issuer: "",
    issued_at: "",
    expires_at: "",
    credential_url: "",
  };
}

const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const { data, refresh } = await useFetch<{ certifications: CertificationRecord[] }>(
  "/api/certifications",
);
const form = reactive<CertificationFormState>(createCertificationFormState());
const editingCertificationId = ref<string | null>(null);
const saving = ref(false);
const deletingCertificationId = ref<string | null>(null);
const notice = ref("");

function resetForm(): void {
  Object.assign(form, createCertificationFormState());
  editingCertificationId.value = null;
}

function startEdit(certification: CertificationRecord): void {
  editingCertificationId.value = certification.id;
  form.name = certification.name;
  form.issuer = certification.issuer || "";
  form.issued_at = certification.issued_at || "";
  form.expires_at = certification.expires_at || "";
  form.credential_url = certification.credential_url || "";
  notice.value = "";
}

async function saveCertification(): Promise<void> {
  saving.value = true;
  notice.value = "";

  const payload = {
    name: form.name,
    issuer: normalizeOptionalText(form.issuer),
    issued_at: normalizeOptionalDate(form.issued_at),
    expires_at: normalizeOptionalDate(form.expires_at),
    credential_url: normalizeOptionalText(form.credential_url),
  };

  try {
    if (editingCertificationId.value) {
      await $fetch(`/api/certifications/${editingCertificationId.value}`, {
        method: "PUT",
        body: payload,
      });
      notice.value = "Certification updated.";
    } else {
      await $fetch("/api/certifications", {
        method: "POST",
        body: payload,
      });
      notice.value = "Certification created.";
    }

    await refresh();
    resetForm();
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Certification save failed.";
  } finally {
    saving.value = false;
  }
}

async function deleteCertification(certificationId: string): Promise<void> {
  deletingCertificationId.value = certificationId;
  notice.value = "";

  try {
    await $fetch(`/api/certifications/${certificationId}`, {
      method: "DELETE",
    });
    await refresh();
    if (editingCertificationId.value === certificationId) {
      resetForm();
    }
    notice.value = "Certification deleted.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Certification delete failed.";
  } finally {
    deletingCertificationId.value = null;
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Certifications</h1>
      <p class="panel-subtitle">
        Store certification facts used by the resume generator and ATS-safe preview.
      </p>
    </section>

    <section class="two-column">
      <div class="panel">
        <h2>{{ editingCertificationId ? "Edit certification" : "Add certification" }}</h2>
        <div class="form-grid">
          <label class="field">
            <span>Name</span>
            <input v-model="form.name" type="text" />
          </label>
          <label class="field">
            <span>Issuer</span>
            <input v-model="form.issuer" type="text" />
          </label>
          <label class="field">
            <span>Issued at</span>
            <input v-model="form.issued_at" type="date" />
          </label>
          <label class="field">
            <span>Expires at</span>
            <input v-model="form.expires_at" type="date" />
          </label>
          <label class="field full">
            <span>Credential URL</span>
            <input v-model="form.credential_url" type="url" />
          </label>
        </div>
        <div class="actions" style="margin-top: 1rem">
          <button class="button" :disabled="saving" @click="saveCertification">
            {{
              saving
                ? "Saving..."
                : editingCertificationId
                  ? "Update certification"
                  : "Create certification"
            }}
          </button>
          <button v-if="editingCertificationId" class="button-secondary" @click="resetForm">
            Cancel
          </button>
        </div>
        <p v-if="notice" class="hint" style="margin-top: 0.75rem">{{ notice }}</p>
      </div>

      <div class="panel">
        <h2>Saved certifications</h2>
        <div v-if="data?.certifications?.length" class="record-list">
          <article
            v-for="certification in data.certifications"
            :key="certification.id"
            class="record-card"
          >
            <div class="record-header">
              <div>
                <strong>{{ certification.name }}</strong>
                <p class="muted">{{ certification.issuer || "Unknown issuer" }}</p>
              </div>
              <div class="actions">
                <button class="button-secondary" @click="startEdit(certification)">Edit</button>
                <button
                  class="button-danger"
                  :disabled="deletingCertificationId === certification.id"
                  @click="deleteCertification(certification.id)"
                >
                  {{ deletingCertificationId === certification.id ? "Deleting..." : "Delete" }}
                </button>
              </div>
            </div>
            <div class="record-meta">
              <span>Issued: {{ certification.issued_at || "n/a" }}</span>
              <span>Expires: {{ certification.expires_at || "n/a" }}</span>
            </div>
            <a
              v-if="certification.credential_url"
              class="muted"
              :href="certification.credential_url"
              target="_blank"
              rel="noreferrer"
            >
              {{ certification.credential_url }}
            </a>
          </article>
        </div>
        <p v-else class="muted">No certifications saved yet.</p>
      </div>
    </section>
  </div>
</template>
