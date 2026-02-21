"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "pass" | "warning" | "error";
type Result = { status: Status; title: string; detail?: string; fix?: string };

type Report = {
  id: string;
  createdAt: string;
  fileName?: string;
  imageWidthPx?: number;
  imageHeightPx?: number;
  printWidthIn?: number;
  shirtColor?: "light" | "dark";
  whiteInk?: boolean;
  results: Result[];
};

export default function ReportClient() {
  const searchParams = useSearchParams();
  const latest = searchParams.get("latest");

  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pressready_report_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Report;
      setTimeout(() => setReport(parsed), 0);
    } catch {
      // Ignore malformed local storage data.
    }
  }, [latest]);

  const createdAt = report?.createdAt;

  const createdLabel = useMemo(() => {
    if (!createdAt) return "";
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? createdAt : d.toLocaleString();
  }, [createdAt]);

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] p-6 text-[#f5c400]">
        <h1 className="mb-2 text-2xl font-bold">PressReady — DTF Readiness Report</h1>
        <p className="mb-6 text-[#f5c400]/80">No saved report found yet.</p>
        <Link href="/check" className="inline-flex rounded-xl bg-[#f5c400] px-4 py-2 font-semibold text-black">
          Back to Check
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] p-6 text-[#f5c400]">
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link href="/check" className="inline-flex rounded-xl bg-[#f5c400] px-4 py-2 font-semibold text-black">
          Back to Check
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex rounded-xl border border-[#f5c400] px-4 py-2 font-semibold text-[#f5c400]"
          type="button"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl rounded-2xl bg-white p-6 text-black">
        <h1 className="mb-1 text-2xl font-extrabold">PressReady — DTF Readiness Report</h1>
        <p className="mb-4 text-sm text-black/70">
          {createdLabel}
          {report.fileName ? ` • ${report.fileName}` : ""}
        </p>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info label="Image size" value={`${report.imageWidthPx ?? "—"}×${report.imageHeightPx ?? "—"} px`} />
          <Info label="Print width" value={`${report.printWidthIn ?? "—"} in`} />
          <Info label="Shirt color" value={report.shirtColor ?? "—"} />
          <Info label="White ink" value={typeof report.whiteInk === "boolean" ? (report.whiteInk ? "Yes" : "No") : "—"} />
        </div>

        <h2 className="mb-3 text-lg font-bold">Results</h2>
        <div className="space-y-3">
          {report.results?.map((r, idx) => (
            <div key={idx} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{r.title}</div>
                <Badge status={r.status} />
              </div>
              {r.detail ? <div className="mt-1 text-sm text-black/70">{r.detail}</div> : null}
              {r.fix ? (
                <div className="mt-2 text-sm">
                  <span className="font-semibold">Fix:</span> {r.fix}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-black/60">Tip: In the print dialog, choose “Save as PDF”.</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-black/60">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: Status }) {
  const text = status === "pass" ? "PASS" : status === "warning" ? "WARNING" : "ERROR";
  return <span className="rounded-full border px-2 py-1 text-xs font-bold">{text}</span>;
}
