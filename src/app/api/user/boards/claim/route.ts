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

  const { deviceName, groupName } = parsed.data;
  const pairingCode = parsed.data.pairingCode.trim().toUpperCase();
  const pairingCodeHash = sha256hex(pairingCode);

  const board = await prisma.board.findFirst({
    where: {
      pairingCodeHash,
      OR: [
        { organizationId: null },
        { organizationId: user.orgId },
      ],
    },
    orderBy: { lastSeenAt: "desc" },
  });

  if (!board) {
    const anyMatches = await prisma.board.findMany({
      where: { pairingCodeHash },
      orderBy: { lastSeenAt: "desc" },
      take: 3,
      select: {
        boardId: true,
        organizationId: true,
        claimedAt: true,
        lastSeenAt: true,
        updatedAt: true,
      },
    });
    console.warn("[BOARD_CLAIM] Pairing code not claimable", {
      requestedOrgId: user.orgId,
      matches: anyMatches.map((match) => ({
        boardId: match.boardId,
        orgMatches: match.organizationId === user.orgId,
        claimed: !!match.claimedAt,
        hasOrg: !!match.organizationId,
        lastSeenAt: match.lastSeenAt?.toISOString() ?? null,
        updatedAt: match.updatedAt.toISOString(),
      })),
    });
    return err("Invalid or expired pairing code.", 404);
  }

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
