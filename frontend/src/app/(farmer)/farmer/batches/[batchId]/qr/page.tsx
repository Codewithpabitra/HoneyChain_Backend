"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconExternalLink,
  IconHexagon,
  IconQrcode,
  IconShieldCheck,
} from "@tabler/icons-react";

import { verificationService } from "@/services/verification.service";
import { batchService } from "@/services/batch.service";
import type { BatchVerification } from "@/types/batch";

export default function FarmerBatchDetailsPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = decodeURIComponent(params.batchId);

  const [batch, setBatch] = useState<BatchVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{
    verificationUrl: string;
    dataUrl: string;
    svg: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBatch() {
      try {
        setLoading(true);
        setError(null);

        const [data, qrRes] = await Promise.allSettled([
          verificationService.verifyBatch(batchId),
          batchService.generateQR(batchId),
        ]);

        if (!cancelled) {
          if (data.status === "fulfilled") {
            setBatch(data.value);
          } else {
            throw data.reason;
          }
          if (qrRes.status === "fulfilled") {
            setQrData(qrRes.value);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load batch details.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (batchId) {
      loadBatch();
    }

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="h-5 w-32 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        <div className="mt-6 h-10 w-72 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
          <div className="h-48 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
          <IconShieldCheck size={28} />
        </div>

        <h1 className="mt-5 text-2xl font-bold">Batch not found</h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          {error ?? "We could not retrieve this batch."}
        </p>

        <Link
          href="/farmer/batches"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          <IconArrowLeft size={17} />
          Back to batches
        </Link>
      </div>
    );
  }

  const blockchain = batch.blockchain;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/farmer/batches"
          className="inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          <IconArrowLeft size={16} />
          Back to batches
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-honey">
              Honey Traceability
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              {batch.batchId}
            </h1>

            <p className="mt-2 text-sm text-black/50 dark:text-white/50">
              Registered honey batch and blockchain verification record.
            </p>
          </div>

          <Link
            href={`/farmer/batches/${encodeURIComponent(batch.batchId)}/qr`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            <IconQrcode size={18} />
            View QR Code
          </Link>
        </div>
      </div>

      {/* Verification banner */}
      <div className="mb-6 rounded-2xl border border-emerald-600/20 bg-emerald-600/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
            <IconCheck size={21} />
          </div>

          <div>
            <p className="font-semibold">
              {batch.verifiedOnChain
                ? "Blockchain verified"
                : "Blockchain verification pending"}
            </p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              This batch has a tamper-evident traceability record.
            </p>
          </div>
        </div>
      </div>

      {/* Packaging QR Code Card */}
      {qrData && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-50/50 p-6 dark:border-amber-500/10 dark:bg-amber-950/10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white p-3 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrData.dataUrl}
                alt={`Packaging QR Code for ${batch.batchId}`}
                className="h-44 w-44 object-contain"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between self-stretch">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-honey/20 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
                  <IconQrcode size={13} />
                  Tamper-Proof Consumer QR Label
                </span>
                <h3 className="mt-2 text-lg font-bold">Official Honey Jar QR Code</h3>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  Affix this QR code to honey jars or packaging. Consumers scan this code to inspect the immutable Ethereum Sepolia provenance trail.
                </p>

                <div className="mt-3 rounded-xl border border-black/5 bg-white/80 p-2.5 font-mono text-xs dark:border-white/5 dark:bg-white/5">
                  <span className="text-black/40 dark:text-white/40">Resolves to: </span>
                  <a
                    href={qrData.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-honey hover:underline break-all"
                  >
                    {qrData.verificationUrl}
                  </a>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <a
                  href={qrData.dataUrl}
                  download={`${batch.batchId}-qr.png`}
                  className="inline-flex items-center gap-2 rounded-xl bg-honey px-4 py-2 text-xs font-semibold text-black transition hover:opacity-90 shadow-2xs"
                >
                  <IconQrcode size={16} />
                  Download PNG
                </a>
                <a
                  href={qrData.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Test Consumer View
                  <IconExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main information */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Harvest */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
              <IconHexagon size={21} />
            </div>

            <div>
              <h2 className="font-semibold">Harvest Information</h2>
              <p className="text-xs text-black/40 dark:text-white/40">
                Source and production details
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <InfoRow
              label="Quantity"
              value={`${batch.harvest.quantityKg} kg`}
            />
            <InfoRow
              label="Floral origin"
              value={batch.harvest.floralOrigin}
            />
            <InfoRow
              label="Source hives"
              value={
                batch.harvest.sourceHives.length > 0
                  ? batch.harvest.sourceHives.join(", ")
                  : "Not specified"
              }
            />
            <InfoRow
              label="Region"
              value={batch.harvest.apiaryLocation.region}
            />
          </div>
        </section>

        {/* Blockchain */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
              <IconShieldCheck size={21} />
            </div>

            <div>
              <h2 className="font-semibold">Blockchain Record</h2>
              <p className="text-xs text-black/40 dark:text-white/40">
                On-chain registration
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <InfoRow
              label="Network"
              value={blockchain.network}
            />

            <InfoRow
              label="Chain ID"
              value={String(blockchain.chainId)}
            />

            <InfoRow
              label="Status"
              value={blockchain.status}
            />

            <InfoRow
              label="Custodian"
              value={blockchain.currentCustodian}
            />

            {blockchain.txHash && (
              <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-4 dark:border-white/5">
                <span className="text-xs text-black/40 dark:text-white/40">
                  Transaction
                </span>

                {blockchain.etherscanUrl ? (
                  <a
                    href={blockchain.etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-honey hover:underline"
                  >
                    {blockchain.txHash.slice(0, 12)}...
                    <IconExternalLink size={14} />
                  </a>
                ) : (
                  <span className="max-w-55 truncate font-mono text-xs">
                    {blockchain.txHash}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quality */}
      {batch.quality && (
        <section className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <h2 className="font-semibold">Quality Certification</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Grade"
              value={batch.quality.grade}
            />
            <Metric
              label="Moisture"
              value={`${batch.quality.moisturePercentage}%`}
            />
            <Metric
              label="Certified By"
              value={batch.quality.certifiedBy || "Accredited Laboratory"}
            />
          </div>
        </section>
      )}

      {/* Tamper audit */}
      <section className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <h2 className="font-semibold">Integrity Audit</h2>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <AuditItem
            label="On-chain verification"
            verified={batch.verifiedOnChain}
          />
          <AuditItem
            label="Metadata hash"
            verified={batch.tamperProofAudit.metadataHashMatch}
          />
          <AuditItem
            label="Lab report hash"
            verified={batch.tamperProofAudit.labReportHashMatch}
          />
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-sm text-black/40 dark:text-white/40">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/2 p-4 dark:border-white/5 dark:bg-white/2">
      <p className="text-xs text-black/40 dark:text-white/40">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function AuditItem({
  label,
  verified,
}: {
  label: string;
  verified: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 p-4 dark:border-white/5">
      <IconCheck
        size={18}
        className={
          verified
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-black/20 dark:text-white/20"
        }
      />

      <span className="text-sm">{label}</span>
    </div>
  );
}