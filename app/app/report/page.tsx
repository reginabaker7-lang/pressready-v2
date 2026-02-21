"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CheckStatus, getLatestReport, getReportById } from "../lib/report-history";

const statusClasses: Record<CheckStatus, string> = {
  Pass: "border-emerald-400 text-emerald-300",
  Warning: "border-amber-400 text-amber-300",
  Error: "border-rose-400 text-rose-300",
};

export default function ReportPage() {
  const params = useSearchParams();
  const reportId = params.get("id");
  const report = useMemo(
    () => (reportId ? getReportById(reportId) : getLatestReport()),
    [reportId],
  );

  return (
    <section className="space-y-8 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400] md:p-10">
      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        <Link className="hover:underline" href="/">
          ← Back to Home
        </Link>
        <Link className="hover:underline" href="/check">
          Run New Check
        </Link>
        <Link className="hover:underline" href="/history">
          View History
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">DTF Readiness Report</h1>
      </header>

      {!report ? (
        <p className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4 text-sm text-[#f8df6d]">
          No saved report found. Run a check to generate a report.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4 text-sm text-[#f8df6d]">
            <p>
              <span className="font-semibold">File:</span> {report.fileName}
            </p>
            <p>
              <span className="font-semibold">Created:</span> {new Date(report.createdAt).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold">Print width:</span> {report.inputs.printWidthIn} in ·{" "}
              <span className="font-semibold">Shirt:</span> {report.inputs.shirtColor} ·{" "}
              <span className="font-semibold">White ink:</span> {report.inputs.whiteInk ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-semibold">Image size:</span> {report.inputs.imageWidthPx} ×{" "}
              {report.inputs.imageHeightPx} px
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {report.results.map((result) => (
              <article className={`rounded-lg border bg-[#171717] p-4 ${statusClasses[result.status]}`} key={result.title}>
                <p className="text-xs font-bold uppercase tracking-wider">{result.status}</p>
                <h2 className="mt-1 text-lg font-semibold text-[#f5c400]">{result.title}</h2>
                <p className="mt-2 text-sm text-[#f5e7ab]">{result.message}</p>
                {result.suggestion && <p className="mt-2 text-sm text-[#f8df6d]">Fix: {result.suggestion}</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
