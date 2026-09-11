"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconCurrencyEthereum ,
  IconCheck,
  IconExternalLink,
  IconHexagon,
  IconMapPin,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { BeeIcon } from "@/components/ui/BeeIcon";

import TraceabilityTimeline from "@/components/traceability/TraceabilityTimeline";
import { verificationService } from "@/services/verification.service";
import type {
  BatchVerification,
  QualityGrade,
} from "@/types/batch";

function qualityLabel(grade: QualityGrade) {
  return grade.replace("Grade", "Grade ");
}

export default function VerifyBatchPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = decodeURIComponent(params.batchId);

  const [verification, setVerification] =
    useState<BatchVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerification() {
      try {
        setError(null);

        const result = await verificationService.verifyBatch(batchId);
        setVerification(result);
      } catch {
        setError("We could not find or verify this batch.");
      }
    }

    if (batchId) {
      loadVerification();
    }
  }, [batchId]);

  if (error) {
    return (
      <main className="min-h-screen bg-paper px-5 py-12 text-ink dark:bg-paper-dark dark:text-ink-dark md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-sm text-black/50 hover:text-honey dark:text-white/50 dark:hover:text-honey"
          >
            <IconArrowLeft size={16} />
            Verify another batch
          </Link>

          <div className="mt-16 rounded-3xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-white/3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-alert/10 text-alert">
              <IconX size={28} stroke={1.7} />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Verification Failed
            </h1>

            <p className="mt-3 text-sm leading-6 text-black/50 dark:text-white/50">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!verification) {
    return (
      <main className="min-h-screen bg-paper px-5 py-12 text-ink dark:bg-paper-dark dark:text-ink-dark">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-honey/20" />

          <div className="mx-auto mt-5 h-5 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />

          <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
      </main>
    );
  }

  const { harvest, quality, blockchain, tamperProofAudit } = verification;

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink dark:bg-paper-dark dark:text-ink-dark md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              verification.verifiedOnChain
                ? "bg-verified/10 text-verified"
                : "bg-alert/10 text-alert"
            }`}
          >
            {verification.verifiedOnChain ? (
              <IconShieldCheck size={34} stroke={1.7} />
            ) : (
              <IconX size={32} stroke={1.7} />
            )}
          </div>

          <p className="mt-5 text-sm font-medium text-honey">
            Honey Chain Verification
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {verification.verifiedOnChain
              ? "Batch Verified"
              : "Verification Requires Attention"}
          </h1>

          <p className="mt-2 font-mono text-sm text-black/50 dark:text-white/50">
            {verification.batchId}
          </p>
        </div>

        {/* Verification status */}
        <div
          className={`mt-8 rounded-2xl border p-5 ${
            verification.verifiedOnChain
              ? "border-verified/20 bg-verified/6"
              : "border-alert/20 bg-alert/6"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                verification.verifiedOnChain
                  ? "bg-verified/10 text-verified"
                  : "bg-alert/10 text-alert"
              }`}
            >
              {verification.verifiedOnChain ? (
                <IconCheck size={19} />
              ) : (
                <IconX size={19} />
              )}
            </div>

            <div>
              <h2 className="font-semibold">
                {verification.verifiedOnChain
                  ? "Authenticity record verified"
                  : "On-chain verification could not be confirmed"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
                {verification.verifiedOnChain
                  ? "This batch has a corresponding blockchain-backed traceability record."
                  : "Review the available batch information carefully before relying on this record."}
              </p>
            </div>
          </div>
        </div>

        {/* Harvest information */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Harvest Origin</h2>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Information recorded when the honey batch was harvested.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
              <div className="flex items-center gap-3">
                <BeeIcon size={20} className="text-honey" />

                <span className="text-sm font-medium">Floral Origin</span>
              </div>

              <p className="mt-4 text-xl font-semibold">
                {harvest.floralOrigin}
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
              <div className="flex items-center gap-3">
                <IconMapPin size={20} className="text-honey" />

                <span className="text-sm font-medium">Apiary Region</span>
              </div>

              <p className="mt-4 text-xl font-semibold">
                {harvest.apiaryLocation.region}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <InfoCard
              label="Quantity"
              value={`${harvest.quantityKg} kg`}
            />

            <InfoCard
              label="Source Hives"
              value={String(harvest.sourceHives.length)}
            />

            <InfoCard
              label="Producer"
              value={harvest.producer}
            />
          </div>
        </section>

        {/* Quality */}
        {quality && (
          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Quality Certification</h2>

              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Laboratory certification associated with this batch.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-black/40 dark:text-white/40">
                    Grade
                  </p>

                  <p className="mt-2 text-xl font-bold text-honey">
                    {qualityLabel(quality.grade)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-black/40 dark:text-white/40">
                    Moisture
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    {quality.moisturePercentage}%
                  </p>
                </div>

                <div>
                  <p className="text-xs text-black/40 dark:text-white/40">
                    Certified By
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {quality.certifiedBy}
                  </p>
                </div>
              </div>

              {quality.labReportUrl && (
                <div className="mt-6 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                  <div>
                    <p className="text-xs text-black/40 dark:text-white/40">
                      Laboratory Assay Certificate
                    </p>
                    {quality.labReportHash && (
                      <p className="mt-1 max-w-md break-all font-mono text-xs text-black/60 dark:text-white/60">
                        {quality.labReportHash}
                      </p>
                    )}
                  </div>
                  <a
                    href={quality.labReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="viewLabReportBtn"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-honey/90"
                  >
                    View Lab Report
                    <IconExternalLink size={16} />
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Blockchain */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Blockchain Record</h2>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Critical traceability information recorded on-chain.
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoCard
                label="Network"
                value={blockchain.network}
              />

              <InfoCard
                label="Chain ID"
                value={String(blockchain.chainId)}
              />

              <InfoCard
                label="Status"
                value={blockchain.status}
              />

              <InfoCard
                label="Current Custodian"
                value={blockchain.currentCustodian}
              />
            </div>

            {blockchain.txHash && (
              <div className="mt-5 border-t border-black/10 pt-5 dark:border-white/10">
                <p className="text-xs text-black/40 dark:text-white/40">
                  Transaction Hash
                </p>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all font-mono text-xs">
                    {blockchain.txHash}
                  </p>

                  {blockchain.etherscanUrl && (
                    <a
                      href={blockchain.etherscanUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
                    >
                      View transaction
                      <IconExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Integrity audit */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Integrity Audit</h2>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Checks performed against the stored traceability record.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <AuditCard
              label="On-Chain Record"
              verified={verification.verifiedOnChain}
            />

            <AuditCard
              label="Metadata Hash"
              verified={tamperProofAudit.metadataHashMatch}
            />

            <AuditCard
              label="Lab Report Hash"
              verified={tamperProofAudit.labReportHashMatch}
            />
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-8 border-t border-black/10 pt-8 dark:border-white/10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Traceability Journey
            </h2>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Recorded custody events for this honey batch.
            </p>
          </div>

          <TraceabilityTimeline events={verification.custodyTimeline} />
        </section>

        {/* Footer */}
        <div className="mt-10 border-t border-black/10 pt-6 text-center dark:border-white/10">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            Verify another batch
            <IconArrowLeft size={16} />
          </Link>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-black/35 dark:text-white/35">
            <IconCurrencyEthereum  size={14} />
            Blockchain-backed Honey Chain record
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-xs text-black/40 dark:text-white/40">
        {label}
      </p>

      <p className="mt-2 wrap-break-word text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function AuditCard({
  label,
  verified,
}: {
  label: string;
  verified: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          verified
            ? "bg-verified/10 text-verified"
            : "bg-alert/10 text-alert"
        }`}
      >
        {verified ? <IconCheck size={18} /> : <IconX size={18} />}
      </div>

      <p className="mt-4 text-sm font-semibold">{label}</p>

      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
        {verified ? "Verified" : "Not verified"}
      </p>
    </div>
  );
}