export type StoredShirtColor = "light" | "dark";
export type StoredStatus = "pass" | "warning" | "error";

export type StoredReportResult = {
  status: StoredStatus;
  title: string;
  detail?: string;
  fix?: string;
  suggestion?: string | undefined;
};

export type StoredReport = {
  id: string;
  createdAt: string;
  fileName: string;
  imageWidthPx: number;
  imageHeightPx: number;
  printWidthIn: number;
  shirtColor: StoredShirtColor;
  whiteInk: boolean;
  results: StoredReportResult[];
};

export type StoredReportWithSummary = StoredReport & {
  summaryText: string;
};

type StoredReportHistory = {
  latestId: string | null;
  reports: StoredReport[];
};

export const REPORT_STORAGE_KEY = "pressready_report_v1";

const isStoredStatus = (value: unknown): value is StoredStatus =>
  value === "pass" || value === "warning" || value === "error";

const isStoredShirtColor = (value: unknown): value is StoredShirtColor =>
  value === "light" || value === "dark";

const sanitizeResult = (value: unknown): StoredReportResult | null => {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<StoredReportResult>;
  if (typeof candidate.title !== "string" || !isStoredStatus(candidate.status)) {
    return null;
  }

  return {
    status: candidate.status,
    title: candidate.title,
    detail: typeof candidate.detail === "string" ? candidate.detail : undefined,
    fix: typeof candidate.fix === "string" ? candidate.fix : undefined,
    suggestion: typeof candidate.suggestion === "string" ? candidate.suggestion : undefined,
  };
};

const sanitizeReport = (value: unknown): StoredReport | null => {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<StoredReport>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.imageWidthPx !== "number" ||
    typeof candidate.imageHeightPx !== "number" ||
    typeof candidate.printWidthIn !== "number" ||
    typeof candidate.whiteInk !== "boolean" ||
    !isStoredShirtColor(candidate.shirtColor)
  ) {
    return null;
  }

  const results = Array.isArray(candidate.results)
    ? candidate.results.map((result) => sanitizeResult(result)).filter((result): result is StoredReportResult => Boolean(result))
    : [];

  return {
    id: candidate.id,
    createdAt: candidate.createdAt,
    fileName: candidate.fileName,
    imageWidthPx: candidate.imageWidthPx,
    imageHeightPx: candidate.imageHeightPx,
    printWidthIn: candidate.printWidthIn,
    shirtColor: candidate.shirtColor,
    whiteInk: candidate.whiteInk,
    results,
  };
};

const statusLabelMap: Record<StoredStatus, string> = {
  pass: "PASS",
  warning: "WARN",
  error: "FAIL",
};

const buildSummaryText = (report: StoredReport): string =>
  [
    "PressReady DTF Report",
    report.fileName ? `File: ${report.fileName}` : null,
    report.imageWidthPx && report.imageHeightPx ? `Size: ${report.imageWidthPx}x${report.imageHeightPx} px` : null,
    report.printWidthIn ? `Print width: ${report.printWidthIn} in` : null,
    report.shirtColor ? `Shirt: ${report.shirtColor} | White ink: ${report.whiteInk ? "yes" : "no"}` : null,
    ...report.results.map((result) => {
      const fixText = result.fix ? ` — Fix: ${result.fix}` : "";
      const detailText = result.detail ? result.detail : result.title;
      return `- ${statusLabelMap[result.status]}: ${detailText}${fixText}`;
    }),
  ]
    .filter(Boolean)
    .join("\n");

export const readReportHistory = (storage: Storage): StoredReportHistory => {
  try {
    const raw = storage.getItem(REPORT_STORAGE_KEY);
    if (!raw) {
      return { latestId: null, reports: [] };
    }

    const parsed = JSON.parse(raw) as unknown;

    const singleReport = sanitizeReport(parsed);
    if (singleReport) {
      return { latestId: singleReport.id, reports: [singleReport] };
    }

    if (!parsed || typeof parsed !== "object") {
      return { latestId: null, reports: [] };
    }

    const payload = parsed as { latestId?: unknown; reports?: unknown };
    const reports = Array.isArray(payload.reports)
      ? payload.reports.map((report) => sanitizeReport(report)).filter((report): report is StoredReport => Boolean(report))
      : [];

    const latestId =
      typeof payload.latestId === "string" && reports.some((report) => report.id === payload.latestId)
        ? payload.latestId
        : reports[0]?.id ?? null;

    return { latestId, reports };
  } catch {
    return { latestId: null, reports: [] };
  }
};

export const loadHistory = (storage: Storage): StoredReportWithSummary[] =>
  readReportHistory(storage).reports.map((report) => ({
    ...report,
    summaryText: buildSummaryText(report),
  }));

export const saveReportToHistory = (storage: Storage, report: StoredReport): void => {
  const history = readReportHistory(storage);

  const normalizedReport: StoredReport = {
    ...report,
    results: report.results ?? [],
  };

  const reports = [normalizedReport, ...history.reports.filter((item) => item.id !== normalizedReport.id)].slice(0, 20);

  storage.setItem(
    REPORT_STORAGE_KEY,
    JSON.stringify({
      latestId: normalizedReport.id,
      reports,
    }),
  );
};

export const deleteFromHistory = (storage: Storage, id: string): void => {
  const history = readReportHistory(storage);
  const reports = history.reports.filter((report) => report.id !== id);
  const latestId = reports.some((report) => report.id === history.latestId) ? history.latestId : reports[0]?.id ?? null;

  storage.setItem(
    REPORT_STORAGE_KEY,
    JSON.stringify({
      latestId,
      reports,
    }),
  );
};

export const clearHistory = (storage: Storage): void => {
  storage.removeItem(REPORT_STORAGE_KEY);
};

export const getReportFromHistory = (storage: Storage, params: { id?: string | null; latest?: string | null }): StoredReport | null => {
  const history = readReportHistory(storage);

  if (!history.reports.length) return null;

  if (params.id) {
    return history.reports.find((report) => report.id === params.id) ?? null;
  }

  if (params.latest === "1") {
    if (!history.latestId) return history.reports[0] ?? null;
    return history.reports.find((report) => report.id === history.latestId) ?? history.reports[0] ?? null;
  }

  if (history.latestId) {
    return history.reports.find((report) => report.id === history.latestId) ?? history.reports[0] ?? null;
  }

  return history.reports[0] ?? null;
};
