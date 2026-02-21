"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { StoredStatus, getHistoryById, getLatestHistory } from "../lib/history";

const statusClasses: Record<StoredStatus, string> = {
  PASS: "border-emerald-400 text-emerald-300",
  WARN: "border-amber-400 text-amber-300",
  FAIL: "border-rose-400 text-rose-300",
};

export default function ReportPage() {
  const params = useSearchParams();
  const reportId = params.get("id");
  const latest = params.get("latest");
  const report = useMemo(() => {
    if (reportId) {
      return getHistoryById(reportId);
    }

    if (latest === "1") {
      return getLatestHistory();
    }

    return getLatestHistory();
  }, [latest, reportId]);

  const copySummary = async () => {
    if (!report) {
      return;
    }

    try {
      await navigator.clipboard.writeText(report.summaryText);
      alert("Summary copied.");
    } catch {
      alert("Unable to copy summary from this browser.");
    }
  };

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
        <div className="space-y-4 rounded-lg border border-[#4a3f11] bg-[#151515] p-4 text-sm text-[#f8df6d]">
          <p>No saved report found for this link.</p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded border border-[#f5c400] px-3 py-1 font-semibold" href="/history">
              Back to History
            </Link>
            <Link className="rounded border border-[#f5c400] px-3 py-1 font-semibold" href="/check">
              Run a new check
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <button className="rounded border border-[#f5c400] px-3 py-1" onClick={() => void copySummary()} type="button">
              Copy Summary
            </button>
            <button className="rounded border border-[#f5c400] px-3 py-1" onClick={() => window.print()} type="button">
              Print / Save PDF
            </button>
          </div>

          <div className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4 text-sm text-[#f8df6d]">
            <p className={`inline-flex rounded border px-2 py-0.5 text-xs font-bold ${statusClasses[report.status]}`}>
              {report.status}
            </p>
            <p className="mt-2">
              <span className="font-semibold">File:</span> {report.title}
            </p>
            <p>
              <span className="font-semibold">Generated:</span> {new Date(report.generatedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold">Print width:</span> {report.meta?.printWidthIn ?? "-"} in ·{" "}
              <span className="font-semibold">Shirt:</span> {report.meta?.shirtColor ?? "-"} ·{" "}
              <span className="font-semibold">White ink:</span> {report.meta?.whiteInk ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-semibold">Image size:</span> {report.meta?.imageSize ?? "-"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {report.results.map((result) => (
              <article className={`rounded-lg border bg-[#171717] p-4 ${statusClasses[result.status]}`} key={result.title}>
                <p className="text-xs font-bold uppercase tracking-wider">{result.status}</p>
                <h2 className="mt-1 text-lg font-semibold text-[#f5c400]">{result.title}</h2>
                {result.message && <p className="mt-2 text-sm text-[#f5e7ab]">{result.message}</p>}
                {result.details?.map((detail) => (
                  <p className="mt-2 text-sm text-[#f8df6d]" key={detail}>
                    Fix: {detail}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
