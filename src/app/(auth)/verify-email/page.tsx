"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
        if (d.ok) {
          setStatus("success");
          setMessage(d.data?.message ?? "Email verified.");
        } else {
          setStatus("error");
          setMessage(d.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error.");
      });
  }, [token]);

  if (!token) {
    return (
      <div className="panel" style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
        <h1 style={{ fontWeight: 700, fontSize: "1.5rem" }}>Invalid link</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          No verification token found. Check your email for the correct link.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
      <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>
        Email Verification
      </h1>

      {status === "loading" && (
        <p style={{ color: "var(--color-text-muted)" }}>Verifying…</p>
      )}

      {status === "success" && (
        <>
          <p style={{ color: "var(--color-success)" }}>{message}</p>
          <Link href="/login" className="btn btn-primary" style={{ textAlign: "center" }}>
            Sign In
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <p className="error-msg">{message}</p>
          <Link href="/signup" className="btn btn-ghost" style={{ textAlign: "center" }}>
            Back to Signup
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
