import { describe, expect, it } from "vitest";
import { canAccessPath, homePathForRole, safeNextPath } from "@/lib/auth/roles";

describe("canAccessPath — role-based areas", () => {
  it("lets anyone open public pages", () => {
    expect(canAccessPath(null, "/")).toBe(true);
    expect(canAccessPath(null, "/login")).toBe(true);
  });

  it("blocks signed-out visitors from every protected area", () => {
    for (const path of ["/account", "/staff", "/doctor", "/owner"]) {
      expect(canAccessPath(null, path)).toBe(false);
    }
  });

  it("keeps customers out of staff, doctor and owner pages", () => {
    expect(canAccessPath("customer", "/account")).toBe(true);
    expect(canAccessPath("customer", "/staff")).toBe(false);
    expect(canAccessPath("customer", "/staff/inventory")).toBe(false);
    expect(canAccessPath("customer", "/doctor")).toBe(false);
    expect(canAccessPath("customer", "/owner/reports")).toBe(false);
  });

  it("keeps staff out of doctor and owner pages", () => {
    expect(canAccessPath("staff", "/staff")).toBe(true);
    expect(canAccessPath("staff", "/doctor")).toBe(false);
    expect(canAccessPath("staff", "/owner")).toBe(false);
  });

  it("keeps the doctor out of staff and owner pages", () => {
    expect(canAccessPath("doctor", "/doctor/consults")).toBe(true);
    expect(canAccessPath("doctor", "/staff")).toBe(false);
    expect(canAccessPath("doctor", "/owner")).toBe(false);
  });

  it("lets the owner supervise every area", () => {
    for (const path of ["/account", "/staff", "/doctor", "/owner"]) {
      expect(canAccessPath("owner", path)).toBe(true);
    }
  });

  it("does not treat look-alike paths as protected areas", () => {
    // "/staffing" is not "/staff"
    expect(canAccessPath(null, "/staffing")).toBe(true);
  });
});

describe("homePathForRole", () => {
  it("sends each role to its own workspace", () => {
    expect(homePathForRole("customer")).toBe("/account");
    expect(homePathForRole("staff")).toBe("/staff");
    expect(homePathForRole("doctor")).toBe("/doctor");
    expect(homePathForRole("owner")).toBe("/owner");
  });
});

describe("safeNextPath — blocks open redirects", () => {
  it("allows our own paths", () => {
    expect(safeNextPath("/account/orders")).toBe("/account/orders");
  });
  it("rejects other sites and tricks", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
