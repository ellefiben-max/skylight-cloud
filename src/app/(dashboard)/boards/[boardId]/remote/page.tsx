import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/subscription";

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
    select: { id: true, deviceName: true, lastSeenAt: true },
  });
  if (!board) notFound();

  const active = await hasActiveSubscription(user.orgId);
  const now = Date.now();
  const lastMs = board.lastSeenAt ? now - board.lastSeenAt.getTime() : null;
  const online = lastMs !== null && lastMs < 30_000;

  return (
    <>
      {/* Top bar outside the iframe */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1rem",
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "0.875rem",
        }}
      >
        <Link
          href={`/boards/${boardId}`}
          style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          ← {board.deviceName}
        </Link>

        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className={`live-dot ${online ? "live" : "dead"}`}
          />
          <span style={{ color: "var(--color-text-muted)" }}>
            {online ? "Online" : "Offline"}
          </span>
        </span>

        {!active && (
          <span style={{ color: "var(--color-error)", fontWeight: 600 }}>
            Subscription inactive
          </span>
        )}
      </div>

      {/* Board UI iframe — loads modified app.html via API route */}
      <iframe
        src={`/api/user/boards/${boardId}/ui`}
        style={{
          position: "fixed",
          top: 40,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "calc(100dvh - 40px)",
          border: "none",
          background: "var(--color-bg)",
        }}
        title={`${board.deviceName} Remote UI`}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </>
  );
}
