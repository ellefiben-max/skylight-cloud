"use client";

import { useState } from "react";

type Props = {
  initialEmail: string;
  initialPhone: string;
  subscriptionStatus: string;
  hasBillingAccount: boolean;
};

type Message = { type: "ok" | "err"; text: string } | null;

export function AccountSettingsClient({
  initialEmail,
  initialPhone,
  subscriptionStatus,
  hasBillingAccount,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState("");

  async function requestOtp() {
    setLoading("otp");
    setMessage(null);
    const res = await fetch("/api/account/otp", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading("");
    setMessage(res.ok ? { type: "ok", text: data.data?.message ?? "Security code sent." } : { type: "err", text: data.error ?? "Failed to send code." });
  }

  async function updateAccount(action: "email" | "phone" | "password") {
    setLoading(action);
    setMessage(null);

    const body =
      action === "email" ? { action, otp, email } :
      action === "phone" ? { action, otp, phone } :
      { action, otp, currentPassword, newPassword };

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading("");

    if (res.ok) {
      setOtp("");
      if (action === "password") {
        setCurrentPassword("");
        setNewPassword("");
      }
      setMessage({ type: "ok", text: data.data?.message ?? "Account updated." });
    } else {
      setMessage({ type: "err", text: data.error ?? "Update failed." });
    }
  }

  async function openBillingPortal() {
    setLoading("billing");
    setMessage(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading("");
    if (res.ok && data.data?.url) window.location.href = data.data.url;
    else setMessage({ type: "err", text: data.error ?? "Failed to open billing portal." });
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {message && (
        <div className={`alert ${message.type === "ok" ? "alert-success" : "alert-error"}`}>
          {message.text}
        </div>
      )}

      <section className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Security code</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Required before changing email, phone, or password.
            </p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={requestOtp} disabled={loading === "otp"}>
            {loading === "otp" ? "Sending..." : "Send code"}
          </button>
        </div>
        <div className="field">
          <label htmlFor="accountOtp">One-time code</label>
          <input
            id="accountOtp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
        </div>
      </section>

      <section className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Contact</h2>
        <div className="field">
          <label htmlFor="accountEmail">Email address</label>
          <input id="accountEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="field-hint">Changing email sends a verification link to the new address.</div>
        </div>
        <button className="btn btn-primary" type="button" disabled={loading === "email" || otp.length !== 6} onClick={() => updateAccount("email")}>
          {loading === "email" ? "Saving..." : "Change email"}
        </button>

        <div className="divider" />

        <div className="field">
          <label htmlFor="accountPhone">Phone number</label>
          <input id="accountPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
        </div>
        <button className="btn btn-primary" type="button" disabled={loading === "phone" || otp.length !== 6} onClick={() => updateAccount("phone")}>
          {loading === "phone" ? "Saving..." : "Change phone"}
        </button>
      </section>

      <section className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Password</h2>
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div className="field-hint">Use at least 12 characters.</div>
        </div>
        <button className="btn btn-primary" type="button" disabled={loading === "password" || otp.length !== 6} onClick={() => updateAccount("password")}>
          {loading === "password" ? "Saving..." : "Change password"}
        </button>
      </section>

      <section className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Subscription</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Current status: <strong style={{ color: "var(--color-text)" }}>{subscriptionStatus}</strong>
            </p>
          </div>
          <button className="btn btn-danger" type="button" disabled={!hasBillingAccount || loading === "billing"} onClick={openBillingPortal}>
            {loading === "billing" ? "Opening..." : "Cancel or manage"}
          </button>
        </div>
        {!hasBillingAccount && <p className="field-hint">No Stripe billing account exists yet.</p>}
      </section>
    </div>
  );
}
