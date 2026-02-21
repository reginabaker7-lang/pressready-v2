"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StoredStatus = "pass" | "warning" | "error";

type StoredReportResult = {
  status: StoredStatus;
  title: string;
  detail?: string;
  fix?: string;
};

type StoredReport = {
  id: string;
  createdAt: string;
  fileName: string;
  imageWidthPx: number;
  imageHeightPx: number;
  printWidthIn: number;
  shirtColor: "light" | "dark";
  whiteInk: boolean;
  results: StoredReportResult[];
};

const REPORT_STORAGE_KEY = "pressready_report_v1";

const badgeClasses: Record<StoredStatus, string> = {
  pass: "border-emerald-600 bg-emerald-50 text-emerald-700",
  warning: "border-amber-500 bg-amber-50 text-amber-700",
  error: "border-rose-600 bg-rose-50 text-rose-700",
};

export default function ReportPage() {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REPORT_STORAGE_KEY);
      if (saved) {
        setReport(JSON.parse(saved) as StoredReport);
      }
    } catch {
      setReport(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  if (!loaded) {
    return <section className="rounded-xl bg-white p-6 text-black">Loading report...</section>;
  }

  if (!report) {
    return (
      <section className="space-y-4 rounded-xl bg-white p-6 text-black">
        <h1 className="text-2xl font-bold">PressReady — DTF Readiness Report</h1>
        <p className="text-gray-700">No saved report was found yet. Run checks first to generate one.</p>
        <div className="flex flex-wrap gap-3 print:hidden">
          <Link className="inline-flex rounded border border-black px-4 py-2 font-semibold" href="/check">
            Back to Check
          </Link>
          <button
            className="rounded border border-black px-4 py-2 font-semibold"
            onClick={() => window.print()}
            type="button"
          >
            Print / Save as PDF
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl bg-white p-6 text-black md:p-10 print:bg-white print:text-black">
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="inline-flex rounded border border-black px-4 py-2 font-semibold" href="/check">
          Back to Check
        </Link>
        <button
          className="rounded border border-black px-4 py-2 font-semibold"
          onClick={() => window.print()}
          type="button"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 text-black md:p-10 print:rounded-none print:p-0">
        <header className="space-y-1 border-b border-gray-300 pb-4">
          <h1 className="text-3xl font-bold">PressReady — DTF Readiness Report</h1>
          <p className="text-sm text-gray-700">Created: {new Date(report.createdAt).toLocaleString()}</p>
          <p className="text-sm text-gray-700">File: {report.fileName}</p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-gray-300 p-4">
            <h2 className="text-lg font-semibold">Inputs</h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Print width: {report.printWidthIn} in</li>
              <li>Shirt color: {report.shirtColor}</li>
              <li>White ink: {report.whiteInk ? "yes" : "no"}</li>
            </ul>
          </div>

          <div className="rounded border border-gray-300 p-4">
            <h2 className="text-lg font-semibold">Image</h2>
            <p className="mt-2 text-sm">
              Size: {report.imageWidthPx} × {report.imageHeightPx} px
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Results</h2>
          {report.results.map((result, index) => (
            <article className="rounded border border-gray-300 p-4" key={`${report.id}-${index}`}>
              <p
                className={`inline-flex rounded border px-2 py-0.5 text-xs font-bold uppercase ${badgeClasses[result.status]}`}
              >
                {result.status}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{result.title}</h3>
              {result.detail && <p className="mt-1 text-sm text-gray-800">{result.detail}</p>}
              {result.fix && <p className="mt-1 text-sm text-gray-800">Fix: {result.fix}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
