"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewBoardPage() {
  const router = useRouter();
  const [form, setForm] = useState({ pairingCode: "", deviceName: "", groupName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/boards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairingCode: form.pairingCode,
          deviceName: form.deviceName || undefined,
          groupName: form.groupName || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Failed to claim board.");
      } else {
        router.push(`/boards/${d.data.id}`);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, display: "grid", gap: "2rem" }}>
      <div>
        <Link href="/boards" style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", textDecoration: "none" }}>
          ← Back to boards
        </Link>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em", marginTop: "0.75rem" }}>
          Add a Board
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.9375rem" }}>
          Enter the pairing code shown on your Skylight board's local UI.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem" }}>
          <div className="field">
            <label htmlFor="pairingCode">Pairing code *</label>
            <input
              id="pairingCode"
              type="text"
              required
              placeholder="e.g. ABC123"
              value={form.pairingCode}
              onChange={(e) => setForm((f) => ({ ...f, pairingCode: e.target.value.trim().toUpperCase() }))}
              style={{ fontFamily: "monospace", fontSize: "1.125rem", letterSpacing: "0.15em" }}
            />
          </div>

          <div className="field">
            <label htmlFor="deviceName">Board name <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>(optional)</span></label>
            <input
              id="deviceName"
              type="text"
              maxLength={128}
              placeholder="e.g. Veg Tent 1"
              value={form.deviceName}
              onChange={(e) => setForm((f) => ({ ...f, deviceName: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="groupName">Group <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>(optional)</span></label>
            <input
              id="groupName"
              type="text"
              maxLength={128}
              placeholder="e.g. Flower Room"
              value={form.groupName}
              onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))}
            />
            <span className="field-hint">Boards in the same group can be managed together.</span>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "Adding…" : "Add board"}
            </button>
            <Link href="/boards" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>

      <div className="card" style={{ background: "var(--color-surface-offset)", border: "none" }}>
        <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.75rem" }}>How to get the pairing code</h3>
        <ol style={{ paddingLeft: "1.25rem", display: "grid", gap: "0.375rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          <li>Power on your Skylight 100 and connect it to Wi-Fi.</li>
          <li>Open the local web UI (visit the board's IP address in a browser).</li>
          <li>Find the pairing code in the <strong style={{ color: "var(--color-text)" }}>Cloud Settings</strong> section.</li>
          <li>Enter the code above within 30 minutes.</li>
        </ol>
      </div>
    </div>
  );
}
