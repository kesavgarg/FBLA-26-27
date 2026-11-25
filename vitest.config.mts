import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Unit tests cover pure business rules in src/lib (no browser, no database). */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
