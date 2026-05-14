import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Skylight Cloud",
  description: "Remote management for Skylight 100 grow-light controllers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
