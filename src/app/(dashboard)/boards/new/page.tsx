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
    <div style={{ maxWidth: 480, display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>
          Add Board
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
          Enter the pairing code shown on your local Skylight board UI.
        </p>
      </div>

      <div className="panel" style={{ padding: "1.5rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="pairingCode">Pairing code *</label>
            <input
              id="pairingCode"
              type="text"
              required
              placeholder="e.g. ABC123"
              value={form.pairingCode}
              onChange={(e) => setForm((f) => ({ ...f, pairingCode: e.target.value.trim() }))}
            />
          </div>

          <div className="field">
            <label htmlFor="deviceName">Board name (optional)</label>
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
            <label htmlFor="groupName">Group (optional)</label>
            <input
              id="groupName"
              type="text"
              maxLength={128}
              placeholder="e.g. Flower Room"
              value={form.groupName}
              onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Adding…" : "Add board"}
            </button>
            <Link href="/boards" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <div className="panel" style={{ padding: "1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
        <strong style={{ color: "var(--color-text)" }}>How to get the pairing code:</strong>
        <ol style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", display: "grid", gap: "0.25rem" }}>
          <li>Power on your Skylight 100 and connect it to Wi-Fi.</li>
          <li>Open the local web UI (visit the board's IP address).</li>
          <li>Find the pairing code in the Cloud Settings section.</li>
          <li>Enter the code above within 30 minutes.</li>
        </ol>
      </div>
    </div>
  );
}
