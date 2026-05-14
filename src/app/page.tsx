import Link from "next/link";

export const dynamic = "force-dynamic";

const metrics = [
  ["5s", "command polling"],
  ["24/7", "board monitoring"],
  ["OTP", "protected access"],
] as const;

const features = [
  ["Remote board UI", "Open the same Skylight 100 control surface through a secure cloud session."],
  ["Live telemetry", "Track last seen time, firmware, memory, IP address, logs, and pending commands."],
  ["Fleet groups", "Organize boards by room, building, or customer without losing per-board control."],
  ["Queued commands", "Settings and relay changes are delivered through the board's normal polling loop."],
] as const;

const pricing = [
  ["1-4 boards", "$10", "per board / month"],
  ["5-20 boards", "$8", "per board / month"],
  ["21+ boards", "$7", "per board / month"],
] as const;

export default function Home() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <Link href="/" className="brand-mark" aria-label="Skylight Cloud home">
          <span className="brand-orbit" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>Skylight Cloud</strong>
            <small>for Skylight 100</small>
          </span>
        </Link>
        <nav className="marketing-nav-actions" aria-label="Account links">
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Start now</Link>
        </nav>
      </header>

      <main>
        <section className="hero-shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot live" />
              Cloud control for production boards
            </div>
            <h1>Skylight Cloud</h1>
            <p className="hero-lede">
              A professional remote operations layer for Skylight 100 controllers, built around the same focused interface operators already use on the local board.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary">Create account</Link>
              <Link href="/login" className="btn btn-ghost">Open dashboard</Link>
            </div>
            <div className="metric-strip" aria-label="Platform highlights">
              {metrics.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="board-visual" aria-label="Skylight 100 remote UI preview">
            <div className="board-top">
              <div>
                <span className="tiny-label">SKYLIGHT 100</span>
                <strong>Astronomical lighting controller</strong>
              </div>
              <span className="status-chip"><span className="live-dot live" />live</span>
            </div>
            <div className="board-clock">
              <span>Current Time</span>
              <strong>18:42:09</strong>
              <small>Milwaukee schedule synced</small>
            </div>
            <div className="relay-preview-grid">
              {["Lights A", "Lights B", "Fan 1", "Fan 2"].map((name, index) => (
                <div key={name} className={index < 2 ? "relay-preview on" : "relay-preview"}>
                  <span>{name}</span>
                  <strong>{index < 2 ? "ON" : "AUTO"}</strong>
                </div>
              ))}
            </div>
            <div className="board-footer-row">
              <span>AP 192.168.4.1</span>
              <span>STA 10.0.0.42</span>
              <span>FW 2.7</span>
            </div>
          </div>
        </section>

        <section className="feature-band">
          <div className="section-heading">
            <span className="tiny-label">Operations</span>
            <h2>Built for real board management</h2>
            <p>Clear state, fast actions, and secure remote access without changing the way the controller behaves on-site.</p>
          </div>
          <div className="feature-grid">
            {features.map(([title, body]) => (
              <article className="feature-card" key={title}>
                <span className="feature-glyph" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow-band">
          <div className="workflow-panel">
            <div className="section-heading compact">
              <span className="tiny-label">Workflow</span>
              <h2>Pair, monitor, command</h2>
            </div>
            <div className="workflow-steps">
              {["Board boots and checks in", "User claims pairing code", "Cloud queues safe commands", "Controller polls and applies"].map((step, index) => (
                <div key={step} className="workflow-step">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-band">
          <div className="section-heading">
            <span className="tiny-label">Pricing</span>
            <h2>Simple volume pricing</h2>
            <p>One product, lower per-board cost as your fleet grows.</p>
          </div>
          <div className="pricing-grid">
            {pricing.map(([range, price, note], index) => (
              <article className={index === 1 ? "price-card featured" : "price-card"} key={range}>
                {index === 1 && <span className="badge badge-teal">Best value</span>}
                <span>{range}</span>
                <strong>{price}</strong>
                <small>{note}</small>
                <Link href="/signup" className={index === 1 ? "btn btn-primary" : "btn btn-ghost"}>Get started</Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <span>Skylight Cloud</span>
        <span>Built for Skylight 100 operators.</span>
      </footer>
    </div>
  );
}
