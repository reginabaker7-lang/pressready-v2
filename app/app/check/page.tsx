"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { saveReportToHistory, type StoredReport, type StoredShirtColor, type StoredStatus } from "@/app/lib/report-history";

type ShirtColor = "Light" | "Dark";
type CheckStatus = "Pass" | "Warning" | "Error";
type ResultCard = {
  title: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
};

const statusClasses: Record<CheckStatus, string> = {
  Pass: "border-emerald-400 text-emerald-300",
  Warning: "border-amber-400 text-amber-300",
  Error: "border-rose-400 text-rose-300",
};

export default function DesignCheckPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageWidthPx, setImageWidthPx] = useState<number | null>(null);
  const [imageHeightPx, setImageHeightPx] = useState<number | null>(null);
  const [printWidthIn, setPrintWidthIn] = useState<number>(12);
  const [shirtColor, setShirtColor] = useState<ShirtColor>("Dark");
  const [whiteInk, setWhiteInk] = useState<boolean>(true);
  const [results, setResults] = useState<ResultCard[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  const acceptedTypes = useMemo(
    () => ["image/png", "image/jpeg", "image/svg+xml"],
    [],
  );

  const getFileExtension = (name: string) =>
    name.split(".").pop()?.toLowerCase() ?? "";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch("/api/plan");
        const data = (await response.json()) as { plan?: "free" | "pro" };
        setPlan(data.plan ?? "free");
      } catch {
        setPlan("free");
      }
    };

    void loadPlan();
  }, []);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResults(null);

    if (!file) {
      setUploadedFile(null);
      setPreviewUrl(null);
      setImageWidthPx(null);
      setImageHeightPx(null);
      return;
    }

    const extension = getFileExtension(file.name);
    const validExtension = ["png", "jpg", "jpeg", "svg"].includes(extension);

    if (!acceptedTypes.includes(file.type) && !validExtension) {
      alert("Please upload a PNG, JPG/JPEG, or SVG file.");
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImageWidthPx(image.naturalWidth);
      setImageHeightPx(image.naturalHeight);
    };
    image.onerror = () => {
      setImageWidthPx(null);
      setImageHeightPx(null);
    };

    image.src = nextPreviewUrl;
    setUploadedFile(file);
    setPreviewUrl(nextPreviewUrl);
  };

  const runChecks = () => {
    if (!uploadedFile || !imageWidthPx || !imageHeightPx || printWidthIn <= 0) {
      return;
    }

    const extension = getFileExtension(uploadedFile.name);
    const isJpg =
      extension === "jpg" ||
      extension === "jpeg" ||
      uploadedFile.type === "image/jpeg";
    const effectiveDPI = imageWidthPx / printWidthIn;
    const roundedDPI = Math.round(effectiveDPI);

    const transparencyCard: ResultCard = isJpg
      ? {
          title: "Transparency check",
          status: "Warning",
          message: "JPG cannot be transparent.",
          suggestion:
            "Use PNG or SVG if you need transparent background areas.",
        }
      : {
          title: "Transparency check",
          status: "Pass",
          message: "OK (Transparency supported).",
        };

    const resolutionCard: ResultCard =
      effectiveDPI < 150
        ? {
            title: "Resolution (effective DPI)",
            status: "Error",
            message: `Effective DPI: ${roundedDPI}.`,
            suggestion:
              "Increase image pixel width or reduce print width to reach at least 220 DPI.",
          }
        : effectiveDPI < 220
          ? {
              title: "Resolution (effective DPI)",
              status: "Warning",
              message: `Effective DPI: ${roundedDPI}.`,
              suggestion: "For stronger print sharpness, target 220+ DPI.",
            }
          : {
              title: "Resolution (effective DPI)",
              status: "Pass",
              message: `Effective DPI: ${roundedDPI}.`,
            };

    const whiteInkCard: ResultCard =
      shirtColor === "Dark" && !whiteInk
        ? {
            title: "Dark shirt + white ink",
            status: "Error",
            message: "High risk: no white ink.",
            suggestion:
              "Enable white ink for dark garments to preserve color vibrancy.",
          }
        : {
            title: "Dark shirt + white ink",
            status: "Pass",
            message: "Configuration looks safe for garment color.",
          };

    const detailCard: ResultCard =
      imageWidthPx < 2000
        ? {
            title: "Small details risk",
            status: "Warning",
            message: "May lose fine details when printed large.",
            suggestion:
              "Use a wider source image to better preserve intricate elements.",
          }
        : {
            title: "Small details risk",
            status: "Pass",
            message: "Pixel width is likely sufficient for finer details.",
          };

    const nextResults = [
      transparencyCard,
      resolutionCard,
      whiteInkCard,
      detailCard,
    ];
    setResults(nextResults);
    saveReport(nextResults);
  };

  const toStoredStatus = (status: CheckStatus): StoredStatus => {
    if (status === "Pass") {
      return "pass";
    }

    if (status === "Warning") {
      return "warning";
    }

    return "error";
  };

  const buildReport = (nextResults: ResultCard[]): StoredReport | null => {
    if (!uploadedFile || !imageWidthPx || !imageHeightPx || printWidthIn <= 0) {
      return null;
    }

    return {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      fileName: uploadedFile.name,
      imageWidthPx,
      imageHeightPx,
      printWidthIn,
      shirtColor: shirtColor.toLowerCase() as StoredShirtColor,
      whiteInk,
      results: nextResults.map((result) => ({
        status: toStoredStatus(result.status),
        title: result.title,
        detail: result.message,
        fix: result.suggestion,
      })),
    };
  };

  const saveReport = (nextResults: ResultCard[]): StoredReport | null => {
    const report = buildReport(nextResults);

    if (!report) {
      return null;
    }

    saveReportToHistory(localStorage, report);
    return report;
  };

  const handleCopySummary = async () => {
    if (!results || !uploadedFile || !imageWidthPx || !imageHeightPx) {
      return;
    }

    const summary = [
      "PressReady DTF Report",
      `File: ${uploadedFile.name}`,
      `Size: ${imageWidthPx}x${imageHeightPx} px`,
      `Print width: ${printWidthIn} in`,
      `Shirt: ${shirtColor.toLowerCase()} | White ink: ${whiteInk ? "yes" : "no"}`,
      ...results.map((result) => {
        const fixText = result.suggestion ? ` — Fix: ${result.suggestion}` : "";
        return `- ${result.status.toUpperCase()}: ${result.message}${fixText}`;
      }),
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!results) {
      return;
    }

    saveReport(results);
    router.push("/report?latest=1");
  };

  const canRunChecks = Boolean(
    uploadedFile && imageWidthPx && imageHeightPx && printWidthIn > 0,
  );

  return (
    <section className="space-y-8 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400] md:p-10">
      <Link
        className="inline-flex items-center text-sm font-semibold hover:underline"
        href="/"
      >
        ← Back to Home
      </Link>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Design Check</h1>
        <p className="max-w-3xl text-base text-[#f8df6d]">
          Upload your design and run a quick DTF readiness report before sending
          artwork to print.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-[#4a3f11] bg-[#151515] p-4">
          <h2 className="text-xl font-semibold">1) Upload</h2>
          <input
            accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
            className="w-full rounded border border-[#665716] bg-[#111] p-2 text-sm"
            onChange={handleFileChange}
            type="file"
          />
          {previewUrl && (
            <div className="space-y-3">
              <img
                alt="Uploaded design preview"
                className="h-44 w-44 rounded border border-[#665716] object-contain"
                src={previewUrl}
              />
              <p className="text-sm text-[#f8df6d]">
                Size: {imageWidthPx ?? "-"} x {imageHeightPx ?? "-"} px
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-[#4a3f11] bg-[#151515] p-4">
          <h2 className="text-xl font-semibold">2) Print Setup</h2>

          <label className="block space-y-2 text-sm">
            <span>Print width (inches)</span>
            <input
              className="w-full rounded border border-[#665716] bg-[#111] p-2"
              min={0.1}
              onChange={(e) => setPrintWidthIn(Number(e.target.value))}
              step={0.1}
              type="number"
              value={printWidthIn}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Shirt color</span>
            <select
              className="w-full rounded border border-[#665716] bg-[#111] p-2"
              onChange={(e) => setShirtColor(e.target.value as ShirtColor)}
              value={shirtColor}
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span>White ink</span>
            <select
              className="w-full rounded border border-[#665716] bg-[#111] p-2"
              onChange={(e) => setWhiteInk(e.target.value === "Yes")}
              value={whiteInk ? "Yes" : "No"}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>
        </div>
      </div>

      <button
        className="rounded border border-[#f5c400] px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canRunChecks}
        onClick={runChecks}
        type="button"
      >
        3) Run checks
      </button>

      {results && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">DTF Readiness Report</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold hover:bg-[#2b260e]"
              onClick={handleCopySummary}
              type="button"
            >
              Copy Summary
            </button>
            <button
              className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold hover:bg-[#2b260e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={plan !== "pro"}
              onClick={handleDownloadPdf}
              type="button"
            >
              {plan === "pro" ? "Download Report (PDF)" : "Download Report (Pro)"}
            </button>
            {copied && <p className="text-sm text-emerald-300">Copied!</p>}
            {plan !== "pro" ? (
              <p className="text-sm text-[#f8df6d]">PDF export is a Pro feature. <Link className="underline" href="/pricing">Upgrade</Link>.</p>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((result) => (
              <article
                className={`rounded-lg border bg-[#171717] p-4 ${statusClasses[result.status]}`}
                key={result.title}
              >
                <p className="text-xs font-bold uppercase tracking-wider">
                  {result.status}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#f5c400]">
                  {result.title}
                </h3>
                <p className="mt-2 text-sm text-[#f5e7ab]">{result.message}</p>
                {result.suggestion && (
                  <p className="mt-2 text-sm text-[#f8df6d]">
                    Fix: {result.suggestion}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
