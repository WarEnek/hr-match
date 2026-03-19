<script setup lang="ts">
const auth = useAuthStore()
const mode = ref<'sign_in' | 'sign_up'>('sign_in')
const form = reactive({
  email: '',
  password: '',
})
const errorMessage = ref('')

if (!auth.initialized) {
  await auth.fetchSession()
}

if (auth.user) {
  await navigateTo('/dashboard')
}

const submitButtonLabel = computed(() => {
  if (auth.loading) {
    return 'Working...'
  }

  if (mode.value === 'sign_in') {
    return 'Continue'
  }

  return 'Create account'
})

async function submit() {
  errorMessage.value = ''

  try {
    if (mode.value === 'sign_in') {
      await auth.signIn(form)
    } else {
      await auth.signUp(form)
    }

    await navigateTo('/dashboard')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authentication failed.'
  }
}
</script>

<template>
  <div class="two-column">
    <section class="panel">
      <h1>Sign in to hr-match</h1>
      <p class="panel-subtitle">
        Supabase Auth is configured through server-side Nuxt API routes and SSR cookies.
      </p>
      <div class="actions">
        <button class="button-secondary" :class="{ button: mode === 'sign_in' }" @click="mode = 'sign_in'">
          Sign in
        </button>
        <button class="button-secondary" :class="{ button: mode === 'sign_up' }" @click="mode = 'sign_up'">
          Create account
        </button>
      </div>
      <div class="form-grid" style="margin-top: 1rem;">
        <label class="field full">
          <span>Email</span>
          <input v-model="form.email" type="email" autocomplete="email" required>
        </label>
        <label class="field full">
          <span>Password</span>
          <input v-model="form.password" type="password" autocomplete="current-password" required>
        </label>
      </div>
      <p v-if="errorMessage" class="status-error" style="margin-top: 1rem;">{{ errorMessage }}</p>
      <div class="actions" style="margin-top: 1rem;">
        <button class="button" :disabled="auth.loading" @click="submit">
          {{ submitButtonLabel }}
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>MVP coverage</h2>
      <ul>
        <li>Server-side Supabase session handling with secure cookies</li>
        <li>Vacancy parsing via Novita Structured Outputs</li>
        <li>Requirement-to-evidence match skeleton with scoring breakdown</li>
        <li>ATS-safe preview page plus Playwright PDF export</li>
      </ul>
    </section>
  </div>
</template>
