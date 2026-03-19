<script setup lang="ts">
const auth = useAuthStore()

if (!auth.initialized) {
  await auth.fetchSession()
}

if (!auth.user) {
  await navigateTo('/login')
}

const { data, refresh } = await useFetch('/api/vacancies')
const saving = ref(false)
const form = reactive({
  title: '',
  company: '',
  raw_text: '',
})
const message = ref('')

async function createVacancy() {
  saving.value = true
  message.value = ''

  try {
    const response = await $fetch<{ vacancy: { id: string } }>('/api/vacancies', {
      method: 'POST',
      body: form,
    })

    form.title = ''
    form.company = ''
    form.raw_text = ''
    await refresh()
    await navigateTo(`/vacancies/${response.vacancy.id}`)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Vacancy creation failed.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Vacancies</h1>
      <p class="panel-subtitle">
        Store raw job descriptions, parse them into structured requirements, and inspect match coverage.
      </p>
    </section>

    <section class="two-column">
      <div class="panel">
        <h2>Create vacancy</h2>
        <div class="form-grid">
          <label class="field">
            <span>Title</span>
            <input v-model="form.title" type="text">
          </label>
          <label class="field">
            <span>Company</span>
            <input v-model="form.company" type="text">
          </label>
          <label class="field full">
            <span>Raw vacancy text</span>
            <textarea v-model="form.raw_text"></textarea>
          </label>
        </div>
        <div class="actions" style="margin-top: 1rem;">
          <button class="button" :disabled="saving" @click="createVacancy">
            {{ saving ? 'Saving...' : 'Save vacancy' }}
          </button>
        </div>
        <p v-if="message" class="hint" style="margin-top: 0.75rem;">{{ message }}</p>
      </div>

      <div class="panel">
        <h2>Recent vacancies</h2>
        <ul v-if="data?.vacancies?.length" class="unstyled-list">
          <li v-for="vacancy in data.vacancies" :key="vacancy.id">
            <NuxtLink :to="`/vacancies/${vacancy.id}`">
              <strong>{{ vacancy.title || 'Untitled vacancy' }}</strong>
              <p class="muted">{{ vacancy.company || 'Unknown company' }}</p>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="muted">No vacancies stored yet.</p>
      </div>
    </section>
  </div>
</template>
