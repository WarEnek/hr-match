<script setup lang="ts">
import type { MatchAnalysis, ResumeDocumentTree } from '~/types'

const route = useRoute()
const auth = useAuthStore()

if (!auth.initialized) {
  await auth.fetchSession()
}

if (!auth.user) {
  await navigateTo('/login')
}

const resumeId = route.params.id as string
const { data, refresh } = await useFetch<{
  resume: {
    title: string
    document_tree: ResumeDocumentTree
    analysis_json: MatchAnalysis
  }
  evidenceLinks: Array<{
    id: string
    source_type: string
    score: number
    reason: string
  }>
}>(`/api/resume/${resumeId}`)
const exporting = ref(false)
const saving = ref(false)
const notice = ref('')
const editableTitle = ref('')

watchEffect(() => {
  editableTitle.value = data.value?.resume?.title || ''
})

async function saveDraft() {
  saving.value = true
  notice.value = ''

  try {
    await $fetch(`/api/resume/${resumeId}`, {
      method: 'PUT',
      body: {
        title: editableTitle.value,
        document_tree: data.value?.resume?.document_tree,
      },
    })
    await refresh()
    notice.value = 'Resume draft updated.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

async function exportPdf() {
  exporting.value = true
  notice.value = ''

  try {
    await $fetch(`/api/export/pdf/${resumeId}`, { method: 'POST' })
    await refresh()
    notice.value = 'PDF export completed.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'PDF export failed.'
  } finally {
    exporting.value = false
  }
}

const documentTree = computed(() => data.value?.resume?.document_tree as ResumeDocumentTree | null)
const analysis = computed(() => data.value?.resume?.analysis_json as MatchAnalysis | null)
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Resume draft</h1>
      <div class="form-grid">
        <label class="field full">
          <span>Draft title</span>
          <input v-model="editableTitle" type="text">
        </label>
      </div>
      <div class="actions" style="margin-top: 1rem;">
        <button class="button" :disabled="saving" @click="saveDraft">
          {{ saving ? 'Saving...' : 'Save draft' }}
        </button>
        <NuxtLink class="button-secondary" :to="`/resumes/${resumeId}/preview`" target="_blank">
          Open preview
        </NuxtLink>
        <button class="button-secondary" :disabled="exporting" @click="exportPdf">
          {{ exporting ? 'Exporting...' : 'Export PDF' }}
        </button>
      </div>
      <p v-if="notice" class="hint" style="margin-top: 0.75rem;">{{ notice }}</p>
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

    <ResumeResumeDocumentView v-if="documentTree" :document-tree="documentTree" />
  </div>
</template>
