export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function GroupsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.orgId) redirect("/dashboard");

  const groups = await prisma.boardGroup.findMany({
    where: { organizationId: user.orgId },
    include: {
      memberships: {
        include: { board: { select: { id: true, deviceName: true, lastSeenAt: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = Date.now();

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Groups</h1>
      </div>

      {groups.length === 0 ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          No groups yet. Assign a group when{" "}
          <Link href="/boards/new" style={{ color: "var(--color-primary)" }}>
            adding a board
          </Link>
          .
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {groups.map((g) => (
            <div key={g.id} className="panel" style={{ padding: "1.25rem" }}>
              <h2 style={{ fontWeight: 600, fontSize: "1.0625rem", marginBottom: "0.75rem" }}>
                {g.name}
                <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                  {g.memberships.length} board{g.memberships.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <div style={{ display: "grid", gap: "0.4rem" }}>
                {g.memberships.map((m) => {
                  const lastMs = m.board.lastSeenAt ? now - m.board.lastSeenAt.getTime() : null;
                  const online = lastMs !== null && lastMs < 30_000;
                  return (
                    <Link
                      key={m.board.id}
                      href={`/boards/${m.board.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        background: "var(--color-surface-offset)",
                        textDecoration: "none",
                        color: "var(--color-text)",
                      }}
                    >
                      <span className={`live-dot ${online ? "live" : "dead"}`} />
                      {m.board.deviceName}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
