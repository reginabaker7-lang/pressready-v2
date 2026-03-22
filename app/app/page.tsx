import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-5xl font-bold leading-tight text-[var(--pressready-gold)]">PressReady</h1>
      <p className="max-w-2xl text-lg leading-8">
        Upload your design. Get a DTF readiness report in seconds.
      </p>
      <div className="relative z-10 flex flex-wrap gap-4 text-sm font-semibold uppercase tracking-wider">
        <Link
          className="rounded bg-[var(--pressready-gold)] px-4 py-2 text-black transition hover:opacity-90"
          href="/check"
        >
          Start a Design Check
        </Link>
        <Link
          className="rounded border border-[var(--pressready-gold)] px-4 py-2 text-[var(--pressready-gold)] transition hover:bg-[var(--pressready-gold)] hover:text-black"
          href="/how-it-works"
        >
          Learn How It Works
        </Link>
      </div>
    </section>
  );
}
