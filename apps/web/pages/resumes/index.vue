<script setup lang="ts">
const auth = useAuthStore()

if (!auth.initialized) {
  await auth.fetchSession()
}

if (!auth.user) {
  await navigateTo('/login')
}

const { data } = await useFetch('/api/resume')
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>Resume generations</h1>
    </section>
    <section class="panel">
      <ul v-if="data?.resumes?.length" class="unstyled-list">
        <li v-for="resume in data.resumes" :key="resume.id">
          <NuxtLink :to="`/resumes/${resume.id}`">
            <strong>{{ resume.title }}</strong>
            <p class="muted">Score: {{ resume.score ?? 'n/a' }}</p>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="muted">No generated resumes yet.</p>
    </section>
  </div>
</template>
