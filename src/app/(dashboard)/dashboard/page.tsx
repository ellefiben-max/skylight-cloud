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
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
          Welcome, {user.username}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="panel" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
            Subscription
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", color: active ? "var(--color-success)" : "var(--color-error)" }}>
            {active ? "Active" : sub?.status ?? "Inactive"}
          </div>
          {sub?.currentPeriodEnd && (
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
              Renews {sub.currentPeriodEnd.toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
            Boards
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>{boardCount}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            claimed boards
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
            Monthly Total
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>
            ${(total / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            {boardCount} board{boardCount !== 1 ? "s" : ""} × ${(unitPrice / 100).toFixed(0)}/mo
          </div>
        </div>
      </div>

      {!active && (
        <div
          className="panel"
          style={{
            padding: "1.25rem",
            border: "1px solid color-mix(in oklab, var(--color-warning) 40%, transparent)",
            background: "color-mix(in oklab, var(--color-warning) 8%, transparent)",
          }}
        >
          <p style={{ fontWeight: 600, color: "var(--color-warning)" }}>
            No active subscription
          </p>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Subscribe to remotely control your Skylight boards.
          </p>
          <Link href="/billing" className="btn btn-primary" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
            Subscribe
          </Link>
        </div>
      )}

      <div className="panel" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.0625rem" }}>Recent Boards</h2>
          <Link href="/boards" style={{ color: "var(--color-primary)", fontSize: "0.875rem" }}>
            View all
          </Link>
        </div>

        {recentBoards.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>
            No boards yet.{" "}
            <Link href="/boards/new" style={{ color: "var(--color-primary)" }}>
              Add a board
            </Link>
          </p>
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
                  }}
                >
                  <span className={`live-dot ${online ? "live" : "dead"}`} />
                  <span style={{ fontWeight: 500 }}>{b.deviceName}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
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
