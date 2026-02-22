import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ClerkProvider } from "@/app/lib/clerk-provider";

export const metadata: Metadata = {
  title: "PressReady",
  description: "PressReady helps teams run design checks before launch.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          <header className="border-b border-[var(--pressready-gold)]/40">
            <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm font-semibold uppercase tracking-widest">
              <Link href="/">Home</Link>
              <Link href="/check">Design Check</Link>
              <Link href="/report">Report</Link>
              <Link href="/history">History</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/account">Account</Link>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-5xl px-6 py-12">{children}</main>
        </body>
      </html>
    </ClerkProvider>
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-[var(--pressready-gold)]/40">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm font-semibold uppercase tracking-widest">
            <Link href="/">Home</Link>
            <Link href="/check">Design Check</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/history">History</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
