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
    <div style={{ display: "grid", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Boards</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.9375rem" }}>
            {boards.length} board{boards.length !== 1 ? "s" : ""} claimed
          </p>
        </div>
        <Link href="/boards/new" className="btn btn-primary">+ Add board</Link>
      </div>

      {boards.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📡</div>
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No boards yet</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
            Add your first Skylight board to start controlling it remotely.
          </p>
          <Link href="/boards/new" className="btn btn-primary">Add your first board</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {boards.map((b) => {
            const lastMs = b.lastSeenAt ? now - b.lastSeenAt.getTime() : null;
            const online = lastMs !== null && lastMs < 30_000;
            const stale = lastMs !== null && lastMs >= 30_000 && lastMs < 120_000;
            const connState = online ? "live" : stale ? "stale" : "dead";
            const groups = b.groups.map((g) => g.boardGroup.name);
            return (
              <div key={b.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <span className={`live-dot ${connState}`} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "1rem" }}>{b.deviceName}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                    {b.model} · FW {b.firmwareVersion}
                    {groups.length > 0 && (
                      <> · <span style={{ color: "var(--color-primary)" }}>{groups.join(", ")}</span></>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <Link href={`/boards/${b.id}/remote`} className="btn btn-primary btn-sm">Open UI</Link>
                  <Link href={`/boards/${b.id}`} className="btn btn-ghost btn-sm">Details</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
