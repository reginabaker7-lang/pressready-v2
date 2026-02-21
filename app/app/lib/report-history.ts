export type StoredShirtColor = "light" | "dark";
export type StoredStatus = "pass" | "warning" | "error";

export type StoredReportResult = {
  status: StoredStatus;
  title: string;
  detail?: string;
  fix?: string;
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

export const REPORT_STORAGE_KEY = "pressready_report_v1";
