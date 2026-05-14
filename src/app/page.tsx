import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "4rem 1.5rem",
        display: "grid",
        gap: "2rem",
        placeItems: "center",
        minHeight: "100dvh",
        textAlign: "center",
      }}
    >
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <h1
          style={{
            fontSize: "clamp(2rem,4vw,3rem)",
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: "var(--color-text)",
          }}
        >
          SKYLIGHT Cloud
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1.0625rem" }}>
          Remote management for Skylight 100 grow-light controllers.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/signup" className="btn btn-primary">
          Create Account
        </Link>
        <Link href="/login" className="btn btn-ghost">
          Sign In
        </Link>
      </div>

      <p style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem" }}>
        Secure cloud access · Stripe billing · Full board control
      </p>
    </main>
  );
}
