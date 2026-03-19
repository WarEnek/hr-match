<script setup lang="ts">
const auth = useAuthStore()

if (!auth.initialized) {
  await auth.fetchSession()
}

if (auth.user) {
  await navigateTo('/dashboard')
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div class="panel">
    <h1>Redirecting...</h1>
  </div>
</template>
