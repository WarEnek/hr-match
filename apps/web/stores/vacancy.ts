export const useVacancyStore = defineStore("vacancy", () => {
  const vacancies = ref<any[]>([]);
  const loading = ref(false);

  async function fetchVacancies() {
    loading.value = true;

    try {
      const response = await $fetch<{ vacancies: any[] }>("/api/vacancies");
      vacancies.value = response.vacancies;
    } finally {
      loading.value = false;
    }
  }

  return {
    vacancies,
    loading,
    fetchVacancies,
  };
});
