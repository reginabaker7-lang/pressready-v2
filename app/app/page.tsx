import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <p className="text-sm uppercase tracking-[0.3em]">PressReady</p>
      <h1 className="text-5xl font-bold leading-tight">Publish with confidence.</h1>
      <p className="max-w-2xl text-lg leading-8">
        PressReady gives your team a fast, consistent way to review design quality before launch.
        Run checks, align across stakeholders, and ship polished experiences.
      </p>
      <div className="flex flex-wrap gap-4 text-sm font-semibold uppercase tracking-wider">
        <Link className="rounded border border-[var(--pressready-gold)] px-4 py-2" href="/check">
          Start a Design Check
        </Link>
        <Link className="rounded border border-[var(--pressready-gold)] px-4 py-2" href="/how-it-works">
          Learn How It Works
        </Link>
      </div>
    </section>
  );
}
