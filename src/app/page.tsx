import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateRows: "auto 1fr auto", background: "var(--color-bg)" }}>

      {/* Top nav */}
      <header style={{ padding: "1.25rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--color-border)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10, background: "rgba(10,10,11,0.85)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "1rem", color: "#0a0a0b" }}>S</div>
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.03em" }}>Skylight Cloud</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section style={{ padding: "6rem 1.5rem 5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Background glow */}
          <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
            width: "60%", height: "60%", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(45,212,191,0.06) 0%, transparent 70%)",
            pointerEvents: "none" }} />
          {/* Grid */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.025,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "50px 50px", pointerEvents: "none" }} />

          <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.35rem 0.875rem", borderRadius: 100,
              background: "var(--color-primary-dim)", border: "1px solid var(--color-primary-border)",
              fontSize: "0.8rem", fontWeight: 500, color: "var(--color-primary)", marginBottom: "2rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", display: "inline-block" }} />
              Now in production
            </div>

            <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 800,
              letterSpacing: "-0.06em", lineHeight: 1.08, marginBottom: "1.5rem",
              color: "var(--color-text)" }}>
              Remote control for<br />
              <span style={{ color: "var(--color-primary)" }}>Skylight 100</span> controllers
            </h1>

            <p style={{ fontSize: "clamp(1rem, 2vw, 1.1875rem)", color: "var(--color-text-muted)",
              maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
              Securely manage your grow-light controllers from anywhere in the world.
              Real-time commands, scheduling, live monitoring, and tiered pricing.
            </p>

            <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 1.75rem" }}>
                Create account
              </Link>
              <Link href="/login" className="btn btn-ghost" style={{ fontSize: "1rem", padding: "0.75rem 1.75rem" }}>
                Sign in →
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: "4rem 1.5rem", maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700,
            letterSpacing: "-0.04em", marginBottom: "0.75rem" }}>
            Everything you need to manage your grow room
          </h2>
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "3rem", maxWidth: 480, margin: "0 auto 3rem" }}>
            Built specifically for Skylight 100 operators who need reliable remote access.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {([
              ["🌐", "Remote Board UI", "The exact same interface as your local Skylight 100 UI — served securely through the cloud. Adjust schedules, brightness, and channels remotely."],
              ["🔒", "Enterprise Security", "Argon2id password hashing, email OTP on every login, HttpOnly session cookies, and SHA-256 token storage."],
              ["⚡", "Real-time Commands", "Commands are queued and delivered to your board within seconds. The board polls every 5 seconds and executes immediately."],
              ["📊", "Live Monitoring", "See board status, last-seen timestamps, firmware version, heap usage, and full log history in one place."],
              ["👥", "Board Groups", "Organise multiple boards into groups for easier management. Control boards individually or monitor by group."],
              ["💳", "Simple Pricing", "Transparent per-board monthly pricing. Scales automatically as you add more boards — no fixed seats or hidden fees."],
            ] as const).map(([icon, title, desc]) => (
              <div key={title} className="card" style={{ padding: "1.5rem", display: "grid", gap: "0.75rem" }}>
                <div style={{ fontSize: "1.75rem" }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em", marginBottom: "0.375rem" }}>{title}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section style={{ padding: "4rem 1.5rem 5rem", maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700,
            letterSpacing: "-0.04em", marginBottom: "0.75rem" }}>
            Pricing that scales with you
          </h2>
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "3rem" }}>
            One plan, volume discounts as you grow. Cancel any time.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {([
              ["1 – 4 boards", "$10", "/board/month", false],
              ["5 – 20 boards", "$8", "/board/month", true],
              ["21+ boards", "$7", "/board/month", false],
            ] as const).map(([label, price, per, featured]) => (
              <div key={label} className="card" style={{
                padding: "2rem 1.5rem", textAlign: "center",
                border: featured ? "1px solid var(--color-primary-border)" : undefined,
                background: featured ? "linear-gradient(160deg, rgba(45,212,191,0.07), var(--color-surface))" : undefined,
                position: "relative",
              }}>
                {featured && (
                  <div className="badge badge-teal" style={{ position: "absolute", top: "-0.75rem", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>{label}</div>
                <div style={{ fontSize: "2.75rem", fontWeight: 800, letterSpacing: "-0.06em", color: featured ? "var(--color-primary)" : "var(--color-text)" }}>{price}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>{per}</div>
                <Link href="/signup" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border)", padding: "2rem 1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.75rem", color: "#0a0a0b" }}>S</div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Skylight Cloud</span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>
          © {new Date().getFullYear()} Skylight Cloud. Built for Skylight 100 operators.
        </p>
      </footer>
    </div>
  );
}
