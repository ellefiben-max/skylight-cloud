import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/password";

describe("validatePasswordStrength", () => {
  it("rejects passwords under 12 chars", () => {
    expect(validatePasswordStrength("short")).not.toBeNull();
  });

  it("rejects common passwords", () => {
    expect(validatePasswordStrength("password123456")).not.toBeNull();
  });

  it("accepts a strong password", () => {
    expect(validatePasswordStrength("correcthorsebatterystapledoor")).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies correctly", async () => {
    const hash = await hashPassword("correcthorsebatterystapledoor");
    expect(hash).not.toBe("correcthorsebatterystapledoor");
    expect(await verifyPassword(hash, "correcthorsebatterystapledoor")).toBe(true);
    expect(await verifyPassword(hash, "wrongpassword123456")).toBe(false);
  });
}, 30_000);
