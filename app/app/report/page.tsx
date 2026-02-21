import { Suspense } from "react";

import ReportClient from "./report-client";

export default function ReportPage() {
  return (
    <Suspense fallback="Loading…">
      <ReportClient />
    </Suspense>
  );
}
