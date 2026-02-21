"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { StoredReport, StoredReportResult, StoredStatus, saveToHistory } from "../lib/history";

type ShirtColor = "Light" | "Dark";

const statusClasses: Record<StoredStatus, string> = {
  PASS: "border-emerald-400 text-emerald-300",
  WARN: "border-amber-400 text-amber-300",
  FAIL: "border-rose-400 text-rose-300",
};

export default function DesignCheckPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageWidthPx, setImageWidthPx] = useState<number | null>(null);
  const [imageHeightPx, setImageHeightPx] = useState<number | null>(null);
  const [printWidthIn, setPrintWidthIn] = useState<number>(12);
  const [shirtColor, setShirtColor] = useState<ShirtColor>("Dark");
  const [whiteInk, setWhiteInk] = useState<boolean>(true);
  const [results, setResults] = useState<StoredReportResult[] | null>(null);
  const [latestReportId, setLatestReportId] = useState<string | null>(null);

  const acceptedTypes = useMemo(() => ["image/png", "image/jpeg", "image/svg+xml"], []);

  const getFileExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
    const isJpg = extension === "jpg" || extension === "jpeg" || uploadedFile.type === "image/jpeg";
    const effectiveDPI = imageWidthPx / printWidthIn;
    const roundedDPI = Math.round(effectiveDPI);

    const transparencyCard: StoredReportResult = isJpg
      ? {
          title: "Transparency check",
          status: "WARN",
          message: "JPG cannot be transparent.",
          details: ["Use PNG or SVG if you need transparent background areas."],
        }
      : {
          title: "Transparency check",
          status: "PASS",
          message: "OK (Transparency supported).",
        };

    const resolutionCard: StoredReportResult =
      effectiveDPI < 150
        ? {
            title: "Resolution (effective DPI)",
            status: "FAIL",
            message: `Effective DPI: ${roundedDPI}.`,
            details: ["Increase image pixel width or reduce print width to reach at least 220 DPI."],
          }
        : effectiveDPI < 220
          ? {
              title: "Resolution (effective DPI)",
              status: "WARN",
              message: `Effective DPI: ${roundedDPI}.`,
              details: ["For stronger print sharpness, target 220+ DPI."],
            }
          : {
              title: "Resolution (effective DPI)",
              status: "PASS",
              message: `Effective DPI: ${roundedDPI}.`,
            };

    const whiteInkCard: StoredReportResult =
      shirtColor === "Dark" && !whiteInk
        ? {
            title: "Dark shirt + white ink",
            status: "FAIL",
            message: "High risk: no white ink.",
            details: ["Enable white ink for dark garments to preserve color vibrancy."],
          }
        : {
            title: "Dark shirt + white ink",
            status: "PASS",
            message: "Configuration looks safe for garment color.",
          };

    const detailCard: StoredReportResult =
      imageWidthPx < 2000
        ? {
            title: "Small details risk",
            status: "WARN",
            message: "May lose fine details when printed large.",
            details: ["Use a wider source image to better preserve intricate elements."],
          }
        : {
            title: "Small details risk",
            status: "PASS",
            message: "Pixel width is likely sufficient for finer details.",
          };

    const nextResults = [transparencyCard, resolutionCard, whiteInkCard, detailCard];
    const overallStatus: StoredStatus = nextResults.some((item) => item.status === "FAIL")
      ? "FAIL"
      : nextResults.some((item) => item.status === "WARN")
        ? "WARN"
        : "PASS";
    const generatedAt = new Date().toISOString();
    const report: StoredReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: uploadedFile.name,
      status: overallStatus,
      generatedAt,
      results: nextResults,
      summaryText: [
        `Report: ${uploadedFile.name}`,
        `Generated: ${new Date(generatedAt).toLocaleString()}`,
        ...nextResults.map(
          (item) =>
            `${item.status} - ${item.title}${item.message ? `: ${item.message}` : ""}${
              item.details?.length ? ` (${item.details.join("; ")})` : ""
            }`,
        ),
      ].join("\n"),
      meta: {
        imageSize: `${imageWidthPx}×${imageHeightPx}px`,
        printWidthIn,
        shirtColor,
        whiteInk,
      },
    };

    saveToHistory(report);
    setLatestReportId(report.id);
    setResults(nextResults);
  };

  const canRunChecks = Boolean(uploadedFile && imageWidthPx && imageHeightPx && printWidthIn > 0);

  return (
    <section className="space-y-8 rounded-xl bg-[#0b0b0b] p-6 text-[#f5c400] md:p-10">
      <div className="flex flex-wrap items-center gap-4">
        <Link className="inline-flex items-center text-sm font-semibold hover:underline" href="/">
          ← Back to Home
        </Link>
        <Link className="inline-flex items-center text-sm font-semibold hover:underline" href="/history">
          View History
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Design Check</h1>
        <p className="max-w-3xl text-base text-[#f8df6d]">
          Upload your design and run a quick DTF readiness report before sending artwork to print.
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
          {latestReportId && (
            <p className="text-sm text-[#f8df6d]">
              <Link className="font-semibold underline" href={`/report?id=${latestReportId}`}>
                Open saved report
              </Link>
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((result) => (
              <article
                className={`rounded-lg border bg-[#171717] p-4 ${statusClasses[result.status]}`}
                key={result.title}
              >
                <p className="text-xs font-bold uppercase tracking-wider">{result.status}</p>
                <h3 className="mt-1 text-lg font-semibold text-[#f5c400]">{result.title}</h3>
                <p className="mt-2 text-sm text-[#f5e7ab]">{result.message}</p>
                {result.details?.map((detail) => (
                  <p className="mt-2 text-sm text-[#f8df6d]" key={detail}>
                    Fix: {detail}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
