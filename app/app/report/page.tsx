import { Suspense } from "react";
import ReportClient from "./report-client";

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0b0b] p-6 text-[#f5c400]">Loading report…</div>}>
      <ReportClient />
    </Suspense>
  );
}
