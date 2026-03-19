export function useVacancy() {
  const vacancies = useState<any[]>('vacancy-list', () => [])
  const pending = useState<boolean>('vacancy-pending', () => false)

  async function refresh() {
    pending.value = true

    try {
      const response = await $fetch<{ vacancies: any[] }>('/api/vacancies')
      vacancies.value = response.vacancies
      return response.vacancies
    } finally {
      pending.value = false
    }
  }

  return {
    vacancies,
    pending,
    refresh,
  }
}
