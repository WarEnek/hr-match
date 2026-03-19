import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "#imports": fileURLToPath(new URL("./tests/mocks/nuxt-imports.ts", import.meta.url)),
      "~": rootDir,
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["server/**/*.ts"],
    },
  },
});
