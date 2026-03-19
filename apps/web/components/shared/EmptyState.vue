<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="panel">
    <h3>{{ title }}</h3>
    <p class="muted">{{ description }}</p>
  </div>
</template>
