import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function BoardDetailPage({
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
    include: {
      groups: { include: { boardGroup: true } },
      commands: {
        where: { status: { in: ["queued", "delivered"] } },
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!board) notFound();

  const now = Date.now();
  const lastMs = board.lastSeenAt ? now - board.lastSeenAt.getTime() : null;
  const online = lastMs !== null && lastMs < 30_000;
  const stale = lastMs !== null && lastMs >= 30_000 && lastMs < 120_000;
  const connState = online ? "live" : stale ? "stale" : "dead";

  const recentLogs = await prisma.boardLog.findMany({
    where: { boardId: board.id },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/boards" style={{ color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.875rem" }}>
          ← Boards
        </Link>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={`live-dot ${connState}`} />
          <h1 style={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.04em" }}>
            {board.deviceName}
          </h1>
        </div>
        <Link href={`/boards/${board.id}/remote`} className="btn btn-primary">
          Open Remote UI
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <Stat label="Status" value={connState === "live" ? "Online" : connState === "stale" ? "Stale" : "Offline"} />
        <Stat label="Model" value={board.model} />
        <Stat label="Firmware" value={board.firmwareVersion} />
        <Stat label="Last seen" value={board.lastSeenAt ? `${Math.round((now - board.lastSeenAt.getTime()) / 1000)}s ago` : "Never"} />
        <Stat label="IP address" value={board.staIp || "—"} />
        <Stat label="Group" value={board.groups.map((g) => g.boardGroup.name).join(", ") || "None"} />
        <Stat label="Free heap" value={board.freeHeap ? `${(board.freeHeap / 1024).toFixed(0)} KB` : "—"} />
        <Stat label="Board ID" value={board.boardId} mono />
      </div>

      {board.commands.length > 0 && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem" }}>Pending Commands</h2>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {board.commands.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--color-surface-offset)", borderRadius: "8px", fontSize: "0.875rem" }}>
                <span style={{ fontWeight: 600 }}>{c.type}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{c.status}</span>
                <span style={{ marginLeft: "auto", color: "var(--color-text-faint)" }}>
                  {c.createdAt.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem" }}>Recent Logs</h2>
        {recentLogs.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>No logs yet.</p>
        ) : (
          <div style={{ fontFamily: "monospace", fontSize: "0.8125rem", display: "grid", gap: "2px" }}>
            {recentLogs.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto auto 1fr",
                  gap: "0.625rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  background: l.level === "error" ? "color-mix(in oklab, var(--color-error) 8%, transparent)" : "transparent",
                }}
              >
                <span style={{ color: "var(--color-text-faint)" }}>
                  {l.timestamp.toLocaleTimeString()}
                </span>
                <span style={{
                  color: l.level === "error" ? "var(--color-error)" : l.level === "warn" ? "var(--color-warning)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                }}>
                  {l.level}
                </span>
                <span style={{ wordBreak: "break-all" }}>{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="panel" style={{ padding: "1rem" }}>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, fontFamily: mono ? "monospace" : undefined, fontSize: mono ? "0.875rem" : undefined, wordBreak: "break-all" }}>
        {value}
      </div>
    </div>
  );
}
