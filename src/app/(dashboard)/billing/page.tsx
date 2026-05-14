"use client";

import { useEffect, useState } from "react";
import { monthlyTotalCents, unitPriceForBoardCount } from "@/lib/pricing";

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
      .then((d) => {
        if (d.ok) setInfo(d.data);
      })
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
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: 600 }}>
      <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>Billing</h1>

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : (
        <>
          <div className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>Status</div>
              <div style={{ fontWeight: 700, fontSize: "1.25rem", marginTop: "0.25rem", color: isActive ? "var(--color-success)" : "var(--color-error)" }}>
                {info?.status ?? "No subscription"}
              </div>
            </div>

            {info && info.boardCount > 0 && (
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>Monthly total</div>
                <div style={{ fontWeight: 700, fontSize: "1.25rem", marginTop: "0.25rem" }}>
                  ${(total / 100).toFixed(2)}/month
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                  {info.boardCount} board{info.boardCount !== 1 ? "s" : ""} × ${(unitPriceForBoardCount(info.boardCount) / 100).toFixed(0)}/board
                </div>
              </div>
            )}

            {info?.currentPeriodEnd && (
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>Period ends</div>
                <div style={{ marginTop: "0.25rem" }}>
                  {new Date(info.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ fontWeight: 600, fontSize: "1rem" }}>Pricing</h2>
            <div className="panel" style={{ padding: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.8125rem" }}>Boards</th>
                    <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.8125rem" }}>Price / board / month</th>
                  </tr>
                </thead>
                <tbody>
                  {[["1 – 4", "$10"], ["5 – 20", "$8"], ["21+", "$7"]].map(([range, price]) => (
                    <tr key={range} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "0.625rem 0.75rem" }}>{range}</td>
                      <td style={{ padding: "0.625rem 0.75rem", textAlign: "right", fontWeight: 600 }}>{price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {message && <p style={{ color: "var(--color-error)" }}>{message}</p>}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
        </>
      )}
    </div>
  );
}
