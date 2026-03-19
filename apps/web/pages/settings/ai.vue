<script setup lang="ts">
const auth = useAuthStore()

if (!auth.initialized) {
  await auth.fetchSession()
}

if (!auth.user) {
  await navigateTo('/login')
}

const { data, refresh } = await useFetch<{
  settings: {
    provider: string
    base_url: string
    model: string
    temperature: number
    max_tokens: number
    has_api_key: boolean
  } | null
}>('/api/settings/ai')
const saving = ref(false)
const testing = ref(false)
const notice = ref('')
const form = reactive({
  provider: 'novita',
  base_url: 'https://api.novita.ai/openai',
  model: 'google/gemma-3-12b-it',
  api_key: '',
  temperature: 0.2,
  max_tokens: 900,
})

watchEffect(() => {
  const settings = data.value?.settings

  if (!settings) {
    return
  }

  form.provider = settings.provider || 'novita'
  form.base_url = settings.base_url || 'https://api.novita.ai/openai'
  form.model = settings.model || 'google/gemma-3-12b-it'
  form.temperature = settings.temperature || 0.2
  form.max_tokens = settings.max_tokens || 900
})

async function saveSettings() {
  saving.value = true
  notice.value = ''

  try {
    await $fetch('/api/settings/ai', {
      method: 'PUT',
      body: form,
    })
    await refresh()
    form.api_key = ''
    notice.value = 'AI settings saved.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  notice.value = ''

  try {
    const response = await $fetch<{ ok: boolean; message: string }>('/api/settings/ai/test', {
      method: 'POST',
      body: form,
    })
    notice.value = response.message
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Connection test failed.'
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>AI settings</h1>
      <p class="panel-subtitle">
        Novita OpenAI-compatible configuration. API keys are encrypted before they are stored.
      </p>
    </section>

    <section class="panel">
      <div class="form-grid">
        <label class="field">
          <span>Provider</span>
          <input v-model="form.provider" type="text">
        </label>
        <label class="field">
          <span>Base URL</span>
          <input v-model="form.base_url" type="url">
        </label>
        <label class="field">
          <span>Model</span>
          <input v-model="form.model" type="text">
        </label>
        <label class="field">
          <span>API key</span>
          <input v-model="form.api_key" type="password" placeholder="Leave blank to keep the current key">
        </label>
        <label class="field">
          <span>Temperature</span>
          <input v-model.number="form.temperature" type="number" min="0" max="1" step="0.1">
        </label>
        <label class="field">
          <span>Max tokens</span>
          <input v-model.number="form.max_tokens" type="number" min="128" step="1">
        </label>
      </div>
      <p class="hint" style="margin-top: 0.75rem;">
        Stored key status: {{ data?.settings?.has_api_key ? 'configured' : 'missing' }}
      </p>
      <div class="actions" style="margin-top: 1rem;">
        <button class="button" :disabled="saving" @click="saveSettings">
          {{ saving ? 'Saving...' : 'Save settings' }}
        </button>
        <button class="button-secondary" :disabled="testing" @click="testConnection">
          {{ testing ? 'Testing...' : 'Test connection' }}
        </button>
      </div>
      <p v-if="notice" class="hint" style="margin-top: 0.75rem;">{{ notice }}</p>
    </section>
  </div>
</template>
