<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()
const loading = ref(false)

onMounted(() => {
  if (!auth.initialized) {
    auth.fetchSession()
  }
})

const isAuthenticated = computed(() => Boolean(auth.user))

async function handleLogout() {
  loading.value = true

  try {
    await auth.signOut()
    await navigateTo('/login')
  } finally {
    loading.value = false
  }
}

const links = computed(() => {
  if (!isAuthenticated.value) {
    return []
  }

  return [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/profile', label: 'Profile' },
    { to: '/vacancies', label: 'Vacancies' },
    { to: '/resumes', label: 'Resumes' },
    { to: '/settings/ai', label: 'AI Settings' },
  ]
})
</script>

<template>
  <header class="app-header">
    <div>
      <strong>hr-match</strong>
      <div class="hint">ATS-safe CV generator MVP</div>
    </div>

    <nav v-if="isAuthenticated">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :aria-current="route.path === link.to ? 'page' : undefined"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <div class="actions no-print">
      <NuxtLink v-if="!isAuthenticated" class="button-secondary" to="/login">
        Sign in
      </NuxtLink>
      <button v-else class="button-secondary" :disabled="loading" @click="handleLogout">
        {{ loading ? 'Signing out...' : 'Logout' }}
      </button>
    </div>
  </header>
</template>
