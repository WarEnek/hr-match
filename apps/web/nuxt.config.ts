export default defineNuxtConfig({
  compatibilityDate: "2025-03-19",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt"],
  imports: {
    dirs: ["stores"],
  },
  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || "",
    encryptionKey: process.env.ENCRYPTION_KEY || "",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    novitaApiKey: process.env.NOVITA_API_KEY || "",
    novitaBaseUrl: process.env.NOVITA_BASE_URL || "https://api.novita.ai/openai",
    novitaModel: process.env.NOVITA_MODEL || "google/gemma-3-12b-it",
    novitaAllowedHosts: process.env.NOVITA_ALLOWED_HOSTS || "api.novita.ai",
    allowInsecureHttpLlm: process.env.ALLOW_INSECURE_LLM_HTTP === "true",
    pdfStorageBucket: process.env.PDF_STORAGE_BUCKET || "resumes",
    pdfBasePath: process.env.PDF_BASE_PATH || "exports",
    internalWorkerToken: process.env.INTERNAL_WORKER_TOKEN || "",
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000",
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
      novitaBaseUrl: process.env.NOVITA_BASE_URL || "https://api.novita.ai/openai",
      novitaModel: process.env.NOVITA_MODEL || "google/gemma-3-12b-it",
    },
  },
  nitro: {
    routeRules: {
      "/api/health": { cache: { maxAge: 30 } },
    },
  },
});
