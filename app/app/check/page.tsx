export default function DesignCheckPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold">Design Check</h1>
      <p className="max-w-2xl text-lg leading-8">
        Use this route to review spacing, typography, contrast, and interaction consistency before
        release.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-base leading-7">
        <li>Validate hierarchy and readability.</li>
        <li>Confirm brand alignment across components.</li>
        <li>Check responsive behavior and accessibility basics.</li>
      </ul>
    </section>
  );
}
