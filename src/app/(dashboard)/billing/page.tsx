"use client";

import { useEffect, useState } from "react";
import { monthlyTotalCents, unitPriceForBoardCount } from "@/lib/pricing";

export const dynamic = "force-dynamic";

interface BillingInfo {
  status: string;
  boardCount: number;
  unitPriceCents: number;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
}

export default function BillingPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/billing/info")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setInfo(d.data); })
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout() {
    setActionLoading(true);
    setMessage("");
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const d = await res.json();
    if (d.ok && d.data?.url) {
      window.location.href = d.data.url;
    } else {
      setMessage(d.error ?? "Failed to start checkout.");
      setActionLoading(false);
    }
  }

  async function openPortal() {
    setActionLoading(true);
    setMessage("");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const d = await res.json();
    if (d.ok && d.data?.url) {
      window.location.href = d.data.url;
    } else {
      setMessage(d.error ?? "Failed to open billing portal.");
      setActionLoading(false);
    }
  }

  const total = info ? monthlyTotalCents(info.boardCount) : 0;
  const isActive = info?.status === "active" || info?.status === "trialing";

  return (
    <div style={{ display: "grid", gap: "2rem", maxWidth: 600 }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Billing</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.9375rem" }}>
          Manage your subscription and view pricing.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="card" style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontWeight: 600, fontSize: "1rem" }}>Current plan</h2>
              <span className={isActive ? "badge badge-green" : "badge badge-red"}>
                {isActive ? "Active" : info?.status ?? "No subscription"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="stat-card" style={{ margin: 0 }}>
                <div className="stat-label">Monthly total</div>
                <div className="stat-value">${(total / 100).toFixed(2)}</div>
                {info && info.boardCount > 0 && (
                  <div className="stat-sub">
                    {info.boardCount} board{info.boardCount !== 1 ? "s" : ""} × ${(unitPriceForBoardCount(info.boardCount) / 100).toFixed(0)}/board
                  </div>
                )}
              </div>

              {info?.currentPeriodEnd && (
                <div className="stat-card" style={{ margin: 0 }}>
                  <div className="stat-label">Period ends</div>
                  <div className="stat-value" style={{ fontSize: "1.125rem" }}>
                    {new Date(info.currentPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {message && <div className="alert alert-error">{message}</div>}

            <div>
              {!isActive ? (
                <button className="btn btn-primary" onClick={startCheckout} disabled={actionLoading}>
                  {actionLoading ? "Redirecting…" : "Subscribe"}
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={openPortal} disabled={actionLoading}>
                  {actionLoading ? "Redirecting…" : "Manage billing"}
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem" }}>Volume pricing</h2>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ textAlign: "left", padding: "0.75rem 1.25rem", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Boards</th>
                    <th style={{ textAlign: "right", padding: "0.75rem 1.25rem", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Per board / month</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["1 – 4 boards", "$10.00"],
                    ["5 – 20 boards", "$8.00"],
                    ["21+ boards", "$7.00"],
                  ].map(([range, price], i) => (
                    <tr key={range} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                      <td style={{ padding: "0.875rem 1.25rem" }}>{range}</td>
                      <td style={{ padding: "0.875rem 1.25rem", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>{price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
