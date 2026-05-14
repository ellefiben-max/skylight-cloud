import { describe, it, expect } from "vitest";
import { sha256hex, randomToken, randomOtp, timingSafeEqual } from "@/lib/crypto";

describe("sha256hex", () => {
  it("produces consistent 64-char hex", () => {
    const h = sha256hex("hello");
    expect(h).toHaveLength(64);
    expect(h).toBe(sha256hex("hello"));
  });

  it("is sensitive to input", () => {
    expect(sha256hex("hello")).not.toBe(sha256hex("hello2"));
  });
});

describe("randomToken", () => {
  it("produces 64-char hex by default (32 bytes)", () => {
    expect(randomToken()).toHaveLength(64);
  });

  it("is unpredictable", () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("randomOtp", () => {
  it("produces 6 digits", () => {
    const otp = randomOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });
});

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(timingSafeEqual("abc", "xyz")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});
