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
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Groups</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.9375rem" }}>
          Boards organized into groups for easier management.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🗂️</div>
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No groups yet</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
            Assign a group name when{" "}
            <Link href="/boards/new" style={{ color: "var(--color-primary)" }}>adding a board</Link>.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {groups.map((g) => (
            <div key={g.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                <h2 style={{ fontWeight: 600, fontSize: "1.0625rem", flex: 1 }}>{g.name}</h2>
                <span className="badge badge-teal">{g.memberships.length} board{g.memberships.length !== 1 ? "s" : ""}</span>
              </div>
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
                        fontSize: "0.9375rem",
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
