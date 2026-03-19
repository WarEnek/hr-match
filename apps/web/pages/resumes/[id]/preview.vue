<script setup lang="ts">
import type { ResumeDocumentTree } from '~/types'

const route = useRoute()
const auth = useAuthStore()

if (!auth.initialized) {
  await auth.fetchSession()
}

if (!auth.user) {
  await navigateTo('/login')
}

const { data } = await useFetch<{
  resume: {
    document_tree: ResumeDocumentTree
  }
}>(`/api/resume/${route.params.id}`)
const documentTree = computed(() => data.value?.resume?.document_tree as ResumeDocumentTree | null)
</script>

<template>
  <div class="stack">
    <div class="panel no-print">
      <h1>ATS-safe preview</h1>
      <p class="muted">
        Single-column printable HTML optimized for Playwright page.pdf() and applicant tracking systems.
      </p>
    </div>

    <ResumeResumeDocumentView v-if="documentTree" :document-tree="documentTree" />
  </div>
</template>
