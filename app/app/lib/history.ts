export type StoredStatus = "PASS" | "WARN" | "FAIL";

export type StoredReportResult = {
  title: string;
  status: StoredStatus;
  message?: string;
  details?: string[];
};

export type StoredReport = {
  id: string;
  title: string;
  status: StoredStatus;
  generatedAt: string;
  results: StoredReportResult[];
  summaryText: string;
  meta?: {
    imageSize?: string;
    printWidthIn?: number;
    shirtColor?: string;
    whiteInk?: boolean;
  };
  reportData?: unknown;
};

const HISTORY_KEY = "pressready.history.v1";
const LEGACY_KEY = "pressready_history_v1";
const MAX_HISTORY_ITEMS = 20;

const isClient = () => typeof window !== "undefined";

const normalizeStatus = (status: unknown): StoredStatus => {
  if (status === "PASS" || status === "WARN" || status === "FAIL") {
    return status;
  }

  if (status === "Pass") {
    return "PASS";
  }

  if (status === "Warning") {
    return "WARN";
  }

  return "FAIL";
};

const normalizeReport = (item: unknown): StoredReport | null => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Partial<StoredReport> & {
    createdAt?: string;
    fileName?: string;
    inputs?: {
      printWidthIn?: number;
      shirtColor?: string;
      whiteInk?: boolean;
      imageWidthPx?: number;
      imageHeightPx?: number;
    };
    results?: Array<{
      title?: string;
      status?: string;
      message?: string;
      suggestion?: string;
      details?: string[];
    }>;
  };

  const id = typeof candidate.id === "string" ? candidate.id : null;
  if (!id) {
    return null;
  }

  const generatedAt =
    typeof candidate.generatedAt === "string"
      ? candidate.generatedAt
      : typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString();

  const title =
    typeof candidate.title === "string"
      ? candidate.title
      : typeof candidate.fileName === "string"
        ? candidate.fileName
        : "Untitled Report";

  const results = Array.isArray(candidate.results)
    ? candidate.results
        .map((result) => {
          if (!result || typeof result !== "object" || typeof result.title !== "string") {
            return null;
          }

          const details = Array.isArray(result.details)
            ? result.details.filter((detail) => typeof detail === "string")
            : typeof result.suggestion === "string"
              ? [result.suggestion]
              : undefined;

          return {
            title: result.title,
            status: normalizeStatus(result.status),
            message: typeof result.message === "string" ? result.message : undefined,
            details,
          } satisfies StoredReportResult;
        })
        .filter((result): result is StoredReportResult => Boolean(result))
    : [];

  const summaryText =
    typeof candidate.summaryText === "string" && candidate.summaryText.trim().length > 0
      ? candidate.summaryText
      : [
          `Report: ${title}`,
          `Generated: ${new Date(generatedAt).toLocaleString()}`,
          ...results.map(
            (result) =>
              `${result.status} - ${result.title}${result.message ? `: ${result.message}` : ""}${
                result.details?.length ? ` (${result.details.join("; ")})` : ""
              }`,
          ),
        ].join("\n");

  const meta =
    candidate.meta && typeof candidate.meta === "object"
      ? candidate.meta
      : candidate.inputs
        ? {
            imageSize:
              typeof candidate.inputs.imageWidthPx === "number" && typeof candidate.inputs.imageHeightPx === "number"
                ? `${candidate.inputs.imageWidthPx}×${candidate.inputs.imageHeightPx}px`
                : undefined,
            printWidthIn: candidate.inputs.printWidthIn,
            shirtColor: candidate.inputs.shirtColor,
            whiteInk: candidate.inputs.whiteInk,
          }
        : undefined;

  const explicitStatus =
    candidate.status === "PASS" ||
    candidate.status === "WARN" ||
    candidate.status === "FAIL" ||
    candidate.status === "Pass" ||
    candidate.status === "Warning" ||
    candidate.status === "Error"
      ? normalizeStatus(candidate.status)
      : null;

  const status =
    explicitStatus ??
    (results.some((result) => result.status === "FAIL")
      ? "FAIL"
      : results.some((result) => result.status === "WARN")
        ? "WARN"
        : "PASS");

  return {
    id,
    title,
    status,
    generatedAt,
    results,
    summaryText,
    meta,
    reportData: candidate.reportData,
  };
};

const sortDesc = (reports: StoredReport[]) =>
  reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

const dedupeAndCap = (reports: StoredReport[]) => {
  const seen = new Set<string>();
  const deduped: StoredReport[] = [];

  for (const report of sortDesc(reports)) {
    const key = `${report.title}::${report.generatedAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(report);
    }

    if (deduped.length >= MAX_HISTORY_ITEMS) {
      break;
    }
  }

  return deduped;
};

const readRawHistory = (key: string): unknown[] => {
  if (!isClient()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (reports: StoredReport[]) => {
  if (!isClient()) {
    return;
  }

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(dedupeAndCap(reports)));
  } catch {
    // Ignore storage write errors in private mode/quota exceeded.
  }
};

export const migrateOldHistoryIfNeeded = () => {
  if (!isClient()) {
    return;
  }

  const currentItems = readRawHistory(HISTORY_KEY);
  const legacyItems = readRawHistory(LEGACY_KEY);

  if (legacyItems.length === 0) {
    if (currentItems.length > 0) {
      const normalized = dedupeAndCap(currentItems.map(normalizeReport).filter((item): item is StoredReport => Boolean(item)));
      writeHistory(normalized);
    }
    return;
  }

  const merged = dedupeAndCap(
    [...currentItems, ...legacyItems]
      .map(normalizeReport)
      .filter((item): item is StoredReport => Boolean(item)),
  );

  writeHistory(merged);

  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Ignore storage write errors.
  }
};

export const loadHistory = (): StoredReport[] => {
  if (!isClient()) {
    return [];
  }

  migrateOldHistoryIfNeeded();
  return dedupeAndCap(readRawHistory(HISTORY_KEY).map(normalizeReport).filter((item): item is StoredReport => Boolean(item)));
};

export const saveToHistory = (report: StoredReport): void => {
  if (!isClient()) {
    return;
  }

  const normalized = normalizeReport(report);
  if (!normalized) {
    return;
  }

  writeHistory([normalized, ...loadHistory()]);
};

export const deleteFromHistory = (id: string): void => {
  writeHistory(loadHistory().filter((item) => item.id !== id));
};

export const clearHistory = (): void => {
  if (!isClient()) {
    return;
  }

  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore storage write errors.
  }
};

export const getHistoryById = (id: string): StoredReport | null => loadHistory().find((item) => item.id === id) ?? null;

export const getLatestHistory = (): StoredReport | null => loadHistory()[0] ?? null;
