import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createUserReport, getReportLimitStatus } from "@/app/lib/subscription";
import type { StoredReport } from "@/app/lib/report-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT_MESSAGE =
  "You have used all 3 free checks. Upgrade to Pro to continue.";

const isReportPayload = (value: unknown): value is StoredReport => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StoredReport>;
  const validShirtColor =
    candidate.shirtColor === "light" || candidate.shirtColor === "dark";
  const validResults = Array.isArray(candidate.results)
    ? candidate.results.every((result) => {
        if (!result || typeof result !== "object") return false;
        const item = result as StoredReport["results"][number];
        return (
          typeof item.title === "string" &&
          (item.status === "pass" ||
            item.status === "warning" ||
            item.status === "error") &&
          (typeof item.detail === "undefined" ||
            typeof item.detail === "string") &&
          (typeof item.fix === "undefined" || typeof item.fix === "string") &&
          (typeof item.suggestion === "undefined" ||
            typeof item.suggestion === "string")
        );
      })
    : false;

  return Boolean(
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.fileName === "string" &&
    typeof candidate.imageWidthPx === "number" &&
    typeof candidate.imageHeightPx === "number" &&
    typeof candidate.printWidthIn === "number" &&
    typeof candidate.whiteInk === "boolean" &&
    validShirtColor &&
    validResults,
  );
};

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { allowed: false, message: "Sign in required." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as { report?: unknown };
    const report = body.report;

    if (!isReportPayload(report)) {
      return NextResponse.json(
        { error: "Invalid report payload." },
        { status: 400 },
      );
    }

    const limitStatus = await getReportLimitStatus(userId);

    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          plan: limitStatus.plan,
          count: limitStatus.count,
          message: LIMIT_MESSAGE,
        },
        { status: 403 },
      );
    }

    const savedReport = await createUserReport(userId, report);

    return NextResponse.json(
      {
        allowed: true,
        plan: limitStatus.plan,
        count:
          limitStatus.plan === "pro"
            ? limitStatus.count
            : limitStatus.count + 1,
        report: savedReport,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create report";
    console.error("[reports:create] failed", { userId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
