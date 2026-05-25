import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PressReady",
  description: "PressReady helps teams run design checks before launch.",
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-[var(--pressready-gold)]/40">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm font-semibold uppercase tracking-widest">
            <Link href="/">Home</Link>
            <Link href="/check">Check</Link>
            <Link href="/report">Report</Link>
            <Link href="/history">History</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/account">Account</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AppShell>{children}</AppShell>
    </ClerkProvider>
  );
}
