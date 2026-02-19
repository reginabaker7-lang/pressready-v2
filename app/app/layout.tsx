import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PressReady",
  description: "PressReady helps teams run design checks before launch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b border-[var(--pressready-gold)]/40">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm font-semibold uppercase tracking-widest">
            <Link href="/">Home</Link>
            <Link href="/check">Design Check</Link>
            <Link href="/how-it-works">How It Works</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
