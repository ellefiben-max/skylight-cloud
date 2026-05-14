import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { ok, err } from "@/lib/api-response";
import { getClientIp } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`bootstrap:${ip}`, 30, 60_000);
  if (!rl.allowed) return err("Rate limited", 429);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid bootstrap payload", 422);

  const d = parsed.data;
  const boardSecretHash = sha256hex(d.boardSecret);
  const pairingCodeHash = d.pairingCode ? sha256hex(d.pairingCode) : "";
  const pairingExpiresAt = d.pairingCode
    ? new Date(Date.now() + 30 * 60 * 1000) // 30-minute pairing window
    : undefined;

  const existing = await prisma.board.findUnique({ where: { boardId: d.boardId } });

  if (existing) {
    // Validate secret before updating
    if (existing.boardSecretHash && existing.boardSecretHash !== boardSecretHash) {
      return err("Invalid board secret", 401);
    }

    await prisma.board.update({
      where: { boardId: d.boardId },
      data: {
        boardSecretHash,
        pairingCodeHash: d.pairingCode ? pairingCodeHash : existing.pairingCodeHash,
        pairingExpiresAt: d.pairingCode ? pairingExpiresAt : existing.pairingExpiresAt,
        firmwareVersion: d.firmwareVersion ?? existing.firmwareVersion,
        model: d.model ?? existing.model,
        deviceName: d.deviceName ?? existing.deviceName,
        staIp: d.staIp ?? existing.staIp,
        apSsid: d.apSsid ?? existing.apSsid,
        freeHeap: d.freeHeap ?? existing.freeHeap,
        freePsram: d.freePsram ?? existing.freePsram,
        lastSeenAt: new Date(),
      },
    });

    return ok({ claimed: !!existing.organizationId, boardId: d.boardId });
  }

  // New board — create unclaimed record
  await prisma.board.create({
    data: {
      boardId: d.boardId,
      boardSecretHash,
      pairingCodeHash,
      pairingExpiresAt,
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

  return ok({ claimed: false, boardId: d.boardId }, 201);
}
