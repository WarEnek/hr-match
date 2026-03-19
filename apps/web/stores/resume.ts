import type { ResumeListItem } from "~/types";

export const useResumeStore = defineStore("resume", () => {
  const resumes = ref<ResumeListItem[]>([]);
  const loading = ref(false);

  async function fetchResumes() {
    loading.value = true;

    try {
      const response = await $fetch<{ resumes: ResumeListItem[] }>("/api/resume");
      resumes.value = response.resumes;
    } finally {
      loading.value = false;
    }
  }

  return {
    resumes,
    loading,
    fetchResumes,
  };
});
