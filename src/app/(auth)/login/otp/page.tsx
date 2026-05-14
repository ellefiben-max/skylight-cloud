"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function OtpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") ?? "";
  const next = params.get("next") ?? "/dashboard";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Invalid code.");
      else router.push(next);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-primary-dim)",
          border: "1px solid var(--color-primary-border)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "1.375rem", marginBottom: "1.25rem" }}>
          🔑
        </div>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.375rem" }}>
          Check your email
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          We sent a 6-digit code to your email address. Enter it below to sign in.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem" }}>
        <div className="field">
          <label htmlFor="otp">Verification code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ fontSize: "1.75rem", letterSpacing: "0.35em", textAlign: "center", fontWeight: 700 }}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading || otp.length !== 6}
          style={{ width: "100%", justifyContent: "center", padding: "0.6875rem" }}>
          {loading ? "Verifying…" : "Verify & sign in"}
        </button>
      </form>

      <div style={{ display: "grid", gap: "0.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>Code expires in 10 minutes.</p>
        <Link href="/login" style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>← Back to sign in</Link>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return <Suspense><OtpContent /></Suspense>;
}
