import { describe, it, expect } from "vitest";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test:${Math.random()}`;
    const r = rateLimit(key, 5, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
  });

  it("blocks after the limit is exceeded", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    const r = rateLimit(key, 3, 60_000);
    expect(r.allowed).toBe(false);
  });

  it("respects reset via resetRateLimit", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 3, 60_000);
    resetRateLimit(key);
    const r = rateLimit(key, 3, 60_000);
    expect(r.allowed).toBe(true);
  });

  it("sets lockedUntil when lockMs is provided", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 4; i++) rateLimit(key, 3, 60_000, 5_000);
    const r = rateLimit(key, 3, 60_000, 5_000);
    expect(r.allowed).toBe(false);
    expect(r.lockedUntil).toBeDefined();
    expect(r.lockedUntil!).toBeGreaterThan(Date.now());
  });
});
