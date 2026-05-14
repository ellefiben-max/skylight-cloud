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
        router.push(next);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>
          Sign in
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "var(--color-primary)" }}>
            Create one
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <div className="field">
          <label htmlFor="login">Username or email</label>
          <input
            id="login"
            type="text"
            autoComplete="username"
            required
            value={form.login}
            onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
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
