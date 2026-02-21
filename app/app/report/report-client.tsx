"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  getLatestReport,
  getReportById,
  migrateLegacyReport,
  type ReportStatus,
} from "@/app/lib/history";

type OverallStatus = ReportStatus;

const statusLabelMap: Record<ReportStatus, string> = {
  PASS: "PASS",
  WARN: "WARN",
  FAIL: "FAIL",
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
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const { report, notFoundMessage } = useMemo(() => {
    if (typeof window === "undefined") {
      return { report: null, notFoundMessage: "Loading report..." };
    }

    migrateLegacyReport();

    const latest = searchParams.get("latest");
    const reportId = searchParams.get("id");

    if (reportId) {
      const byId = getReportById(reportId);
      if (!byId) {
        return {
          report: null,
          notFoundMessage: "That report could not be found. It may have been deleted.",
        };
      }

      return { report: byId, notFoundMessage: null };
    }

    if (latest === "1") {
      const newest = getLatestReport();
      return {
        report: newest,
        notFoundMessage: newest ? null : "No saved report found yet. Run a check first.",
      };
    }

    const fallback = getLatestReport();
    return {
      report: fallback,
      notFoundMessage: fallback ? null : "No saved report found yet. Run a check first.",
    };
  }, [searchParams]);

  const createdLabel = (() => {
    if (!report?.generatedAt) return "";
    const d = new Date(report.generatedAt);
    return Number.isNaN(d.getTime()) ? report.generatedAt : d.toLocaleString();
  })();

  const overallStatus = useMemo<OverallStatus>(() => {
    if (!report) return "PASS";
    return report.status;
  }, [report]);

  const handleCopySummary = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.summaryText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] p-6 text-[#f5c400]">
        <h1 className="mb-2 text-2xl font-bold">PressReady — DTF Readiness Report</h1>
        <p className="mb-6 text-[#f5c400]/80">{notFoundMessage ?? "No report found."}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/history"
            className="inline-flex rounded-xl border border-[#7a6310] bg-[#1a1a1a] px-4 py-2 font-semibold text-[#f5c400] transition hover:bg-[#242424] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
          >
            Back to History
          </Link>
          <Link
            href="/check"
            className="inline-flex rounded-xl bg-[#f5c400] px-4 py-2 font-semibold text-black transition hover:bg-[#e6b800] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
          >
            Run New Check
          </Link>
        </div>
      </div>
    );
  }

  const details: Array<{ label: string; value?: string }> = [
    { label: "File", value: report.reportData.fileName },
    { label: "Generated", value: createdLabel || new Date().toLocaleString() },
    {
      label: "Image size",
      value:
        report.reportData.imageWidthPx && report.reportData.imageHeightPx
          ? `${report.reportData.imageWidthPx}×${report.reportData.imageHeightPx} px`
          : undefined,
    },
    {
      label: "Print width",
      value: report.reportData.printWidthIn
        ? `${report.reportData.printWidthIn} in`
        : undefined,
    },
    { label: "Shirt color", value: report.reportData.shirtColor },
    {
      label: "White ink",
      value:
        typeof report.reportData.whiteInk === "boolean"
          ? report.reportData.whiteInk
            ? "Yes"
            : "No"
          : undefined,
    },
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
          <Link
            href="/history"
            className="inline-flex rounded-xl border border-[#7a6310] bg-[#1a1a1a] px-4 py-2 font-semibold text-[#f5c400] transition hover:bg-[#242424] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c400]"
          >
            Open history
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
                  key={`${result.title}-${index}`}
                  className="report-card rounded-xl border border-[#5f4d10] bg-[#121212] p-4 print:border-zinc-300 print:bg-white"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c400]/80 print:text-zinc-500">
                    {statusLabelMap[result.status]}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[#f5f0cc] print:text-zinc-900">{result.title}</h3>
                  <p className="mt-2 text-sm text-[#f5e7ab] print:text-zinc-700">{result.detail || result.title}</p>
                  {result.fix ? (
                    <p className="mt-2 text-sm text-[#f8df6d] print:text-zinc-700">
                      Fix: {result.fix}
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
