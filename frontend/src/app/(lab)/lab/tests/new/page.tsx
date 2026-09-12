"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconClipboardCheck,
  IconLoader2,
  IconFileDescription,
  IconUpload,
  IconTrash,
} from "@tabler/icons-react";

import { qualityService } from "@/services/quality.service";
import { batchService } from "@/services/batch.service";
import type { CreateQualityPayload } from "@/types/quality";
import type { BatchItem, QualityGrade } from "@/types/batch";

const GRADES: {
  value: QualityGrade;
  label: string;
  description: string;
}[] = [
  {
    value: "GradeA",
    label: "Grade A",
    description: "Premium quality honey",
  },
  {
    value: "GradeB",
    label: "Grade B",
    description: "Good quality honey",
  },
  {
    value: "GradeC",
    label: "Grade C",
    description: "Acceptable quality honey",
  },
  {
    value: "Substandard",
    label: "Substandard",
    description: "Does not meet quality requirements",
  },
];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function NewQualityTestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramBatchId = searchParams.get("batchId") || "";

  const [batchId, setBatchId] = useState(paramBatchId);
  const [availableBatches, setAvailableBatches] = useState<BatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const [grade, setGrade] = useState<QualityGrade>("GradeA");
  const [moisturePercentage, setMoisturePercentage] = useState("");
  const [labReportHash, setLabReportHash] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadBatches() {
      try {
        const res = await batchService.getAll({ limit: 50 });
        if (isMounted) {
          // Filter to batches that are registered or created and not yet certified
          const uncertified = res.data.filter((b) => b.status !== "Certified");
          setAvailableBatches(uncertified.length > 0 ? uncertified : res.data);
        }
      } catch (err) {
        console.error("Failed to load batches for testing", err);
      } finally {
        if (isMounted) setLoadingBatches(false);
      }
    }
    loadBatches();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files are supported for laboratory certificates.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("Certificate file size must be under 10MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setFileError(null);

    const trimmedBatchId = batchId.trim();
    const moisture = Number(moisturePercentage);

    if (!trimmedBatchId) {
      setError("Batch ID is required.");
      return;
    }

    if (
      !Number.isFinite(moisture) ||
      moisture <= 0 ||
      moisture > 100
    ) {
      setError("Moisture percentage must be greater than 0 and at most 100.");
      return;
    }

    try {
      setSubmitting(true);
      let computedHash = labReportHash.trim();
      let certUrl: string | undefined = undefined;

      // 1. If a PDF certificate is attached, upload it first to obtain its SHA-256 hash
      if (selectedFile) {
        setSubmittingStatus("Uploading laboratory certificate PDF...");
        const base64Data = await readFileAsBase64(selectedFile);
        const certRes = await batchService.uploadCertificate(trimmedBatchId, {
          fileName: selectedFile.name,
          fileData: base64Data,
        });

        if (certRes.labReportHash) {
          computedHash = certRes.labReportHash;
        }
        if (certRes.labReportUrl) {
          certUrl = certRes.labReportUrl;
        }
      }

      setSubmittingStatus("Registering quality certification on ledger...");

      const payload: CreateQualityPayload = {
        grade,
        moisturePercentage: moisture,
        ...(computedHash ? { labReportHash: computedHash } : {}),
        ...((reportNotes.trim() || certUrl)
          ? {
              labReportData: {
                ...(reportNotes.trim() ? { notes: reportNotes.trim() } : {}),
                ...(certUrl ? { certificateUrl: certUrl } : {}),
              },
            }
          : {}),
      };

      await qualityService.create(trimmedBatchId, payload);

      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Unable to submit the quality certification.");
      setError(msg);
    } finally {
      setSubmitting(false);
      setSubmittingStatus("");
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="rounded-3xl border border-emerald-600/20 bg-emerald-600/5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
            <IconCheck size={30} />
          </div>

          <p className="mt-6 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Certification submitted
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Quality test recorded successfully
          </h1>

          <p className="mt-3 text-sm text-black/50 dark:text-white/50">
            Batch{" "}
            <span className="font-mono font-medium text-black dark:text-white">
              {batchId}
            </span>{" "}
            has been certified with a {grade} quality grade.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/lab/tests"
              className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              Back to tests
            </Link>

            <Link
              href={`/verify/${encodeURIComponent(batchId)}`}
              className="rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
            >
              View verified batch
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab/tests"
          className="inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          <IconArrowLeft size={16} />
          Back to quality tests
        </Link>

        <div className="mt-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconClipboardCheck size={24} />
          </div>

          <div>
            <p className="text-sm font-medium text-honey">
              Laboratory Certification
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              New Quality Test
            </h1>

            <p className="mt-2 text-sm text-black/50 dark:text-white/50">
              Record the laboratory quality assessment and upload supporting assay certificates for a honey batch.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Batch */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-5">
            <h2 className="font-semibold">Batch Information</h2>
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              Select an existing registered batch or enter its ID manually.
            </p>
          </div>

          {availableBatches.length > 0 && (
            <div className="mb-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Select Pending Batch
                </span>
                <select
                  value={availableBatches.some((b) => b.batchId === batchId) ? batchId : ""}
                  onChange={(e) => {
                    if (e.target.value) setBatchId(e.target.value);
                  }}
                  className="w-full rounded-xl border border-black/10 bg-paper px-4 py-3 text-sm text-black outline-none transition focus:border-honey dark:border-white/10 dark:bg-paper-dark dark:text-white"
                >
                  <option value="">-- Choose from available batches --</option>
                  {availableBatches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} - {b.floralOrigin} ({(b.quantityKg ?? (b.quantityGrams / 1000)).toFixed(1)} kg) [{b.status}]
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Batch ID <span className="text-red-500">*</span>
            </span>

            <input
              type="text"
              required
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              placeholder="e.g. HC-2026-0001"
              className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:placeholder:text-white/25"
            />
          </label>
        </section>

        {/* Quality */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-5">
            <h2 className="font-semibold">Quality Assessment</h2>
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              Select the laboratory-assigned honey quality grade.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {GRADES.map((item) => {
              const selected = grade === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setGrade(item.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-honey bg-honey/10"
                      : "border-black/10 hover:bg-black/3 dark:border-white/10 dark:hover:bg-white/3"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.label}</span>

                    <span
                      className={`h-4 w-4 rounded-full border ${
                        selected
                          ? "border-honey bg-honey ring-4 ring-honey/10"
                          : "border-black/20 dark:border-white/20"
                      }`}
                    />
                  </div>

                  <p className="mt-1 text-xs text-black/45 dark:text-white/45">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Moisture Percentage <span className="text-red-500">*</span>
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required
                  value={moisturePercentage}
                  onChange={(event) =>
                    setMoisturePercentage(event.target.value)
                  }
                  placeholder="e.g. 18.5"
                  className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:placeholder:text-white/25"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-black/40 dark:text-white/40">
                  %
                </span>
              </div>

              <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                Standard honey moisture is normally below 20.0% (Codex Alimentarius compliant).
              </p>
            </label>
          </div>
        </section>

        {/* Certificate PDF Upload */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-5">
            <h2 className="font-semibold">Laboratory Certificate Document</h2>
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              Upload the signed lab analysis report (PDF format, up to 10MB).
            </p>
          </div>

          {!selectedFile ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 p-6 transition hover:border-honey/60 hover:bg-honey/5 dark:border-white/15 dark:hover:border-honey/60">
              <IconUpload size={28} className="text-black/40 dark:text-white/40" />
              <span className="mt-2 text-sm font-medium text-black/70 dark:text-white/70">
                Click or drop PDF certificate here
              </span>
              <span className="mt-1 text-xs text-black/40 dark:text-white/40">
                PDF files only, up to 10MB
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-honey/30 bg-honey/5 p-4">
              <div className="flex items-center gap-3">
                <IconFileDescription size={28} className="text-honey" />
                <div>
                  <p className="text-sm font-medium text-black dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-2 text-black/50 transition hover:bg-black/5 hover:text-red-500 dark:text-white/50 dark:hover:bg-white/5"
                aria-label="Remove certificate"
              >
                <IconTrash size={18} />
              </button>
            </div>
          )}

          {fileError && (
            <p className="mt-2 text-xs text-red-500">{fileError}</p>
          )}
        </section>

        {/* Report Details */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-5">
            <h2 className="font-semibold">Additional Details</h2>
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              Optional report hash and laboratory notes.
            </p>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Report Hash
                <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">
                  (Auto-computed if PDF attached)
                </span>
              </span>

              <input
                type="text"
                value={labReportHash}
                onChange={(event) => setLabReportHash(event.target.value)}
                placeholder="0x... or sha256 hash"
                className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 font-mono text-sm outline-none transition placeholder:font-sans placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:placeholder:text-white/25"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Inspection Notes
                <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">
                  Optional
                </span>
              </span>

              <textarea
                value={reportNotes}
                onChange={(event) => setReportNotes(event.target.value)}
                rows={4}
                placeholder="Add sensory, pollen analysis, or sucrose ratio observations..."
                className="w-full resize-none rounded-xl border border-black/10 bg-transparent px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:placeholder:text-white/25"
              />
            </label>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link
            href="/lab/tests"
            className="rounded-xl border border-black/10 px-5 py-3 text-center text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <IconLoader2 size={18} className="animate-spin" />
                <span>{submittingStatus || "Submitting..."}</span>
              </>
            ) : (
              <>
                <IconClipboardCheck size={18} />
                Submit Certification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewQualityTestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <IconLoader2 size={32} className="animate-spin text-honey" />
        </div>
      }
    >
      <NewQualityTestForm />
    </Suspense>
  );
}