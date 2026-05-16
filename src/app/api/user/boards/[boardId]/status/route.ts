import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { boardId } = await params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, organizationId: auth.user.orgId! },
    select: {
      id: true,
      boardId: true,
      deviceName: true,
      model: true,
      firmwareVersion: true,
      lastSeenAt: true,
      staIp: true,
      freeHeap: true,
      freePsram: true,
      statusJson: true,
      claimedAt: true,
    },
  });

  if (!board) return err("Board not found", 404);

  const recentLogs = await prisma.boardLog.findMany({
    where: { boardId: board.id },
    orderBy: { timestamp: "desc" },
    take: 30,
    select: { id: true, level: true, source: true, message: true, timestamp: true },
  });

  const now = Date.now();
  const lastSeenMs = board.lastSeenAt ? now - board.lastSeenAt.getTime() : null;
  const online = lastSeenMs !== null && lastSeenMs < 30_000;
  const stale = lastSeenMs !== null && lastSeenMs >= 30_000 && lastSeenMs < 120_000;

  return ok({
    ...board,
    status: JSON.parse(board.statusJson),
    recentLogs,
    online,
    stale,
    connectionState: online ? "live" : stale ? "stale" : "offline",
  });
}
