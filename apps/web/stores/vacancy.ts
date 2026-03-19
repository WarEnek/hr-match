import type { VacancyListItem } from "~/types";

export const useVacancyStore = defineStore("vacancy", () => {
  const vacancies = ref<VacancyListItem[]>([]);
  const loading = ref(false);

  async function fetchVacancies() {
    loading.value = true;

    try {
      const response = await $fetch<{ vacancies: VacancyListItem[] }>("/api/vacancies");
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
