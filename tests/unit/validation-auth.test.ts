import { describe, expect, it } from "vitest";
import { ageOn, registerSchema, signInSchema, toFieldErrors } from "@/lib/validation/auth";

const TODAY = new Date("2026-11-25T12:00:00Z");

const valid = {
  fullName: "Margaret O’Neil-Ellis",
  email: "  Margaret@Example.com ",
  password: "correct horse battery",
  dateOfBirth: "1958-03-14",
  phone: "(770) 555-0123",
  agree: "on",
};

function errorsFor(input: Record<string, string>) {
  const result = registerSchema(TODAY).safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
}

describe("registerSchema — syntactic checks", () => {
  it("accepts a valid registration and normalises email and phone", () => {
    const result = registerSchema(TODAY).safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("margaret@example.com");
      expect(result.data.phone).toBe("770-555-0123");
    }
  });

  it("rejects empty required fields", () => {
    const errors = errorsFor({ ...valid, fullName: "", email: "", password: "", dateOfBirth: "" });
    expect(errors).toMatchObject({ fullName: "required", email: "required", password: "required", dateOfBirth: "required" });
  });

  it("rejects an invalid email", () => {
    expect(errorsFor({ ...valid, email: "margaret@" }).email).toBe("email");
    expect(errorsFor({ ...valid, email: "not an email" }).email).toBe("email");
  });

  it("rejects passwords that are too short or too long", () => {
    expect(errorsFor({ ...valid, password: "short" }).password).toBe("passwordShort");
    expect(errorsFor({ ...valid, password: "x".repeat(73) }).password).toBe("passwordLong");
  });

  it("rejects excessively long names and symbols in names", () => {
    expect(errorsFor({ ...valid, fullName: "A".repeat(81) }).fullName).toBe("nameLong");
    expect(errorsFor({ ...valid, fullName: "Robert'); DROP TABLE profiles;--" }).fullName).toBe("nameChars");
  });

  it("rejects a malformed phone number but allows a blank one", () => {
    expect(errorsFor({ ...valid, phone: "555-01" }).phone).toBe("phone");
    expect(errorsFor({ ...valid, phone: "" }).phone).toBeUndefined();
  });

  it("requires the fictional-data agreement", () => {
    expect(errorsFor({ ...valid, agree: "" }).agree).toBe("agree");
  });
});

describe("registerSchema — semantic checks on dates", () => {
  it("rejects dates that do not exist", () => {
    expect(errorsFor({ ...valid, dateOfBirth: "1990-02-30" }).dateOfBirth).toBe("dobInvalid");
    expect(errorsFor({ ...valid, dateOfBirth: "14/03/1958" }).dateOfBirth).toBe("dobInvalid");
  });

  it("rejects a birth date in the future", () => {
    expect(errorsFor({ ...valid, dateOfBirth: "2030-01-01" }).dateOfBirth).toBe("dobFuture");
  });

  it("rejects account holders under 13 and impossible ages", () => {
    expect(errorsFor({ ...valid, dateOfBirth: "2015-06-01" }).dateOfBirth).toBe("dobTooYoung");
    expect(errorsFor({ ...valid, dateOfBirth: "1890-06-01" }).dateOfBirth).toBe("dobTooOld");
  });
});

describe("ageOn", () => {
  it("counts a birthday only once it has happened this year", () => {
    expect(ageOn(new Date("2013-11-25T00:00:00Z"), TODAY)).toBe(13);
    expect(ageOn(new Date("2013-11-26T00:00:00Z"), TODAY)).toBe(12);
  });
});

describe("signInSchema", () => {
  it("requires both fields", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
  });
});
