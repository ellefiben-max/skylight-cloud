export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function AccountSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: 560 }}>
      <h1 style={{ fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.04em" }}>
        Account Settings
      </h1>

      <div className="panel" style={{ padding: "1.5rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ fontWeight: 600, fontSize: "1rem" }}>Account Info</h2>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <Row label="Username" value={user.username} />
          <Row label="Email" value={user.email} />
          <Row
            label="Email verified"
            value={user.emailVerifiedAt ? "Yes" : "No — check your inbox"}
          />
        </div>
      </div>

      <div className="panel" style={{ padding: "1.5rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ fontWeight: 600, fontSize: "1rem" }}>Security</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          Every login requires a one-time code sent to your email. Password changes are not yet
          available in this version.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
