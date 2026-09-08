"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconClipboardCheck,
  IconLoader2,
} from "@tabler/icons-react";

import { qualityService } from "@/services/quality.service";
import type { CreateQualityPayload } from "@/types/quality";
import type { QualityGrade } from "@/types/batch";

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

export default function NewQualityTestPage() {
  const router = useRouter();

  const [batchId, setBatchId] = useState("");
  const [grade, setGrade] = useState<QualityGrade>("GradeA");
  const [moisturePercentage, setMoisturePercentage] = useState("");
  const [labReportHash, setLabReportHash] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

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

    const payload: CreateQualityPayload = {
      grade,
      moisturePercentage: moisture,
      ...(labReportHash.trim()
        ? { labReportHash: labReportHash.trim() }
        : {}),
      ...(reportNotes.trim()
        ? {
            labReportData: {
              notes: reportNotes.trim(),
            },
          }
        : {}),
    };

    try {
      setSubmitting(true);

      await qualityService.create(trimmedBatchId, payload);

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the quality certification.",
      );
    } finally {
      setSubmitting(false);
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
              Record the laboratory quality assessment for a registered honey
              batch.
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
              Enter the ID of the registered honey batch.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Batch ID
            </span>

            <input
              type="text"
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
                Moisture Percentage
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
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
                Must be greater than 0 and at most 100.
              </p>
            </label>
          </div>
        </section>

        {/* Report */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-5">
            <h2 className="font-semibold">Laboratory Report</h2>
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              Optional information associated with the laboratory report.
            </p>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Report Hash
                <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">
                  Optional
                </span>
              </span>

              <input
                type="text"
                value={labReportHash}
                onChange={(event) => setLabReportHash(event.target.value)}
                placeholder="Enter report hash"
                className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 font-mono text-sm outline-none transition placeholder:font-sans placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:placeholder:text-white/25"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Notes
                <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">
                  Optional
                </span>
              </span>

              <textarea
                value={reportNotes}
                onChange={(event) => setReportNotes(event.target.value)}
                rows={4}
                placeholder="Add laboratory observations or notes..."
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
                Submitting...
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