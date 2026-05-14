export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasActiveSubscription, getBoardCount } from "@/lib/subscription";
import { monthlyTotalCents, unitPriceForBoardCount } from "@/lib/pricing";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) redirect("/verify-email");
  if (!user.orgId) redirect("/signup");

  const [active, boardCount] = await Promise.all([
    hasActiveSubscription(user.orgId),
    getBoardCount(user.orgId),
  ]);

  const sub = await prisma.subscription.findUnique({ where: { organizationId: user.orgId } });

  const unitPrice = unitPriceForBoardCount(boardCount);
  const total = monthlyTotalCents(boardCount);

  const recentBoards = await prisma.board.findMany({
    where: { organizationId: user.orgId },
    orderBy: { lastSeenAt: "desc" },
    take: 5,
    select: { id: true, boardId: true, deviceName: true, lastSeenAt: true },
  });

  const now = Date.now();

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Dashboard</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>Welcome back, {user.username}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="stat-card">
          <div className="stat-label">Subscription</div>
          <div className="stat-value" style={{ color: active ? "var(--color-success)" : "var(--color-error)" }}>
            {active ? "Active" : sub?.status ?? "Inactive"}
          </div>
          {sub?.currentPeriodEnd && (
            <div className="stat-sub">Renews {sub.currentPeriodEnd.toLocaleDateString()}</div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label">Boards</div>
          <div className="stat-value">{boardCount}</div>
          <div className="stat-sub">claimed boards</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Monthly Total</div>
          <div className="stat-value">${(total / 100).toFixed(2)}</div>
          <div className="stat-sub">
            {boardCount} board{boardCount !== 1 ? "s" : ""} × ${(unitPrice / 100).toFixed(0)}/mo
          </div>
        </div>
      </div>

      {!active && (
        <div className="alert alert-warning" style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No active subscription</p>
            <p style={{ fontSize: "0.9rem", opacity: 0.85 }}>Subscribe to remotely control your Skylight boards.</p>
          </div>
          <div>
            <Link href="/billing" className="btn btn-primary btn-sm">Subscribe now</Link>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.0625rem" }}>Recent Boards</h2>
          <Link href="/boards" style={{ color: "var(--color-primary)", fontSize: "0.875rem" }}>View all →</Link>
        </div>

        {recentBoards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--color-text-muted)" }}>
            No boards yet.{" "}
            <Link href="/boards/new" style={{ color: "var(--color-primary)" }}>Add a board</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {recentBoards.map((b) => {
              const lastSeenMs = b.lastSeenAt ? now - b.lastSeenAt.getTime() : null;
              const online = lastSeenMs !== null && lastSeenMs < 30_000;
              return (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "10px",
                    background: "var(--color-surface-offset)",
                    textDecoration: "none",
                    color: "var(--color-text)",
                    transition: "background 0.15s",
                  }}
                >
                  <span className={`live-dot ${online ? "live" : "dead"}`} />
                  <span style={{ fontWeight: 500, flex: 1 }}>{b.deviceName}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {b.lastSeenAt ? `${Math.round((now - b.lastSeenAt.getTime()) / 1000)}s ago` : "never"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
