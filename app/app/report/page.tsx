"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ShirtColor = "Light" | "Dark";
type CheckStatus = "Pass" | "Warning" | "Error";

type ResultCard = {
  title: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
};

type StoredReport = {
  generatedAt: string;
  fileName: string;
  imageWidthPx: number;
  imageHeightPx: number;
  printWidthIn: number;
  shirtColor: ShirtColor;
  whiteInk: boolean;
  results: ResultCard[];
};

const REPORT_STORAGE_KEY = "pressready_report_v1";

const statusColors: Record<CheckStatus, string> = {
  Pass: "border-emerald-500 text-emerald-300",
  Warning: "border-amber-500 text-amber-300",
  Error: "border-rose-500 text-rose-300",
};

export default function ReportPage() {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);

  useEffect(() => {
    setShouldAutoPrint(new URLSearchParams(window.location.search).get("print") === "1");

    try {
      const raw = localStorage.getItem(REPORT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as StoredReport;
      setReport(parsed);
    } catch {
      setReport(null);
    }
  }, []);

  useEffect(() => {
    if (!report || !shouldAutoPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [report, shouldAutoPrint]);

  if (!report) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400]">
        <h1 className="text-3xl font-bold">Printable Report</h1>
        <p className="text-[#f8df6d]">No saved report found. Run checks on the Design Check page first.</p>
        <Link className="font-semibold underline" href="/check">
          Go to Design Check
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-xl border border-[#4a3f11] bg-[#090909] p-6 text-[#f5c400] print:rounded-none print:border-none print:bg-white print:text-black">
      <header className="space-y-2 border-b border-[#4a3f11] pb-4 print:border-black">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">PressReady</p>
        <h1 className="text-4xl font-bold">DTF Readiness Report</h1>
        <p className="text-sm text-[#f8df6d] print:text-black">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </p>
      </header>

      <div className="grid gap-3 text-sm text-[#f8df6d] print:text-black sm:grid-cols-2">
        <p>
          <span className="font-semibold text-[#f5c400] print:text-black">File:</span> {report.fileName}
        </p>
        <p>
          <span className="font-semibold text-[#f5c400] print:text-black">Image size:</span> {report.imageWidthPx} x {" "}
          {report.imageHeightPx} px
        </p>
        <p>
          <span className="font-semibold text-[#f5c400] print:text-black">Print width:</span> {report.printWidthIn} in
        </p>
        <p>
          <span className="font-semibold text-[#f5c400] print:text-black">Shirt color:</span> {report.shirtColor}
        </p>
        <p>
          <span className="font-semibold text-[#f5c400] print:text-black">White ink:</span> {report.whiteInk ? "Yes" : "No"}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Results</h2>
        <ul className="space-y-3">
          {report.results.map((result) => (
            <li className={`rounded-lg border bg-[#111] p-4 print:bg-white ${statusColors[result.status]}`} key={result.title}>
              <p className="text-xs font-bold uppercase tracking-[0.16em]">{result.status}</p>
              <h3 className="text-lg font-semibold text-[#f5c400] print:text-black">{result.title}</h3>
              <p className="text-sm text-[#f5e7ab] print:text-black">{result.message}</p>
              {result.suggestion && <p className="text-sm text-[#f8df6d] print:text-black">Fix: {result.suggestion}</p>}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex gap-3 print:hidden">
        <button
          className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold hover:bg-[#f5c400] hover:text-[#090909]"
          onClick={() => window.print()}
          type="button"
        >
          Print / Save as PDF
        </button>
        <Link className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold" href="/check">
          Back to Check
        </Link>
      </div>
    </section>
  );
}
