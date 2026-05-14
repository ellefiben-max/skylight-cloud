"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    setStatus("loading");
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setStatus("success"); setMessage(d.data?.message ?? "Email verified."); }
        else { setStatus("error"); setMessage(d.error ?? "Verification failed."); }
      })
      .catch(() => { setStatus("error"); setMessage("Network error."); });
  }, [token]);

  if (!token) {
    return (
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div style={{ fontSize: "2rem" }}>⚠️</div>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>Invalid link</h1>
          <p style={{ color: "var(--color-text-muted)" }}>No verification token found. Check your email for the correct link.</p>
        </div>
        <Link href="/signup" className="btn btn-ghost">Back to signup</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.75rem" }}>
      {status === "loading" && (
        <>
          <div style={{ display: "flex", justifyContent: "center" }}><div className="spinner" /></div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>Verifying…</h1>
            <p style={{ color: "var(--color-text-muted)" }}>Please wait while we verify your email.</p>
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "var(--color-success-dim)",
            border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.625rem" }}>✓</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.5rem", color: "var(--color-success)" }}>
              Email verified!
            </h1>
            <p style={{ color: "var(--color-text-muted)" }}>{message} You can now sign in to your account.</p>
          </div>
          <Link href="/login" className="btn btn-primary" style={{ textAlign: "center" }}>Sign in now</Link>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ fontSize: "2rem" }}>❌</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>Verification failed</h1>
            <div className="alert alert-error">{message}</div>
          </div>
          <Link href="/signup" className="btn btn-ghost" style={{ textAlign: "center" }}>Back to signup</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyContent /></Suspense>;
}
