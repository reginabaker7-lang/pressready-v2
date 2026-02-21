export const REPORT_HISTORY_KEY = "pressready_history_v1";
const MAX_REPORT_HISTORY_ITEMS = 10;

export type CheckStatus = "Pass" | "Warning" | "Error";

export type ResultCard = {
  title: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
};

export type ReportInputs = {
  printWidthIn: number;
  shirtColor: "Light" | "Dark";
  whiteInk: boolean;
  imageWidthPx: number;
  imageHeightPx: number;
};

export type StoredReport = {
  id: string;
  createdAt: string;
  fileName: string;
  inputs: ReportInputs;
  results: ResultCard[];
};

export const getReportHistory = (): StoredReport[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(REPORT_HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredReport[]) : [];
  } catch {
    return [];
  }
};

export const saveReportToHistory = (report: StoredReport): StoredReport[] => {
  const history = [report, ...getReportHistory()].slice(0, MAX_REPORT_HISTORY_ITEMS);
  window.localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(history));
  return history;
};

export const getLatestReport = (): StoredReport | null => {
  const history = getReportHistory();
  return history[0] ?? null;
};

export const getReportById = (id: string): StoredReport | null => {
  const history = getReportHistory();
  return history.find((item) => item.id === id) ?? null;
};
