"use client";

import { useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Signup failed.");
      else setSuccess(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-success-dim)",
          border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
          ✉️
        </div>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>Check your email</h1>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            We sent a verification link to <strong style={{ color: "var(--color-text)" }}>{form.email}</strong>.
            Click it to activate your account.
          </p>
        </div>
        <Link href="/login" className="btn btn-primary" style={{ textAlign: "center" }}>
          Go to sign in
        </Link>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)", textAlign: "center" }}>
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.375rem" }}>
          Create your account
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>
          Already have one?{" "}
          <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username" required
            minLength={3} maxLength={32} placeholder="your_username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        </div>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" required
            minLength={12} placeholder="At least 12 characters"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <span className="field-hint">Minimum 12 characters</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "0.6875rem" }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p style={{ fontSize: "0.8rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        By signing up you agree to our terms of service.
      </p>
    </div>
  );
}
