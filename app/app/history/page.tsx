"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  clearHistory,
  deleteReportById,
  getHistory,
  migrateLegacyReport,
} from "@/app/lib/history";

const statusStyles = {
  PASS: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  WARN: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  FAIL: "border-rose-400/50 bg-rose-500/15 text-rose-200",
};

export default function HistoryPage() {
  const [version, setVersion] = useState(0);

  const history = useMemo(() => {
    if (version < 0) return [];
    if (typeof window === "undefined") return [];
    migrateLegacyReport();
    return getHistory();
  }, [version]);

  const handleCopySummary = async (summaryText: string) => {
    await navigator.clipboard.writeText(summaryText);
  };

  const handleDelete = (id: string) => {
    deleteReportById(id);
    setVersion((prev) => prev + 1);
  };

  const handleClear = () => {
    if (!window.confirm("Clear all report history? This cannot be undone.")) return;
    clearHistory();
    setVersion((prev) => prev + 1);
  };

  return (
    <section className="mx-auto min-h-screen w-full max-w-5xl space-y-6 bg-[#0b0b0b] px-4 py-8 text-[#f5c400] sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#4a3f11] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#f5c400]/70">PressReady</p>
          <h1 className="text-3xl font-bold">Report History</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/check" className="rounded-lg border border-[#6d5a15] bg-[#161616] px-4 py-2 text-sm font-semibold hover:bg-[#1f1f1f]">
            Run New Check
          </Link>
          <button
            onClick={handleClear}
            type="button"
            className="rounded-lg border border-[#7d2b2b] bg-[#2a1414] px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-[#351919]"
            disabled={history.length === 0}
          >
            Clear History
          </button>
        </div>
      </header>

      {history.length === 0 ? (
        <div className="rounded-xl border border-[#4a3f11] bg-[#141414] p-8 text-center">
          <h2 className="text-xl font-semibold">No reports yet</h2>
          <p className="mt-2 text-[#f8df6d]">Run a new design check to start building your history.</p>
          <Link href="/check" className="mt-4 inline-flex rounded-lg bg-[#f5c400] px-4 py-2 font-semibold text-black hover:bg-[#e6b800]">
            Run a New Check
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((report) => (
            <article
              key={report.id}
              className="grid gap-3 rounded-xl border border-[#4a3f11] bg-[#141414] p-4 sm:grid-cols-[auto,1fr,auto] sm:items-center"
            >
              <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[report.status]}`}>
                {report.status}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#f5e7ab]">{report.title}</h2>
                <p className="text-sm text-[#f8df6d]/80">
                  {Number.isNaN(new Date(report.generatedAt).getTime())
                    ? report.generatedAt
                    : new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link href={`/report?id=${report.id}`} className="rounded-lg border border-[#6d5a15] bg-[#191919] px-3 py-2 text-sm font-semibold hover:bg-[#222]">
                  Open
                </Link>
                <button onClick={() => handleCopySummary(report.summaryText)} type="button" className="rounded-lg border border-[#6d5a15] bg-[#191919] px-3 py-2 text-sm font-semibold hover:bg-[#222]">
                  Copy Summary
                </button>
                <button onClick={() => handleDelete(report.id)} type="button" className="rounded-lg border border-[#7d2b2b] bg-[#2a1414] px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-[#351919]">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
