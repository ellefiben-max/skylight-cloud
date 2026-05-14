"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/boards", label: "Boards" },
  { href: "/groups", label: "Groups" },
  { href: "/billing", label: "Billing" },
];

export function Nav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "0.75rem 1.5rem",
        background: "linear-gradient(to bottom, var(--color-bg) 82%, transparent)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        borderBottom: "1px solid color-mix(in oklab, var(--color-text) 8%, transparent)",
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: "-0.04em",
          color: "var(--color-primary)",
          textDecoration: "none",
        }}
      >
        SKYLIGHT
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.9rem",
              fontWeight: pathname.startsWith(l.href) ? 600 : 400,
              color: pathname.startsWith(l.href) ? "var(--color-text)" : "var(--color-text-muted)",
              background: pathname.startsWith(l.href) ? "var(--color-surface-offset)" : "transparent",
              textDecoration: "none",
            }}
          >
            {l.label}
          </Link>
        ))}

        <button
          onClick={handleLogout}
          style={{
            marginLeft: "0.5rem",
            padding: "0.375rem 0.75rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
