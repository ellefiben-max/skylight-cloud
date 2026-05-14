import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  // Expire old queued commands (> 10 minutes)
  await prisma.boardCommand.updateMany({
    where: {
      boardId: auth.board.id,
      status: "queued",
      createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
    data: { status: "expired", failedAt: new Date(), failureReason: "expired" },
  });

  const commands = await prisma.boardCommand.findMany({
    where: { boardId: auth.board.id, status: "queued" },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, type: true, payloadJson: true },
  });

  // Mark as delivered
  if (commands.length > 0) {
    const ids = commands.map((c) => c.id);
    await prisma.boardCommand.updateMany({
      where: { id: { in: ids } },
      data: { status: "delivered", deliveredAt: new Date() },
    });
  }

  return ok({
    commands: commands.map((c) => ({
      id: c.id,
      type: c.type,
      payload: JSON.parse(c.payloadJson),
    })),
  });
}
