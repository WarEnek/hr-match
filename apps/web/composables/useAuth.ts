export function useAuth() {
  const store = useAuthStore();

  return {
    user: computed(() => store.user),
    initialized: computed(() => store.initialized),
    loading: computed(() => store.loading),
    fetchSession: store.fetchSession,
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
  };
}
