import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";
import { requireAuth, requireSubscription } from "@/lib/require-auth";
import { ok, err } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  pairingCode: z.string().min(4).max(64),
  deviceName: z.string().max(128).optional(),
  groupName: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const subErr = await requireSubscription(user.orgId!);
  if (subErr) return subErr;

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid claim request", 422);

  const { pairingCode, deviceName, groupName } = parsed.data;
  const pairingCodeHash = sha256hex(pairingCode);

  const board = await prisma.board.findFirst({
    where: { pairingCodeHash, pairingExpiresAt: { gt: new Date() } },
  });

  if (!board) return err("Invalid or expired pairing code.", 404);

  if (board.organizationId && board.organizationId !== user.orgId) {
    return err("Board is already claimed by another organization.", 409);
  }

  const updatedBoard = await prisma.board.update({
    where: { id: board.id },
    data: {
      organizationId: user.orgId,
      claimedAt: board.claimedAt ?? new Date(),
      pairingExpiresAt: null,
      deviceName: deviceName ?? board.deviceName,
    },
  });

  if (groupName) {
    const group = await prisma.boardGroup.upsert({
      where: { organizationId_name: { organizationId: user.orgId!, name: groupName } },
      create: { organizationId: user.orgId!, name: groupName },
      update: {},
    });
    await prisma.boardGroupMembership.upsert({
      where: { boardId_boardGroupId: { boardId: board.id, boardGroupId: group.id } },
      create: { boardId: board.id, boardGroupId: group.id },
      update: {},
    });
  }

  await logAuditEvent({
    organizationId: user.orgId!,
    userId: user.id,
    boardId: board.id,
    eventType: "board.claimed",
    ipAddress: getClientIp(req),
  });

  return ok({ boardId: updatedBoard.boardId, id: updatedBoard.id });
}
