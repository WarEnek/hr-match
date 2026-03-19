export function useResume() {
  const resumes = useState<any[]>('resume-list', () => [])
  const pending = useState<boolean>('resume-pending', () => false)

  async function refresh() {
    pending.value = true

    try {
      const response = await $fetch<{ resumes: any[] }>('/api/resume')
      resumes.value = response.resumes
      return response.resumes
    } finally {
      pending.value = false
    }
  }

  return {
    resumes,
    pending,
    refresh,
  }
}
