import { expect, type Page } from "@playwright/test";

/** Demo accounts created by scripts/seed-demo-users.mjs. */
export const DEMO = {
  owner: "owner@goodson-demo.example",
  staff: "pharmacist@goodson-demo.example",
  doctor: "doctor@goodson-demo.example",
  margaret: "margaret@goodson-demo.example",
  daniel: "daniel@goodson-demo.example",
} as const;

export function demoPassword(): string {
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password) throw new Error("Set DEMO_USER_PASSWORD (run tests with: npm run test:e2e)");
  return password;
}

/** Sign in with the email + password fallback form. */
export async function signInWithPassword(page: Page, email: string, password = demoPassword()) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * Give the browser a virtual passkey device (Chrome DevTools Protocol).
 * It behaves like Touch ID that always succeeds — real Touch ID cannot be
 * automated, so it is checked by hand (see docs/testing.md).
 */
export async function addVirtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}
