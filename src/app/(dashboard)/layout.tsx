import { Nav } from "@/components/Nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", minHeight: "100dvh" }}>
      <Nav />
      <main style={{ padding: "1.5rem 1.5rem 3rem" }}>{children}</main>
    </div>
  );
}
