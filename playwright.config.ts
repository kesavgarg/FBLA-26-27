import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run a real browser against the app on localhost:3000,
 * which talks to the LOCAL Supabase stack (never the hosted production data).
 * Start both first:  npx supabase start  &&  npm run dev
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false, // tests share one demo database
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
