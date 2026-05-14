import { Nav } from "@/components/Nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateRows: "auto 1fr" }}>
      <Nav />
      <main style={{ maxWidth: 1080, width: "100%", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        {children}
      </main>
    </div>
  );
}
