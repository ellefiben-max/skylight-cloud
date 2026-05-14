export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function BoardsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.orgId) redirect("/dashboard");

  const boards = await prisma.board.findMany({
    where: { organizationId: user.orgId },
    orderBy: { deviceName: "asc" },
    select: {
      id: true,
      boardId: true,
      deviceName: true,
      model: true,
      firmwareVersion: true,
      lastSeenAt: true,
      claimedAt: true,
      groups: { select: { boardGroup: { select: { name: true } } } },
    },
  });

  const now = Date.now();

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Boards</h1>
        <Link href="/boards/new" className="btn btn-primary">
          + Add board
        </Link>
      </div>

      {boards.length === 0 ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          No boards yet.{" "}
          <Link href="/boards/new" style={{ color: "var(--color-primary)" }}>
            Add your first board
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {boards.map((b) => {
            const lastMs = b.lastSeenAt ? now - b.lastSeenAt.getTime() : null;
            const online = lastMs !== null && lastMs < 30_000;
            const stale = lastMs !== null && lastMs >= 30_000 && lastMs < 120_000;
            const state = online ? "live" : stale ? "stale" : "dead";
            return (
              <div key={b.id} className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <span className={`live-dot ${state}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "1rem" }}>{b.deviceName}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                    {b.model} · FW {b.firmwareVersion}
                    {b.groups.length > 0 && ` · ${b.groups.map((g) => g.boardGroup.name).join(", ")}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <Link href={`/boards/${b.id}/remote`} className="btn btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 0.875rem" }}>
                    Open UI
                  </Link>
                  <Link href={`/boards/${b.id}`} className="btn btn-ghost" style={{ fontSize: "0.875rem", padding: "0.5rem 0.875rem" }}>
                    Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
