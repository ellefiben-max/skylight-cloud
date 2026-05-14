import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { ok } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const boards = await prisma.board.findMany({
    where: { organizationId: user.orgId! },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      boardId: true,
      deviceName: true,
      model: true,
      firmwareVersion: true,
      lastSeenAt: true,
      claimedAt: true,
      staIp: true,
      statusJson: true,
      groups: {
        select: {
          boardGroup: { select: { id: true, name: true } },
        },
      },
    },
  });

  const now = Date.now();
  const result = boards.map((b) => ({
    ...b,
    online: b.lastSeenAt ? now - b.lastSeenAt.getTime() < 30_000 : false,
    groups: b.groups.map((g) => g.boardGroup),
  }));

  return ok(result);
}
