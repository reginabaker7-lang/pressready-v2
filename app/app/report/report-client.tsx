"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getReportFromHistory, type StoredReport, type StoredStatus } from "@/app/lib/report-history";

type Report = StoredReport;

type OverallStatus = "pass" | "warning" | "error";

const statusLabelMap: Record<StoredStatus, string> = {
  pass: "PASS",
  warning: "WARN",
  error: "FAIL",
};

function formatReportValue(label: string, value?: string) {
  if (!value) return value;
  if (label === "Shirt color") {
    if (value.toLowerCase() === "dark") return "Dark";
    return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
  }
  return value;
}

export default function ReportClient() {
  const [report] = useState<Report | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const params = new URLSearchParams(window.location.search);
      return getReportFromHistory(localStorage, {
        id: params.get("id"),
        latest: params.get("latest"),
      });
    } catch {
      return null;
    }
  });
  const [copied, setCopied] = useState(false);

  const createdLabel = (() => {
    if (!report?.createdAt) return "";
    const d = new Date(report.createdAt);
    return Number.isNaN(d.getTime()) ? report.createdAt : d.toLocaleString();
  })();

  const overallStatus = useMemo<OverallStatus>(() => {
    if (!report) return "pass";
    if ((report.results ?? []).some((result) => result.status === "error")) return "error";
    if ((report.results ?? []).some((result) => result.status === "warning")) return "warning";
    return "pass";
  }, [report]);

  const handleCopySummary = async () => {
    if (!report) return;

    const summary = [
      "PressReady DTF Report",
      report.fileName ? `File: ${report.fileName}` : null,
      report.imageWidthPx && report.imageHeightPx ? `Size: ${report.imageWidthPx}x${report.imageHeightPx} px` : null,
      report.printWidthIn ? `Print width: ${report.printWidthIn} in` : null,
      report.shirtColor ? `Shirt: ${report.shirtColor} | White ink: ${report.whiteInk ? "yes" : "no"}` : null,
      ...report.results.map((result) => {
        const fixText = result.fix ? ` — Fix: ${result.fix}` : "";
        const detailText = result.detail ? result.detail : result.title;
        return `- ${statusLabelMap[result.status]}: ${detailText}${fixText}`;
      }),
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] p-6 text-[#f5c400]">
        <h1 className="mb-2 text-2xl font-bold">PressReady — DTF Readiness Report</h1>
        <p className="mb-6 text-[#f5c400]/80">No saved report found yet. Run a check first.</p>
        <Link
          href="/check"
          className="inline-flex rounded-xl bg-[#f5c400] px-4 py-2 font-semibold text-black transition hover:bg-[#e6b800] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
        >
          Back to Check
        </Link>
      </div>
    );
  }

  const details: Array<{ label: string; value?: string }> = [
    { label: "File", value: report.fileName },
    { label: "Generated", value: createdLabel || new Date().toLocaleString() },
    {
      label: "Image size",
      value:
        report.imageWidthPx && report.imageHeightPx
          ? `${report.imageWidthPx}×${report.imageHeightPx} px`
          : undefined,
    },
    { label: "Print width", value: report.printWidthIn ? `${report.printWidthIn} in` : undefined },
    { label: "Shirt color", value: report.shirtColor },
    { label: "White ink", value: typeof report.whiteInk === "boolean" ? (report.whiteInk ? "Yes" : "No") : undefined },
  ];

  return (
    <div className="report-page min-h-screen bg-[#0b0b0b] p-4 text-[#f5c400] sm:p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-7">
        <div className="no-print flex flex-wrap items-center gap-3">
          <Link
            href="/check"
            className="inline-flex rounded-xl border border-[#7a6310] bg-[#1a1a1a] px-4 py-2 font-semibold text-[#f5c400] transition hover:bg-[#242424] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
          >
            Run another check
          </Link>
          <button
            onClick={handleCopySummary}
            className="inline-flex rounded-xl border border-[#7a6310] bg-[#1a1a1a] px-4 py-2 font-semibold text-[#f5c400] transition hover:bg-[#242424] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
            type="button"
          >
            {copied ? "Copied!" : "Copy Summary"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex rounded-xl bg-[#f5c400] px-4 py-2 font-semibold text-black transition hover:bg-[#e6b800] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
            type="button"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="report-page-card report-card overflow-hidden rounded-2xl border border-[#5f4d10] bg-gradient-to-b from-[#0f0f0f] to-[#090909] p-5 shadow-[0_0_0_1px_rgba(212,175,55,0.15)] sm:p-7 print:rounded-none print:bg-white print:p-0 print:shadow-none">
          <header className="mb-7 border-b border-[#5f4d10] pb-4 print:border-black/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.18em] text-[#f8df6d] print:text-black">PressReady</p>
                <h1 className="text-3xl font-extrabold text-[#f5c400] print:text-black">DTF Readiness Report</h1>
              </div>
              <StatusBadge status={overallStatus} large className="self-center sm:self-start" />
            </div>
          </header>

          <section className="report-card mb-7 rounded-xl border border-[#4a3f11] bg-[#141414] p-5 print:border-black/20 print:bg-white">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#f8df6d] print:text-black">Report Details</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {details
                .filter((item) => Boolean(item.value))
                .map((item) => (
                  <div key={item.label} className="rounded-lg border border-[#3f330a] bg-[#0f0f0f] p-3 print:border-black/15 print:bg-white">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#f8df6d] print:text-black/75">{item.label}</dt>
                    <dd className="mt-1 font-semibold text-[#fdeaa2] print:text-black">{formatReportValue(item.label, item.value)}</dd>
                  </div>
                ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-[#f8df6d] print:text-black">Check Results</h2>
            <div className="space-y-4">
              {(report.results ?? []).map((result, idx) => (
                <article
                  key={`${result.title}-${idx}`}
                  className="report-card rounded-xl border border-[#4a3f11] bg-[#141414] p-5 print:border-black/20 print:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
                    <h3 className="max-w-full break-words text-lg font-semibold text-[#f5c400] print:text-black">{result.title}</h3>
                    <StatusBadge status={result.status} />
                  </div>
                  {result.detail ? <p className="mt-2 break-words text-sm text-[#f8df6d] print:text-black">{result.detail}</p> : null}
                  {result.fix ? (
                    <p className="mt-2 break-words text-sm text-[#f8df6d] print:text-black">
                      <span className="font-semibold">Suggested fix:</span> {result.fix}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  large = false,
  className = "",
}: {
  status: OverallStatus | StoredStatus;
  large?: boolean;
  className?: string;
}) {
  const tone =
    status === "pass"
      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200 print:border-emerald-700 print:bg-transparent print:text-emerald-800"
      : status === "warning"
        ? "border-amber-300/70 bg-amber-400/15 text-amber-100 print:border-amber-700 print:bg-transparent print:text-amber-800"
        : "border-rose-400/70 bg-rose-400/15 text-rose-100 print:border-rose-700 print:bg-transparent print:text-rose-800";

  const text = statusLabelMap[status as StoredStatus] ?? "FAIL";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${tone} ${
        large ? "px-4 py-1.5 text-base" : ""
      } ${className}`}
    >
      {text}
    </span>
  );
}
