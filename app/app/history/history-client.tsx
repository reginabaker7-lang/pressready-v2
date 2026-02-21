"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearHistory, deleteFromHistory, loadHistory, type StoredReportWithSummary, type StoredStatus } from "@/app/lib/report-history";

const statusLabelMap: Record<StoredStatus, string> = {
  pass: "PASS",
  warning: "WARN",
  error: "FAIL",
};

const statusClassMap: Record<StoredStatus, string> = {
  pass: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
  warning: "border-amber-500/60 bg-amber-500/15 text-amber-300",
  error: "border-red-500/60 bg-red-500/15 text-red-300",
};

const getOverallStatus = (report: StoredReportWithSummary): StoredStatus => {
  if (report.results.some((result) => result.status === "error")) return "error";
  if (report.results.some((result) => result.status === "warning")) return "warning";
  return "pass";
};

export default function HistoryClient() {
  const router = useRouter();
  const [items, setItems] = useState<StoredReportWithSummary[]>(() => {
    if (typeof window === "undefined") return [];
    return loadHistory(localStorage);
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshHistory = () => {
    setItems(loadHistory(localStorage));
  };


  const handleCopySummary = async (item: StoredReportWithSummary) => {
    await navigator.clipboard.writeText(item.summaryText);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    deleteFromHistory(localStorage, id);
    refreshHistory();
  };

  const handleClear = () => {
    if (!window.confirm("Clear all saved reports from history?")) return;
    clearHistory(localStorage);
    refreshHistory();
  };

  return (
    <section className="space-y-6 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400] md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-sm text-[#f8df6d]">Saved reports are stored in your browser.</p>
        </div>
        <button
          className="rounded border border-[#665716] bg-[#111] px-4 py-2 text-sm font-semibold uppercase tracking-wider transition hover:bg-[#1b1b1b]"
          onClick={handleClear}
          type="button"
        >
          Clear History
        </button>
      </div>

      {!items.length ? (
        <div className="rounded-lg border border-[#4a3f11] bg-[#151515] p-6 text-center">
          <p className="mb-4 text-lg font-semibold">No saved reports yet</p>
          <Link className="inline-flex rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold" href="/check">
            Start a Design Check
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = getOverallStatus(item);
            const date = new Date(item.createdAt);
            const dateLabel = Number.isNaN(date.getTime()) ? item.createdAt : date.toLocaleString();

            return (
              <li className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClassMap[status]}`}>
                      {statusLabelMap[status]}
                    </span>
                    <p className="text-lg font-semibold">{item.fileName || "Untitled report"}</p>
                    <p className="text-sm text-[#f8df6d]">Generated {dateLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-semibold">
                    <button
                      className="rounded border border-[#665716] bg-[#111] px-3 py-2 transition hover:bg-[#1b1b1b]"
                      onClick={() => router.push(`/report?id=${item.id}`)}
                      type="button"
                    >
                      Open
                    </button>
                    <button
                      className="rounded border border-[#665716] bg-[#111] px-3 py-2 transition hover:bg-[#1b1b1b]"
                      onClick={() => handleCopySummary(item)}
                      type="button"
                    >
                      {copiedId === item.id ? "Copied!" : "Copy Summary"}
                    </button>
                    <button
                      className="rounded border border-red-700/70 bg-red-900/20 px-3 py-2 text-red-200 transition hover:bg-red-900/30"
                      onClick={() => handleDelete(item.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
