"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
      } else {
        router.push(`/login/otp?userId=${data.data.userId}&next=${encodeURIComponent(next)}`);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.375rem" }}>
          Welcome back
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "var(--color-primary)", fontWeight: 500 }}>Create one</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <div className="field">
          <label htmlFor="login">Username or email</label>
          <input id="login" type="text" autoComplete="username" required
            placeholder="username or email"
            value={form.login}
            onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))} />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required
            placeholder="••••••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "0.6875rem" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        A 6-digit verification code will be sent to your email.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
