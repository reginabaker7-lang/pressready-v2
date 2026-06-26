"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import {
  saveReportToHistory,
  type StoredReport,
  type StoredShirtColor,
  type StoredStatus,
} from "@/app/lib/report-history";
import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";

type ShirtColor = "Light" | "Dark";
type CheckStatus = "Pass" | "Warning" | "Needs Fix";
type ResultCard = {
  title: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
};


const readDpiFromFile = async (file: File): Promise<number | null> => {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
    for (let offset = 8; offset + 12 < view.byteLength; ) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7),
      );
      if (type === "pHYs" && offset + 21 <= view.byteLength) {
        const pixelsPerMeterX = view.getUint32(offset + 8);
        const unit = view.getUint8(offset + 16);
        return unit === 1 ? Math.round(pixelsPerMeterX * 0.0254) : null;
      }
      offset += 12 + length;
    }
  }

  if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) {
    if (view.getUint16(0) !== 0xffd8) return null;
    for (let offset = 2; offset + 9 < view.byteLength; ) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const length = view.getUint16(offset + 2);
      if (marker === 0xe0 && offset + 14 < view.byteLength) {
        const id = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7),
          view.getUint8(offset + 8),
        );
        const unit = view.getUint8(offset + 11);
        const xDensity = view.getUint16(offset + 12);
        if (id === "JFIF\0" && unit === 1 && xDensity > 0) return xDensity;
        if (id === "JFIF\0" && unit === 2 && xDensity > 0) return Math.round(xDensity * 2.54);
      }
      offset += 2 + length;
    }
  }

  return null;
};

type ArtworkSignals = {
  hasTransparentPixels: boolean;
  hasWhiteEdgeRisk: boolean;
  hasTinyHighContrastDetails: boolean;
  hasThinLineRisk: boolean;
  blurScore: number | null;
};

const analyzeArtworkPixels = async (imageUrl: string): Promise<ArtworkSignals | null> => {
  const image = new window.Image();
  image.src = imageUrl;
  await image.decode();

  const sampleWidth = Math.min(320, image.naturalWidth);
  const sampleHeight = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let transparent = 0;
  let whiteEdge = 0;
  let edgeSamples = 0;
  let highContrastTiny = 0;
  let thinRuns = 0;
  const gray = new Uint8ClampedArray(sampleWidth * sampleHeight);

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const idx = (y * sampleWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      gray[y * sampleWidth + x] = lum;
      if (a < 250) transparent += 1;
      if (x < 8 || y < 8 || x >= sampleWidth - 8 || y >= sampleHeight - 8) {
        edgeSamples += 1;
        if (a > 245 && r > 245 && g > 245 && b > 245) whiteEdge += 1;
      }
      if (a > 245 && ((r < 40 && g < 40 && b < 40) || (r > 215 && g > 215 && b > 215))) {
        highContrastTiny += 1;
      }
    }
  }

  for (let y = 0; y < sampleHeight; y += 1) {
    let run = 0;
    for (let x = 0; x < sampleWidth; x += 1) {
      const lum = gray[y * sampleWidth + x];
      if (lum < 70) run += 1;
      else {
        if (run > 0 && run <= 2) thinRuns += 1;
        run = 0;
      }
    }
  }

  let laplacianTotal = 0;
  let laplacianCount = 0;
  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const center = gray[y * sampleWidth + x] * 4;
      const neighbors = gray[y * sampleWidth + x - 1] + gray[y * sampleWidth + x + 1] + gray[(y - 1) * sampleWidth + x] + gray[(y + 1) * sampleWidth + x];
      laplacianTotal += Math.abs(center - neighbors);
      laplacianCount += 1;
    }
  }

  return {
    hasTransparentPixels: transparent > sampleWidth * sampleHeight * 0.01,
    hasWhiteEdgeRisk: edgeSamples > 0 && whiteEdge / edgeSamples > 0.7 && transparent === 0,
    hasTinyHighContrastDetails: highContrastTiny > 0 && highContrastTiny / (sampleWidth * sampleHeight) < 0.08,
    hasThinLineRisk: thinRuns > sampleHeight * 0.25,
    blurScore: laplacianCount ? laplacianTotal / laplacianCount : null,
  };
};

const statusClasses: Record<CheckStatus, string> = {
  Pass: "border-emerald-400 text-emerald-300",
  Warning: "border-amber-400 text-amber-300",
  "Needs Fix": "border-rose-400 text-rose-300",
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
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [freeCheckUsageCount, setFreeCheckUsageCount] = useState(0);

  const acceptedTypes = useMemo(
    () => ["image/png", "image/jpeg", "image/svg+xml"],
    [],
  );

  const getFileExtension = (name: string) =>
    name.split(".").pop()?.toLowerCase() ?? "";

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch("/api/plan", { cache: "no-store" });
        if (!response.ok) {
          setAuthStatus("loading");
          return;
        }

        const data = (await response.json()) as {
          plan?: "free" | "pro";
          isSignedIn?: boolean;
          freeCheckUsageCount?: number;
        };
        setAuthStatus(data.isSignedIn ? "signed-in" : "signed-out");
        if (data.plan === "pro") {
          setPlan("pro");
          setFreeCheckUsageCount(0);
          return;
        }

        setPlan("free");
        if (typeof data.freeCheckUsageCount === "number") {
          setFreeCheckUsageCount(data.freeCheckUsageCount);
        }
      } catch {
        setPlan("free");
        setAuthStatus("loading");
      }
    };

    loadPlan();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isFreeLimitReached =
    plan !== "pro" && freeCheckUsageCount >= FREE_CHECK_LIMIT;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResults(null);
    setCheckMessage(null);

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
    const image = new window.Image();
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

  const runChecks = async () => {
    setCheckMessage(null);

    if (
      !uploadedFile ||
      !imageWidthPx ||
      !imageHeightPx ||
      printWidthIn <= 0 ||
      authStatus !== "signed-in"
    ) {
      if (authStatus === "signed-out") {
        setCheckMessage("Create a free PressReady account to use your 3 free checks.");
      }
      return;
    }

    try {
      const response = await fetch("/api/checks/consume", {
        method: "POST",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        allowed?: boolean;
        count?: number;
        message?: string;
        plan?: "free" | "pro";
      };

      if (response.status === 401) {
        setCheckMessage(payload.message ?? "Create a free PressReady account to use your 3 free checks.");
        router.push("/sign-in");
        return;
      }

      if (!response.ok || payload.allowed === false) {
        setCheckMessage(
          payload.message ?? "You’ve used your 3 free design checks. Upgrade to Pro for unlimited DTF readiness checks, saved reports, and faster print prep.",
        );
        return;
      }

      if (payload.plan === "pro") {
        setPlan("pro");
        setFreeCheckUsageCount(0);
      } else if (typeof payload.count === "number") {
        setPlan("free");
        setFreeCheckUsageCount(payload.count);
      }
    } catch {
      setCheckMessage("Unable to run your check right now. Please try again.");
      return;
    }

    const extension = getFileExtension(uploadedFile.name);
    const isJpg =
      extension === "jpg" ||
      extension === "jpeg" ||
      uploadedFile.type === "image/jpeg";
    const isSvg = extension === "svg" || uploadedFile.type === "image/svg+xml";
    const effectiveDPI = imageWidthPx / printWidthIn;
    const roundedDPI = Math.round(effectiveDPI);
    const suggestedPrintWidth = Math.max(0.1, imageWidthPx / 220);
    const dpiMetadata = isSvg ? null : await readDpiFromFile(uploadedFile).catch(() => null);
    const pixelSignals =
      previewUrl && !isSvg ? await analyzeArtworkPixels(previewUrl).catch(() => null) : null;

    const transparencyCard: ResultCard = isSvg
      ? {
          title: "Transparent background",
          status: "Warning",
          message: "SVG transparency needs manual review in the final artwork file.",
          suggestion: "Open the SVG on a checkerboard background before sending to print.",
        }
      : isJpg
        ? {
            title: "Transparent background",
            status: "Needs Fix",
            message: "JPG files do not support transparent backgrounds.",
            suggestion: "Upload a PNG or SVG with transparent background areas for DTF artwork.",
          }
        : pixelSignals?.hasTransparentPixels
          ? {
              title: "Transparent background",
              status: "Pass",
              message: "Transparent pixels were detected.",
            }
          : {
              title: "Transparent background",
              status: "Warning",
              message: "No transparent pixels were detected, so the background may print.",
              suggestion: "If the artwork should not have a background, export a transparent PNG.",
            };

    const whiteBoxCard: ResultCard = pixelSignals?.hasWhiteEdgeRisk
      ? {
          title: "White box risk",
          status: "Warning",
          message: "Possible white background or white box detected around the artwork.",
          suggestion: "Review the file on a dark checkerboard and remove any unwanted white rectangle.",
        }
      : {
          title: "White box risk",
          status: "Pass",
          message: "No obvious white box was detected in the browser preview.",
        };

    const resolutionCard: ResultCard =
      effectiveDPI < 150
        ? {
            title: "Image resolution",
            status: "Needs Fix",
            message: `Effective resolution is about ${roundedDPI} DPI at ${printWidthIn} in wide.`,
            suggestion: "Increase image pixel width or reduce print width to reach at least 220 DPI.",
          }
        : effectiveDPI < 220
          ? {
              title: "Image resolution",
              status: "Warning",
              message: `Effective resolution is about ${roundedDPI} DPI at ${printWidthIn} in wide.`,
              suggestion: "For stronger print sharpness, target 220+ DPI.",
            }
          : {
              title: "Image resolution",
              status: "Pass",
              message: `Effective resolution is about ${roundedDPI} DPI at ${printWidthIn} in wide.`,
            };

    const dpiCard: ResultCard = dpiMetadata
      ? {
          title: "DPI metadata",
          status: dpiMetadata >= 220 ? "Pass" : "Warning",
          message: `File metadata reports ${dpiMetadata} DPI. Effective print DPI is more important than metadata.`,
          suggestion: dpiMetadata >= 220 ? undefined : "Confirm the intended print size before production.",
        }
      : {
          title: "DPI metadata",
          status: "Warning",
          message: "DPI metadata was not available or could not be read in the browser.",
          suggestion: "Use the effective resolution result above and manually confirm DPI if your print workflow requires it.",
        };

    const smallTextCard: ResultCard = pixelSignals?.hasTinyHighContrastDetails
      ? {
          title: "Small text warning",
          status: "Warning",
          message: "Possible small text or tiny high-contrast details were detected.",
          suggestion: "Manually review small lettering at final print size before approving.",
        }
      : {
          title: "Small text warning",
          status: "Pass",
          message: "No obvious small text risk was detected in the browser preview.",
        };

    const thinLineCard: ResultCard = pixelSignals?.hasThinLineRisk
      ? {
          title: "Thin line warning",
          status: "Warning",
          message: "Possible very thin line art was detected.",
          suggestion: "Manually review fine strokes and consider thickening lines for DTF printing.",
        }
      : {
          title: "Thin line warning",
          status: "Pass",
          message: "No obvious thin line risk was detected in the browser preview.",
        };

    const blurCard: ResultCard =
      pixelSignals?.blurScore !== null && pixelSignals?.blurScore !== undefined && pixelSignals.blurScore < 8
        ? {
            title: "Blurry / low-quality warning",
            status: "Warning",
            message: "Possible blur or low-detail artwork was detected.",
            suggestion: "Review at 100% zoom and upload a sharper source file if edges look soft.",
          }
        : {
            title: "Blurry / low-quality warning",
            status: "Pass",
            message: "No obvious blur was detected in the browser preview.",
          };

    const suggestedSizeCard: ResultCard = {
      title: "Suggested print size",
      status: suggestedPrintWidth >= printWidthIn ? "Pass" : "Warning",
      message: `Suggested maximum width for about 220 DPI is ${suggestedPrintWidth.toFixed(1)} in. Current width is ${printWidthIn} in.`,
      suggestion: suggestedPrintWidth >= printWidthIn ? undefined : `Reduce print width to about ${suggestedPrintWidth.toFixed(1)} in or upload a larger file.`,
    };

    const preScoreResults = [
      transparencyCard,
      whiteBoxCard,
      resolutionCard,
      dpiCard,
      smallTextCard,
      thinLineCard,
      blurCard,
      suggestedSizeCard,
    ];
    const score = Math.max(0, 100 - preScoreResults.reduce((total, result) => {
      if (result.status === "Needs Fix") return total + 25;
      if (result.status === "Warning") return total + 10;
      return total;
    }, 0));
    const scoreCard: ResultCard = {
      title: "PressReady score",
      status: score >= 85 ? "Pass" : score >= 60 ? "Warning" : "Needs Fix",
      message: `${score}/100 based on browser-detectable DTF readiness checks.`,
      suggestion: score >= 85 ? "Artwork looks ready for normal review." : "Review the warnings and fix any Needs Fix items before production.",
    };

    const nextResults = [...preScoreResults, scoreCard];


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
    uploadedFile &&
      imageWidthPx &&
      imageHeightPx &&
      printWidthIn > 0 &&
      authStatus !== "loading"
  );

  return (
    <section className="max-w-full space-y-8 overflow-hidden rounded-xl bg-[#0b0b0b] p-4 text-[#f5c400] sm:p-6 md:p-10">
      <Link
        className="inline-flex items-center text-sm font-semibold hover:underline"
        href="/"
      >
        ← Back to Home
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Design Check</h1>
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
            className="w-full rounded border border-[#665716] bg-[#111] p-3 text-base file:mr-3 file:rounded file:border-0 file:bg-[#f5c400] file:px-3 file:py-2 file:font-semibold file:text-black sm:text-sm"
            onChange={handleFileChange}
            type="file"
          />
          {previewUrl && (
            <div className="space-y-3">
              <NextImage
                alt="Uploaded design preview"
                className="h-44 w-44 rounded border border-[#665716] object-contain"
                height={176}
                src={previewUrl}
                unoptimized
                width={176}
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
              className="min-h-11 w-full rounded border border-[#665716] bg-[#111] p-3 text-base"
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
              className="min-h-11 w-full rounded border border-[#665716] bg-[#111] p-3 text-base"
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
              className="min-h-11 w-full rounded border border-[#665716] bg-[#111] p-3 text-base"
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
        className="min-h-11 w-full rounded border border-[#f5c400] px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        disabled={!canRunChecks}
        onClick={runChecks}
        type="button"
      >
        3) Run checks
      </button>
      {checkMessage && (
        <p className="text-sm text-[#f8df6d]">{checkMessage}</p>
      )}
      {isFreeLimitReached && (
        <div className="space-y-3 rounded-lg border border-[#665716] bg-[#151515] p-4">
          <p className="text-sm text-[#f8df6d]">
            You’ve used your 3 free design checks. Upgrade to Pro for unlimited DTF readiness checks, saved reports, and faster print prep.
          </p>
          <Link
            className="inline-flex min-h-11 items-center rounded border border-[#f5c400] px-4 py-3 text-sm font-semibold hover:bg-[#2b260e]"
            href="/pricing"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {results && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">DTF Readiness Report</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="min-h-11 rounded border border-[#f5c400] px-4 py-3 text-sm font-semibold hover:bg-[#2b260e]"
              onClick={handleCopySummary}
              type="button"
            >
              Copy Summary
            </button>
            <button
              className="min-h-11 rounded border border-[#f5c400] px-4 py-3 text-sm font-semibold hover:bg-[#2b260e]"
              onClick={handleDownloadPdf}
              type="button"
            >
              Download Report (PDF)
            </button>
            {copied && <p className="text-sm text-emerald-300">Copied!</p>}
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {results.map((result) => (
              <article
                className={`min-w-0 rounded-lg border bg-[#171717] p-4 ${statusClasses[result.status]}`}
                key={result.title}
              >
                <p className="text-xs font-bold uppercase tracking-wider">
                  {result.status}
                </p>
                <h3 className="mt-1 break-words text-lg font-semibold text-[#f5c400]">
                  {result.title}
                </h3>
                <p className="mt-2 break-words text-sm text-[#f5e7ab]">{result.message}</p>
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
