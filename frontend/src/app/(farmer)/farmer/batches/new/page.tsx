"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";
import Link from "next/link";
import { batchService } from "@/services/batch.service";
import type { CreateBatchPayload } from "@/types/batch";

export default function RegisterBatchPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    batchId: "",
    quantityKg: "",
    floralOrigin: "",
    sourceHives: "",
    latitude: "",
    longitude: "",
    region: "",
    elevationMeters: "",
    harvestDate: "",
    extractionMethod: "",
    organicCertification: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredBatchId, setRegisteredBatchId] = useState<string | null>(
    null,
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const quantityKg = Number(form.quantityKg);
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isInteger(quantityKg) || quantityKg <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setError("Enter a valid latitude between -90 and 90.");
      return;
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Enter a valid longitude between -180 and 180.");
      return;
    }

    const harvestTimestamp = form.harvestDate
      ? Math.floor(new Date(form.harvestDate).getTime() / 1000)
      : undefined;

    if (
      harvestTimestamp !== undefined &&
      !Number.isFinite(harvestTimestamp)
    ) {
      setError("Enter a valid harvest date.");
      return;
    }

    const sourceHives = form.sourceHives
      .split(",")
      .map((hive) => hive.trim())
      .filter(Boolean);

    const extraMetadata: Record<string, string> = {};

    if (form.extractionMethod.trim()) {
      extraMetadata.extractionMethod = form.extractionMethod.trim();
    }

    if (form.organicCertification.trim()) {
      extraMetadata.organicCertification =
        form.organicCertification.trim();
    }

    const payload: CreateBatchPayload = {
      ...(form.batchId.trim()
        ? { batchId: form.batchId.trim() }
        : {}),
      quantityGrams: quantityKg * 1000,
      floralOrigin: form.floralOrigin.trim(),
      ...(sourceHives.length > 0 ? { sourceHives } : {}),
      apiaryLocation: {
        latitude,
        longitude,
        region: form.region.trim(),
        ...(form.elevationMeters
          ? { elevationMeters: Number(form.elevationMeters) }
          : {}),
      },
      ...(harvestTimestamp !== undefined
        ? { harvestTimestamp }
        : {}),
      ...(Object.keys(extraMetadata).length > 0
        ? { extraMetadata }
        : {}),
    };

    if (
      !payload.floralOrigin ||
      !payload.apiaryLocation.region
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await batchService.create(payload);

      const batchId = response?.data?.batchId ?? payload.batchId;

      setRegisteredBatchId(batchId ?? null);
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to register the honey batch.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-8 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verified/10 text-verified">
            <IconCheck size={30} />
          </div>

          <p className="mt-6 text-sm font-medium text-honey">
            Blockchain Registration Complete
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Batch registered successfully
          </h1>

          <p className="mt-3 text-sm text-black/50 dark:text-white/50">
            The harvest batch has been registered on Ethereum
            Sepolia and recorded in HoneyChain.
          </p>

          {registeredBatchId && (
            <div className="mt-6 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
              <p className="text-xs text-black/40 dark:text-white/40">
                Batch ID
              </p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {registeredBatchId}
              </p>
            </div>
          )}

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/farmer/batches"
              className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              View Batches
            </Link>

            {registeredBatchId && (
              <Link
                href={`/traceability/${encodeURIComponent(registeredBatchId)}`}
                className="rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-comb transition hover:bg-honey-light"
              >
                View Traceability
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/farmer/batches"
        className="mb-6 inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-ink dark:text-white/50 dark:hover:text-white"
      >
        <IconArrowLeft size={17} />
        Back to batches
      </Link>

      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Honey Traceability
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Register Harvest Batch
        </h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Create a tamper-evident blockchain record for harvested
          honey.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="font-semibold">Batch Details</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field
              label="Batch ID"
              placeholder="HC-BATCH-2026-001"
              value={form.batchId}
              onChange={(value) => updateField("batchId", value)}
            />

            <Field
              label="Quantity (kg)"
              type="number"
              min="1"
              placeholder="45"
              required
              value={form.quantityKg}
              onChange={(value) => updateField("quantityKg", value)}
            />

            <Field
              label="Floral Origin"
              placeholder="Sundarbans Wild Mangrove"
              required
              value={form.floralOrigin}
              onChange={(value) => updateField("floralOrigin", value)}
            />

            <Field
              label="Source Hives"
              placeholder="HIVE-001, HIVE-002"
              value={form.sourceHives}
              onChange={(value) => updateField("sourceHives", value)}
            />

            <Field
              label="Harvest Date"
              type="date"
              value={form.harvestDate}
              onChange={(value) => updateField("harvestDate", value)}
            />

            <Field
              label="Extraction Method"
              placeholder="Cold-pressed raw centrifugal"
              value={form.extractionMethod}
              onChange={(value) =>
                updateField("extractionMethod", value)
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <h2 className="font-semibold">Apiary Location</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field
              label="Latitude"
              type="number"
              step="any"
              placeholder="21.9497"
              required
              value={form.latitude}
              onChange={(value) => updateField("latitude", value)}
            />

            <Field
              label="Longitude"
              type="number"
              step="any"
              placeholder="89.1833"
              required
              value={form.longitude}
              onChange={(value) => updateField("longitude", value)}
            />

            <Field
              label="Region"
              placeholder="Sundarbans Core Mangrove Zone"
              required
              value={form.region}
              onChange={(value) => updateField("region", value)}
            />

            <Field
              label="Elevation (meters)"
              type="number"
              step="any"
              placeholder="4"
              value={form.elevationMeters}
              onChange={(value) =>
                updateField("elevationMeters", value)
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <h2 className="font-semibold">Additional Metadata</h2>

          <div className="mt-5">
            <Field
              label="Organic Certification"
              placeholder="NPOP-IND-2026-99"
              value={form.organicCertification}
              onChange={(value) =>
                updateField("organicCertification", value)
              }
            />
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-honey px-6 py-3 text-sm font-semibold text-comb transition hover:bg-honey-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <IconLoader2
                size={18}
                className="animate-spin"
              />
            )}
            {isSubmitting
              ? "Registering on Blockchain..."
              : "Register Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  step,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-1 text-honey">*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="mt-2 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-white/30"
      />
    </label>
  );
}