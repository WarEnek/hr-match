import type { User } from '@supabase/supabase-js'

interface SessionResponse {
  user: User | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  async function fetchSession() {
    loading.value = true

    try {
      const response = await $fetch<SessionResponse>('/api/auth/session')
      user.value = response.user
    } catch {
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function signIn(payload: { email: string; password: string }) {
    loading.value = true

    try {
      const response = await $fetch<SessionResponse>('/api/auth/session', {
        method: 'POST',
        body: {
          mode: 'sign_in',
          ...payload,
        },
      })

      user.value = response.user
      initialized.value = true
      return response
    } finally {
      loading.value = false
    }
  }

  async function signUp(payload: { email: string; password: string }) {
    loading.value = true

    try {
      const response = await $fetch<SessionResponse>('/api/auth/session', {
        method: 'POST',
        body: {
          mode: 'sign_up',
          ...payload,
        },
      })

      user.value = response.user
      initialized.value = true
      return response
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true

    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  return {
    user,
    loading,
    initialized,
    fetchSession,
    signIn,
    signUp,
    signOut,
  }
})
