export type ReportStatus = "PASS" | "WARN" | "FAIL";

export type StoredReportData = {
  fileName: string;
  imageWidthPx: number;
  imageHeightPx: number;
  printWidthIn: number;
  shirtColor: "light" | "dark";
  whiteInk: boolean;
  results: Array<{
    status: ReportStatus;
    title: string;
    detail?: string;
    fix?: string;
  }>;
};

export type StoredReport = {
  id: string;
  title: string;
  status: ReportStatus;
  generatedAt: string;
  summaryText: string;
  reportData: StoredReportData;
  thumb?: string;
};

export const REPORT_HISTORY_STORAGE_KEY = "pressready.history.v1";
const LEGACY_REPORT_STORAGE_KEY = "pressready_report_v1";
const MAX_HISTORY_ITEMS = 20;

function isStoredReport(candidate: unknown): candidate is StoredReport {
  if (!candidate || typeof candidate !== "object") return false;
  const report = candidate as Partial<StoredReport>;
  return (
    typeof report.id === "string" &&
    typeof report.title === "string" &&
    typeof report.status === "string" &&
    typeof report.generatedAt === "string" &&
    typeof report.summaryText === "string" &&
    !!report.reportData
  );
}

export function getHistory(): StoredReport[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(REPORT_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(REPORT_HISTORY_STORAGE_KEY);
      return [];
    }

    const filtered = parsed.filter(isStoredReport);
    if (filtered.length !== parsed.length) {
      localStorage.setItem(REPORT_HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    localStorage.removeItem(REPORT_HISTORY_STORAGE_KEY);
    return [];
  }
}

export function saveHistory(history: StoredReport[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REPORT_HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function addReportToHistory(report: StoredReport): StoredReport[] {
  const history = getHistory();
  const exists = history.some(
    (item) =>
      item.reportData.fileName === report.reportData.fileName &&
      item.generatedAt === report.generatedAt,
  );

  if (exists) {
    return history;
  }

  const nextHistory = [report, ...history].slice(0, MAX_HISTORY_ITEMS);
  saveHistory(nextHistory);
  return nextHistory;
}

export function getLatestReport(): StoredReport | null {
  return getHistory()[0] ?? null;
}

export function getReportById(id: string): StoredReport | null {
  return getHistory().find((report) => report.id === id) ?? null;
}

export function deleteReportById(id: string): StoredReport[] {
  const nextHistory = getHistory().filter((report) => report.id !== id);
  saveHistory(nextHistory);
  return nextHistory;
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REPORT_HISTORY_STORAGE_KEY);
}

export function migrateLegacyReport() {
  if (typeof window === "undefined") return;

  try {
    const legacyRaw = localStorage.getItem(LEGACY_REPORT_STORAGE_KEY);
    if (!legacyRaw) return;

    const parsed = JSON.parse(legacyRaw) as {
      id?: string;
      createdAt?: string;
      fileName?: string;
      imageWidthPx?: number;
      imageHeightPx?: number;
      printWidthIn?: number;
      shirtColor?: "light" | "dark";
      whiteInk?: boolean;
      results?: Array<{ status?: "pass" | "warning" | "error"; title?: string; detail?: string; fix?: string }>;
    };

    if (!parsed.fileName || !parsed.createdAt || !Array.isArray(parsed.results)) {
      localStorage.removeItem(LEGACY_REPORT_STORAGE_KEY);
      return;
    }

    const mappedResults = parsed.results.map((result) => ({
      status:
        result.status === "error"
          ? "FAIL"
          : result.status === "warning"
            ? "WARN"
            : "PASS",
      title: result.title ?? "Check",
      detail: result.detail,
      fix: result.fix,
    })) as StoredReportData["results"];

    const status: ReportStatus = mappedResults.some((result) => result.status === "FAIL")
      ? "FAIL"
      : mappedResults.some((result) => result.status === "WARN")
        ? "WARN"
        : "PASS";

    const migrated: StoredReport = {
      id: parsed.id ?? `${Date.now()}`,
      title: parsed.fileName,
      status,
      generatedAt: parsed.createdAt,
      summaryText: `PressReady DTF Report\nFile: ${parsed.fileName}`,
      reportData: {
        fileName: parsed.fileName,
        imageWidthPx: parsed.imageWidthPx ?? 0,
        imageHeightPx: parsed.imageHeightPx ?? 0,
        printWidthIn: parsed.printWidthIn ?? 0,
        shirtColor: parsed.shirtColor ?? "dark",
        whiteInk: parsed.whiteInk ?? true,
        results: mappedResults,
      },
    };

    addReportToHistory(migrated);
    localStorage.removeItem(LEGACY_REPORT_STORAGE_KEY);
  } catch {
    localStorage.removeItem(LEGACY_REPORT_STORAGE_KEY);
  }
}
