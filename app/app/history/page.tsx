"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getReportHistory } from "../lib/report-history";

export default function HistoryPage() {
  const history = useMemo(() => getReportHistory(), []);

  return (
    <section className="space-y-8 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400] md:p-10">
      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        <Link className="hover:underline" href="/">
          ← Back to Home
        </Link>
        <Link className="hover:underline" href="/check">
          Run New Check
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Report History</h1>
        <p className="max-w-3xl text-base text-[#f8df6d]">
          Your most recent reports are stored locally in this browser.
        </p>
      </header>

      {history.length === 0 ? (
        <p className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4 text-sm text-[#f8df6d]">
          No saved reports yet. Run a design check to generate your first report.
        </p>
      ) : (
        <ul className="space-y-3">
          {history.map((report) => (
            <li className="rounded-lg border border-[#4a3f11] bg-[#151515] p-4" key={report.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#f8df6d]">{report.fileName}</p>
                  <p className="text-xs text-[#e6cf67]">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <Link className="text-sm font-semibold underline" href={`/report?id=${report.id}`}>
                  View report
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
