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

  const now = Date.now();
  const lastSeenMs = board.lastSeenAt ? now - board.lastSeenAt.getTime() : null;
  const online = lastSeenMs !== null && lastSeenMs < 30_000;
  const stale = lastSeenMs !== null && lastSeenMs >= 30_000 && lastSeenMs < 120_000;

  return ok({
    ...board,
    status: JSON.parse(board.statusJson),
    online,
    stale,
    connectionState: online ? "live" : stale ? "stale" : "offline",
  });
}
