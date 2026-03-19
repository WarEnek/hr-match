import type { ProfileRecord } from "~/types";

export const useProfileStore = defineStore("profile", () => {
  const profile = ref<ProfileRecord | null>(null);
  const loading = ref(false);

  async function fetchProfile() {
    loading.value = true;

    try {
      const response = await $fetch<{ profile: ProfileRecord | null }>("/api/profile");
      profile.value = response.profile;
    } finally {
      loading.value = false;
    }
  }

  return {
    profile,
    loading,
    fetchProfile,
  };
});
