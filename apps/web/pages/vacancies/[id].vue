<script setup lang="ts">
import type { MatchAnalysis, VacancyParseResult } from "~/types";

import { computed, ref } from "vue";

import { navigateTo, useFetch, useRoute } from "#imports";

import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const auth = useAuthStore();

if (!auth.initialized) {
  await auth.fetchSession();
}

if (!auth.user) {
  await navigateTo("/login");
}

const vacancyId = route.params.id as string;
const { data, refresh } = await useFetch<{
  vacancy: {
    title: string | null;
    company: string | null;
    raw_text: string;
    parsed_json: VacancyParseResult | null;
  };
  requirements: Array<{ id: string }>;
}>(`/api/vacancies/${vacancyId}`);
const parsing = ref(false);
const matching = ref(false);
const generating = ref(false);
const notice = ref("");
const analysis = ref<MatchAnalysis | null>(null);

async function parseVacancy() {
  parsing.value = true;
  notice.value = "";

  try {
    await $fetch(`/api/vacancies/${vacancyId}/parse`, { method: "POST" });
    await refresh();
    notice.value = "Vacancy parsed successfully.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Parse failed.";
  } finally {
    parsing.value = false;
  }
}

async function runMatch() {
  matching.value = true;
  notice.value = "";

  try {
    const response = await $fetch<{ analysis: MatchAnalysis }>(`/api/match/${vacancyId}`, {
      method: "POST",
    });
    analysis.value = response.analysis;
    notice.value = "Match analysis updated.";
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Matching failed.";
  } finally {
    matching.value = false;
  }
}

async function generateResume() {
  generating.value = true;
  notice.value = "";

  try {
    const response = await $fetch<{ resume: { id: string } }>("/api/resume/generate", {
      method: "POST",
      body: { vacancyId },
    });

    await navigateTo(`/resumes/${response.resume.id}`);
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Resume generation failed.";
  } finally {
    generating.value = false;
  }
}

const parsed = computed(() => data.value?.vacancy?.parsed_json as VacancyParseResult | null);
</script>

<template>
  <div class="stack">
    <section class="panel">
      <h1>{{ data?.vacancy?.title || "Untitled vacancy" }}</h1>
      <p class="panel-subtitle">{{ data?.vacancy?.company || "Unknown company" }}</p>
      <div class="actions">
        <button class="button" :disabled="parsing" @click="parseVacancy">
          {{ parsing ? "Parsing..." : "Parse vacancy" }}
        </button>
        <button class="button-secondary" :disabled="matching" @click="runMatch">
          {{ matching ? "Matching..." : "Run match" }}
        </button>
        <button class="button-secondary" :disabled="generating" @click="generateResume">
          {{ generating ? "Generating..." : "Generate resume" }}
        </button>
      </div>
      <p v-if="notice" class="hint" style="margin-top: 0.75rem">{{ notice }}</p>
    </section>

    <section class="two-column">
      <div class="panel">
        <h2>Raw text</h2>
        <pre style="white-space: pre-wrap; font-family: inherit">{{ data?.vacancy?.raw_text }}</pre>
      </div>

      <div class="panel">
        <h2>Parsed vacancy</h2>
        <template v-if="parsed">
          <div class="pill-row">
            <span class="pill" v-for="item in parsed.must_have" :key="`must-${item}`">{{
              item
            }}</span>
            <span class="pill" v-for="item in parsed.nice_to_have" :key="`nice-${item}`">{{
              item
            }}</span>
          </div>
          <ul>
            <li><strong>Seniority:</strong> {{ parsed.seniority || "n/a" }}</li>
            <li><strong>Domain:</strong> {{ parsed.domain.join(", ") || "n/a" }}</li>
            <li><strong>Responsibilities:</strong> {{ parsed.responsibilities.length }}</li>
            <li><strong>Soft signals:</strong> {{ parsed.soft_signals.length }}</li>
          </ul>
        </template>
        <p v-else class="muted">Vacancy has not been parsed yet.</p>
      </div>
    </section>

    <section v-if="analysis" class="panel">
      <h2>Match analysis</h2>
      <div class="metrics-grid">
        <SharedMetricCard label="Overall score" :value="analysis.overall_score" />
        <SharedMetricCard label="Must-have coverage" :value="analysis.must_have_coverage" />
        <SharedMetricCard label="Semantic similarity" :value="analysis.semantic_similarity" />
        <SharedMetricCard label="Keyword coverage" :value="analysis.keyword_coverage" />
        <SharedMetricCard label="Evidence strength" :value="analysis.evidence_strength" />
        <SharedMetricCard label="Domain fit" :value="analysis.domain_seniority_fit" />
      </div>
    </section>
  </div>
</template>
