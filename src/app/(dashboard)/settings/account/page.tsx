export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AccountSettingsClient } from "./AccountSettingsClient";

export default async function AccountSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const subscription = user.orgId
    ? await prisma.subscription.findUnique({ where: { organizationId: user.orgId } })
    : null;

  return (
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: 760 }}>
      <div>
        <h1 className="page-title">Account Settings</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
          Manage your login, contact details, and subscription.
        </p>
      </div>

      <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Account Info</h2>
        <InfoRow label="Username" value={user.username} />
        <InfoRow label="Email verified" value={user.emailVerifiedAt ? "Yes" : "No - check your inbox"} />
      </div>

      <AccountSettingsClient
        initialEmail={user.email}
        initialPhone={user.phone}
        subscriptionStatus={subscription?.status ?? "No subscription"}
        hasBillingAccount={!!subscription?.stripeCustomerId}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.55rem 0", borderBottom: "1px solid var(--color-border)" }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
