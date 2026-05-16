export const dynamic = "force-dynamic";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { RemoteDashboardClient } from "./RemoteDashboardClient";

export default async function RemoteBoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.orgId) redirect("/dashboard");

  const { boardId } = await params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, organizationId: user.orgId },
    select: {
      id: true,
      deviceName: true,
      lastSeenAt: true,
      statusJson: true,
      firmwareVersion: true,
      staIp: true,
      freeHeap: true,
      freePsram: true,
    },
  });

  if (!board) notFound();

  // Tell the board to start pushing status immediately.
  await prisma.boardCommand.create({
    data: {
      boardId: board.id,
      type: "remoteUi.start",
      payloadJson: "{}",
      status: "queued",
      createdByUserId: user.id,
    },
  });

  const now = Date.now();
  const lastSeenMs = board.lastSeenAt ? now - board.lastSeenAt.getTime() : null;
  const online = lastSeenMs !== null && lastSeenMs < 30_000;

  const recentLogs = await prisma.boardLog.findMany({
    where: { boardId: board.id },
    orderBy: { timestamp: "desc" },
    take: 30,
    select: { id: true, level: true, source: true, message: true, timestamp: true },
  });

  return (
    <RemoteDashboardClient
      boardId={boardId}
      deviceName={board.deviceName}
      initialStatus={JSON.parse(board.statusJson)}
      initialOnline={online}
      initialLogs={recentLogs.map((l) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
      }))}
    />
  );
}
