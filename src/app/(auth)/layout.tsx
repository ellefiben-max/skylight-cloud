export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {/* Left brand panel */}
      <div className="auth-brand">
        <div style={{ position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", top: "20%", left: "5%", width: "70%", height: "45%",
          background: "radial-gradient(ellipse, rgba(45,212,191,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", fontWeight: 800, color: "#0a0a0b", letterSpacing: "-0.05em" }}>S</div>
            <span style={{ fontWeight: 700, fontSize: "1.0625rem", letterSpacing: "-0.03em" }}>Skylight Cloud</span>
          </div>
        </div>

        <div style={{ position: "relative", display: "grid", gap: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)", fontWeight: 800,
              letterSpacing: "-0.05em", lineHeight: 1.15 }}>
              Control your grow lights<br />
              <span style={{ color: "var(--color-primary)" }}>from anywhere.</span>
            </h2>
            <p style={{ marginTop: "1rem", color: "var(--color-text-muted)", fontSize: "0.9375rem", maxWidth: 340, lineHeight: 1.6 }}>
              Remotely manage your Skylight 100 controllers with real-time commands, scheduling, and live monitoring.
            </p>
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            {([
              ["🔒", "Secure by default", "Email OTP · Argon2id passwords · Session isolation"],
              ["⚡", "Real-time control", "Commands delivered in under 5 seconds"],
              ["📊", "Live monitoring", "Status, logs, and heartbeats from every board"],
            ] as const).map(([icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.125rem", lineHeight: 1.4 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
          © {new Date().getFullYear()} Skylight Cloud
        </p>
      </div>

      {/* Right form area */}
      <div className="auth-form-area">
        <div style={{ width: "100%", maxWidth: 400 }}>{children}</div>
      </div>

      <style>{`
        .auth-shell {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .auth-brand {
          background: linear-gradient(145deg, #0c1f1e 0%, #0a1628 55%, #0d0d1f 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem 3rem;
          position: relative;
          overflow: hidden;
          color: var(--color-text);
        }
        .auth-form-area {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 2.5rem;
          background: var(--color-bg);
        }
        @media (max-width: 768px) {
          .auth-shell { grid-template-columns: 1fr; }
          .auth-brand { display: none; }
          .auth-form-area { padding: 2rem 1.25rem; }
        }
      `}</style>
    </div>
  );
}
