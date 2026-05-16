import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const Schema = z.object({
  remoteSessionId: z.string().min(16).max(96),
  statusJson: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid UI sync payload", 422);

  const { remoteSessionId, statusJson } = parsed.data;
  const session = await prisma.boardRemoteUiSession.findFirst({
    where: {
      id: remoteSessionId,
      boardId: auth.board.id,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) return err("Remote UI session not found or expired", 404);

  const serialized = JSON.stringify(statusJson);
  await prisma.$transaction([
    prisma.boardRemoteUiSession.update({
      where: { id: remoteSessionId },
      data: { statusJson: serialized, lastSyncedAt: new Date() },
    }),
    prisma.board.update({
      where: { id: auth.board.id },
      data: { statusJson: serialized, lastSeenAt: new Date() },
    }),
  ]);

  return ok({ synced: true });
}
