"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  StoredReport,
  clearHistory,
  deleteFromHistory,
  loadHistory,
  migrateOldHistoryIfNeeded,
} from "../lib/history";

const statusClasses = {
  PASS: "border-emerald-400 text-emerald-300",
  WARN: "border-amber-400 text-amber-300",
  FAIL: "border-rose-400 text-rose-300",
};

export default function HistoryPage() {
  const [history, setHistory] = useState<StoredReport[]>(() => {
    migrateOldHistoryIfNeeded();
    return loadHistory();
  });
  const router = useRouter();

  const refreshHistory = () => {
    setHistory(loadHistory());
  };

  const copySummary = async (summaryText: string) => {
    try {
      await navigator.clipboard.writeText(summaryText);
      alert("Summary copied.");
    } catch {
      alert("Unable to copy summary from this browser.");
    }
  };

  const handleClearAll = () => {
    if (!window.confirm("Clear all saved history? This cannot be undone.")) {
      return;
    }

    clearHistory();
    refreshHistory();
  };

  return (
    <section className="space-y-8 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400] md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold">
        <div className="flex flex-wrap items-center gap-4">
          <Link className="hover:underline" href="/">
            ← Back to Home
          </Link>
          <Link className="hover:underline" href="/check">
            Run New Check
          </Link>
        </div>
        {history.length > 0 && (
          <button className="rounded border border-rose-400 px-3 py-1 text-rose-300" onClick={handleClearAll} type="button">
            Clear History
          </button>
        )}
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">History</h1>
        <p className="max-w-3xl text-base text-[#f8df6d]">Your latest 20 reports are stored locally in this browser.</p>
      </header>

      {history.length === 0 ? (
        <div className="space-y-4 rounded-lg border border-[#4a3f11] bg-[#151515] p-5 text-sm text-[#f8df6d]">
          <p>No saved reports yet.</p>
          <Link className="inline-block rounded border border-[#f5c400] px-3 py-1 font-semibold" href="/check">
            Run a new check
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((report) => (
            <li className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4" key={report.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`inline-flex rounded border px-2 py-0.5 text-xs font-bold ${statusClasses[report.status]}`}>
                    {report.status}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#f8df6d]">{report.title}</p>
                  <p className="text-xs text-[#e6cf67]">{new Date(report.generatedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    className="rounded border border-[#f5c400] px-3 py-1"
                    onClick={() => router.push(`/report?id=${report.id}`)}
                    type="button"
                  >
                    Open
                  </button>
                  <button
                    className="rounded border border-[#f5c400] px-3 py-1"
                    onClick={() => void copySummary(report.summaryText)}
                    type="button"
                  >
                    Copy Summary
                  </button>
                  <button
                    className="rounded border border-rose-400 px-3 py-1 text-rose-300"
                    onClick={() => {
                      deleteFromHistory(report.id);
                      refreshHistory();
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
