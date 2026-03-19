import type { ProfileRecord } from '~/types'

export function useProfile() {
  const profile = useState<ProfileRecord | null>('profile-record', () => null)
  const pending = useState<boolean>('profile-pending', () => false)

  async function refresh() {
    pending.value = true

    try {
      const response = await $fetch<{ profile: ProfileRecord | null }>('/api/profile')
      profile.value = response.profile
      return response.profile
    } finally {
      pending.value = false
    }
  }

  return {
    profile,
    pending,
    refresh,
  }
}
