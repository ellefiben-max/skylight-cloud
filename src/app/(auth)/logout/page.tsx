"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      router.push("/login");
    });
  }, [router]);

  return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
      Signing out…
    </div>
  );
}
