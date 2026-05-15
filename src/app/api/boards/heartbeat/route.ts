import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { sha256hex } from "@/lib/crypto";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const Schema = z.object({
  freeHeap: z.number().int().optional(),
  freePsram: z.number().int().optional(),
  staIp: z.string().max(64).optional(),
  pairingCode: z.string().max(64).optional(),
  statusJson: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const parsed = Schema.safeParse(body);
  const d = parsed.success ? parsed.data : {};

  const pendingCount = await prisma.boardCommand.count({
    where: { boardId: auth.board.id, status: "queued" },
  });

  await prisma.board.update({
    where: { id: auth.board.id },
    data: {
      lastSeenAt: new Date(),
      ...(d.freeHeap !== undefined && { freeHeap: d.freeHeap }),
      ...(d.freePsram !== undefined && { freePsram: d.freePsram }),
      ...(d.staIp !== undefined && { staIp: d.staIp }),
      ...(d.pairingCode && !auth.board.organizationId && {
        pairingCodeHash: sha256hex(d.pairingCode.trim().toUpperCase()),
        pairingExpiresAt: null,
      }),
      ...(d.statusJson !== undefined && { statusJson: JSON.stringify(d.statusJson) }),
    },
  });

  if (d.freeHeap !== undefined || d.staIp !== undefined) {
    await prisma.boardHeartbeat.create({
      data: {
        boardId: auth.board.id,
        freeHeap: d.freeHeap ?? 0,
        freePsram: d.freePsram ?? 0,
        staIp: d.staIp ?? "",
      },
    });
  }

  return ok({
    pendingCommands: pendingCount,
    claimed: !!auth.board.organizationId,
    boardId: auth.board.boardId,
  });
}
