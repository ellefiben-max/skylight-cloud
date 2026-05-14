import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { ok, err } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { boardId } = await params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, organizationId: auth.user.orgId! },
    select: { id: true },
  });
  if (!board) return err("Board not found", 404);

  const url = req.nextUrl;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const level = url.searchParams.get("level");

  const logs = await prisma.boardLog.findMany({
    where: {
      boardId: board.id,
      ...(level ? { level } : {}),
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    select: {
      id: true,
      timestamp: true,
      source: true,
      level: true,
      message: true,
    },
  });

  return ok(logs);
}
