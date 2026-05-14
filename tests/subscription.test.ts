import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasActiveSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/db";

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

describe("hasActiveSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when no subscription exists", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    expect(await hasActiveSubscription("org1")).toBe(false);
  });

  it("returns true for active subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86400_000),
    });
    expect(await hasActiveSubscription("org1")).toBe(true);
  });

  it("returns true for trialing subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() + 86400_000),
    });
    expect(await hasActiveSubscription("org1")).toBe(true);
  });

  it("returns false for canceled subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "canceled",
      currentPeriodEnd: new Date(Date.now() - 86400_000),
    });
    expect(await hasActiveSubscription("org1")).toBe(false);
  });

  it("returns true for past_due within period", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "past_due",
      currentPeriodEnd: new Date(Date.now() + 86400_000),
    });
    expect(await hasActiveSubscription("org1")).toBe(true);
  });

  it("returns false for past_due after period ended", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "past_due",
      currentPeriodEnd: new Date(Date.now() - 86400_000),
    });
    expect(await hasActiveSubscription("org1")).toBe(false);
  });
});
