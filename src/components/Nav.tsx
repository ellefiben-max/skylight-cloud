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
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      borderBottom: "1px solid var(--color-border)",
      background: "rgba(10,10,11,0.88)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        padding: "0 1.5rem",
        height: 56,
        display: "flex", alignItems: "center", gap: "2rem",
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.875rem", color: "#0a0a0b",
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.03em", color: "var(--color-text)" }}>
            Skylight
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.125rem", flex: 1 }}>
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} style={{
                padding: "0.375rem 0.75rem",
                borderRadius: 6,
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--color-text)" : "var(--color-text-muted)",
                background: active ? "var(--color-surface-3)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <Link href="/settings/account" style={{
            padding: "0.375rem 0.75rem", borderRadius: 6,
            fontSize: "0.875rem", color: "var(--color-text-muted)",
            textDecoration: "none", transition: "color 0.15s",
          }}>
            Settings
          </Link>
          <button onClick={handleLogout} style={{
            padding: "0.375rem 0.875rem", borderRadius: 6,
            fontSize: "0.875rem", fontWeight: 500,
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
            background: "transparent",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--color-text)"; (e.target as HTMLElement).style.borderColor = "var(--color-border-strong)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--color-text-muted)"; (e.target as HTMLElement).style.borderColor = "var(--color-border)"; }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
