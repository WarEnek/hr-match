<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  help?: string
}>()
</script>

<template>
  <article class="metric-card">
    <span class="muted">{{ label }}</span>
    <strong>{{ value }}</strong>
    <p v-if="help" class="hint">{{ help }}</p>
  </article>
</template>
