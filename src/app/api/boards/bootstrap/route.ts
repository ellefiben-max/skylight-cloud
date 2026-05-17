import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { ok, err } from "@/lib/api-response";
import { getClientIp } from "@/lib/device-auth";
import { getMqttDeviceConfig, ensureMqttStarted } from "@/lib/mqtt";

export const dynamic = "force-dynamic";

// Temporary high ceiling while physical boards stabilize cloud activation.
// User-facing auth/account routes keep their stricter limits.
const BOOTSTRAP_RATE_LIMIT = 5000;

const Schema = z.object({
  eventType: z.string().optional(),
  boardId: z.string().min(1).max(128),
  boardSecret: z.string().min(8).max(256),
  firmwareVersion: z.string().max(64).optional(),
  model: z.string().max(64).optional(),
  deviceName: z.string().max(128).optional(),
  groupName: z.string().max(128).optional(),
  pairingCode: z.string().max(64).optional(),
  claimed: z.boolean().optional(),
  staIp: z.string().max(64).optional(),
  apSsid: z.string().max(64).optional(),
  freeHeap: z.number().int().optional(),
  freePsram: z.number().int().optional(),
});

type BoardBootstrapFallback = {
  pairingCodeHash: string;
  pairingExpiresAt: Date | null;
  firmwareVersion: string;
  model: string;
  deviceName: string;
  staIp: string;
  apSsid: string;
  freeHeap: number;
  freePsram: number;
};

function boardUpdateData(
  d: z.infer<typeof Schema>,
  boardSecretHash: string,
  pairingCodeHash: string,
  fallback: BoardBootstrapFallback,
  pairingCodePresent: boolean
) {
  return {
    boardSecretHash,
    pairingCodeHash: pairingCodePresent ? pairingCodeHash : fallback.pairingCodeHash,
    pairingExpiresAt: pairingCodePresent ? null : fallback.pairingExpiresAt,
    firmwareVersion: d.firmwareVersion ?? fallback.firmwareVersion,
    model: d.model ?? fallback.model,
    deviceName: d.deviceName ?? fallback.deviceName,
    staIp: d.staIp ?? fallback.staIp,
    apSsid: d.apSsid ?? fallback.apSsid,
    freeHeap: d.freeHeap ?? fallback.freeHeap,
    freePsram: d.freePsram ?? fallback.freePsram,
    lastSeenAt: new Date(),
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid bootstrap payload", 422);

  const d = parsed.data;
  const ip = getClientIp(req);
  const rl = rateLimit(`bootstrap:${d.boardId}:${ip}`, BOOTSTRAP_RATE_LIMIT, 60_000);
  if (!rl.allowed) {
    console.warn("[BOARD_BOOTSTRAP] Rate limited", { boardId: d.boardId, ip });
    return err("Rate limited", 429);
  }

  const mqtt = getMqttDeviceConfig();
  if (mqtt.enabled) void ensureMqttStarted();

  const boardSecretHash = sha256hex(d.boardSecret);
  const pairingCode = d.pairingCode?.trim().toUpperCase();
  const pairingCodeHash = pairingCode ? sha256hex(pairingCode) : "";

  const existing = await prisma.board.findUnique({ where: { boardId: d.boardId } });

  if (existing) {
    const canRepairUnclaimedSecret =
      !existing.organizationId &&
      !!pairingCode &&
      existing.pairingCodeHash === pairingCodeHash;

    if (existing.boardSecretHash && existing.boardSecretHash !== boardSecretHash) {
      if (canRepairUnclaimedSecret) {
        console.warn("[BOARD_BOOTSTRAP] Repaired unclaimed board secret", {
          boardId: d.boardId,
          lastSeenAt: existing.lastSeenAt?.toISOString() ?? null,
        });
      } else {
        console.warn("[BOARD_BOOTSTRAP] Invalid board secret", {
          boardId: d.boardId,
          claimed: !!existing.claimedAt,
          hasOrg: !!existing.organizationId,
          lastSeenAt: existing.lastSeenAt?.toISOString() ?? null,
        });
        return err("Invalid board secret", 401);
      }
    }

    await prisma.board.update({
      where: { boardId: d.boardId },
      data: boardUpdateData(d, boardSecretHash, pairingCodeHash, existing, !!pairingCode),
    });

    console.info("[BOARD_BOOTSTRAP] Updated board", {
      boardId: d.boardId,
      claimed: !!existing.organizationId,
      pairingCodePresent: !!pairingCode,
    });

    return ok({ claimed: !!existing.organizationId, boardId: d.boardId, mqtt });
  }

  if (pairingCode) {
    const staleUnclaimedBoard = await prisma.board.findFirst({
      where: {
        pairingCodeHash,
        organizationId: null,
      },
      orderBy: { lastSeenAt: "desc" },
    });

    if (staleUnclaimedBoard) {
      await prisma.board.update({
        where: { id: staleUnclaimedBoard.id },
        data: {
          boardId: d.boardId,
          ...boardUpdateData(d, boardSecretHash, pairingCodeHash, staleUnclaimedBoard, true),
        },
      });

      console.warn("[BOARD_BOOTSTRAP] Repaired unclaimed board identity", {
        oldBoardId: staleUnclaimedBoard.boardId,
        boardId: d.boardId,
      });

      return ok({ claimed: false, boardId: d.boardId, mqtt });
    }
  }

  // New board — create unclaimed record
  await prisma.board.create({
    data: {
      boardId: d.boardId,
      boardSecretHash,
      pairingCodeHash,
      pairingExpiresAt: null,
      firmwareVersion: d.firmwareVersion ?? "unknown",
      model: d.model ?? "waveshare-main",
      deviceName: d.deviceName ?? "Skylight 100",
      staIp: d.staIp ?? "",
      apSsid: d.apSsid ?? "",
      freeHeap: d.freeHeap ?? 0,
      freePsram: d.freePsram ?? 0,
      lastSeenAt: new Date(),
    },
  });

  console.info("[BOARD_BOOTSTRAP] Created board", {
    boardId: d.boardId,
    pairingCodePresent: !!pairingCode,
  });

  return ok({ claimed: false, boardId: d.boardId, mqtt }, 201);
}
