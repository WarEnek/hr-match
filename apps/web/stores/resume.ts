export const useResumeStore = defineStore('resume', () => {
  const resumes = ref<any[]>([])
  const loading = ref(false)

  async function fetchResumes() {
    loading.value = true

    try {
      const response = await $fetch<{ resumes: any[] }>('/api/resume')
      resumes.value = response.resumes
    } finally {
      loading.value = false
    }
  }

  return {
    resumes,
    loading,
    fetchResumes,
  }
})
