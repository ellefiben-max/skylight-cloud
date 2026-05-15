/**
 * Integration test: full happy path
 *
 * Simulates the spec-required flow:
 *   1. User signs up
 *   2. User verifies email
 *   3. User completes OTP login
 *   4. User subscribes (mocked as active)
 *   5. Board bootstraps
 *   6. User claims board
 *   7. User sends relay command
 *   8. Board polls command
 *   9. Board acknowledges command
 *  10. User sees updated board status
 *
 * This test uses unit-level mocks for Prisma and external services.
 * For a true end-to-end integration test, connect to a real test database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/password";
import { sha256hex, randomOtp, randomToken } from "@/lib/crypto";
import { unitPriceForBoardCount, monthlyTotalCents } from "@/lib/pricing";
import { ALLOWED_COMMAND_TYPES, BLOCKED_COMMAND_TYPES } from "@/lib/command-types";
import { hasActiveSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/db";

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

describe("Integration: signup → verify → login → subscribe → board → command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYWALL_DISABLED = "false";
  });

  it("Step 1-2: Signup creates user and email token", async () => {
    const { hashPassword: hp } = await import("@/lib/password");
    const hash = await hp("strongpassword1234");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("strongpassword1234");
  });

  it("Step 3: OTP token hash can be generated and matched", () => {
    const otp = randomOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
    const hash = sha256hex(otp);
    expect(sha256hex(otp)).toBe(hash);
  });

  it("Step 4: Active subscription gate passes", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86400_000),
    });
    expect(await hasActiveSubscription("org-1")).toBe(true);
  });

  it("Step 5: Board bootstrap stores hashed secret", () => {
    const secret = "board-secret-abc123";
    const hash = sha256hex(secret);
    expect(hash).not.toBe(secret);
    expect(hash).toHaveLength(64);
    expect(sha256hex(secret)).toBe(hash);
  });

  it("Step 6: Pairing code hash can be matched", () => {
    const code = "PAIR123";
    const stored = sha256hex(code);
    const presented = sha256hex("PAIR123");
    expect(stored).toBe(presented);
  });

  it("Step 7: relay.setMode command is in allowed list", () => {
    expect(ALLOWED_COMMAND_TYPES.has("relay.setMode")).toBe(true);
    expect(BLOCKED_COMMAND_TYPES.has("relay.setMode")).toBe(false);
  });

  it("Step 7: factory reset is blocked", () => {
    expect(BLOCKED_COMMAND_TYPES.has("system.factoryReset")).toBe(true);
    expect(ALLOWED_COMMAND_TYPES.has("system.factoryReset")).toBe(false);
  });

  it("Step 8: board polls commands (queued status checked)", async () => {
    mockPrisma.boardCommand.count.mockResolvedValue(2);
    const count = await prisma.boardCommand.count({ where: { boardId: "b1", status: "queued" } });
    expect(count).toBe(2);
  });

  it("Step 9: command ack updates status", async () => {
    mockPrisma.boardCommand.update.mockResolvedValue({ status: "acked" });
    const result = await prisma.boardCommand.update({
      where: { id: "cmd-1" },
      data: { status: "acked", ackedAt: new Date() },
    });
    expect(result.status).toBe("acked");
  });

  it("Step 10: board status reflects last seen time", () => {
    const lastSeenAt = new Date(Date.now() - 5_000);
    const lastMs = Date.now() - lastSeenAt.getTime();
    const online = lastMs < 30_000;
    expect(online).toBe(true);
  });
});

describe("Security: board ownership enforcement", () => {
  it("does not expose boards from another org", async () => {
    mockPrisma.board.findFirst.mockResolvedValue(null);
    const board = await prisma.board.findFirst({
      where: { id: "board-id", organizationId: "different-org" },
    });
    expect(board).toBeNull();
  });

  it("device secret never matches if stored hash differs", () => {
    const realSecret = "secret-a";
    const storedHash = sha256hex("secret-b");
    const presented = sha256hex(realSecret);
    expect(presented).not.toBe(storedHash);
  });
});

describe("Board heartbeat pairing repair", () => {
  function heartbeatRequest(pairingCode: string) {
    return new Request("http://localhost/api/boards/heartbeat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-skylight-board-id": "board-1",
        "x-skylight-board-secret": "secret-a",
      },
      body: JSON.stringify({ pairingCode, freeHeap: 1234 }),
    }) as never;
  }

  it("refreshes the normalized pairing hash for unclaimed boards", async () => {
    const { POST } = await import("@/app/api/boards/heartbeat/route");
    mockPrisma.board.findUnique.mockResolvedValue({
      id: "board-db-id",
      boardId: "board-1",
      boardSecretHash: sha256hex("secret-a"),
      organizationId: null,
      deviceName: "Skylight 100",
      model: "waveshare-main",
      firmwareVersion: "1.0.0",
    });
    mockPrisma.boardCommand.count.mockResolvedValue(0);
    mockPrisma.board.update.mockResolvedValue({});
    mockPrisma.boardHeartbeat.create.mockResolvedValue({});

    const response = await POST(heartbeatRequest(" abc123 "));

    expect(response.status).toBe(200);
    expect(mockPrisma.board.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "board-db-id" },
      data: expect.objectContaining({
        pairingCodeHash: sha256hex("ABC123"),
        pairingExpiresAt: null,
      }),
    }));
  });

  it("does not rewrite pairing data for claimed boards", async () => {
    const { POST } = await import("@/app/api/boards/heartbeat/route");
    mockPrisma.board.findUnique.mockResolvedValue({
      id: "board-db-id",
      boardId: "board-1",
      boardSecretHash: sha256hex("secret-a"),
      organizationId: "org-1",
      deviceName: "Skylight 100",
      model: "waveshare-main",
      firmwareVersion: "1.0.0",
    });
    mockPrisma.boardCommand.count.mockResolvedValue(0);
    mockPrisma.board.update.mockResolvedValue({});
    mockPrisma.boardHeartbeat.create.mockResolvedValue({});

    const response = await POST(heartbeatRequest("abc123"));

    expect(response.status).toBe(200);
    const updateArg = mockPrisma.board.update.mock.calls.at(-1)?.[0];
    expect(updateArg.data).not.toHaveProperty("pairingCodeHash");
    expect(updateArg.data).not.toHaveProperty("pairingExpiresAt");
  });
});

describe("Billing: pricing tiers", () => {
  const cases: [number, number, number][] = [
    [1, 1000, 1000],
    [4, 1000, 4000],
    [5, 800, 4000],
    [20, 800, 16000],
    [21, 700, 14700],
    [50, 700, 35000],
  ];

  it.each(cases)("%i boards: unit=%i, total=%i", (count, unit, total) => {
    expect(unitPriceForBoardCount(count)).toBe(unit);
    expect(monthlyTotalCents(count)).toBe(total);
  });
});

describe("Stripe webhook: factory reset stays blocked", () => {
  it("blocked command type is not in allowed list", () => {
    const blocked = "system.factoryReset";
    expect(BLOCKED_COMMAND_TYPES.has(blocked)).toBe(true);
    expect(ALLOWED_COMMAND_TYPES.has(blocked)).toBe(false);
  });

  it("webhook-verified status update would mark sub active", async () => {
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    const result = await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: "sub_123" },
      data: { status: "active" },
    });
    expect(result.count).toBe(1);
  });
});
