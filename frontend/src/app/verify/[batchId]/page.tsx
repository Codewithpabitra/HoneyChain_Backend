"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCurrencyEthereum,
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

  const { harvest, quality, blockchain, tamperProofAudit, recall } = verification;

  const isRecalled = blockchain.status === "Recalled" || Boolean(recall?.recalled);
  const isCertified = Boolean(
    quality &&
    quality.grade !== "None" &&
    quality.certifiedBy &&
    quality.certifiedBy !== "0x0000000000000000000000000000000000000000"
  );

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink dark:bg-paper-dark dark:text-ink-dark md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              isRecalled
                ? "bg-red-500/15 text-red-600 ring-2 ring-red-500/30"
                : verification.verifiedOnChain
                ? "bg-verified/10 text-verified"
                : "bg-alert/10 text-alert"
            }`}
          >
            {isRecalled ? (
              <IconAlertTriangle size={36} stroke={1.8} />
            ) : verification.verifiedOnChain ? (
              <IconShieldCheck size={34} stroke={1.7} />
            ) : (
              <IconX size={32} stroke={1.7} />
            )}
          </div>

          <p
            className={`mt-5 text-sm font-bold tracking-wider uppercase ${
              isRecalled ? "text-red-600" : "text-honey"
            }`}
          >
            {isRecalled ? "Consumer Safety Notice" : "Honey Chain Verification"}
          </p>

          <h1
            className={`mt-2 text-3xl font-extrabold tracking-tight ${
              isRecalled ? "text-red-600" : ""
            }`}
          >
            {isRecalled
              ? "Batch Recalled & Rejected"
              : verification.verifiedOnChain
              ? "Batch Verified"
              : "Verification Requires Attention"}
          </h1>

          <p className="mt-2 font-mono text-sm text-black/50 dark:text-white/50">
            {verification.batchId}
          </p>
        </div>

        {/* Verification status / Recall Banner */}
        {isRecalled ? (
          <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-600">
                <IconAlertTriangle size={24} />
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
                  CRITICAL NOTICE: DO NOT CONSUME OR DISTRIBUTE
                </h2>

                <p className="mt-1 text-sm leading-6 text-black/80 dark:text-white/80">
                  This honey batch was officially <strong>REJECTED and RECALLED</strong> on Ethereum Sepolia following auditor review. It failed regulatory quality and safety standards and must not be sold, distributed, or consumed.
                </p>

                {recall?.reason && (
                  <div className="mt-3.5 rounded-xl border border-red-500/25 bg-white/70 p-4 dark:bg-black/30">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                      Official Rejection & Recall Reason:
                    </p>
                    <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                      &ldquo;{recall.reason}&rdquo;
                    </p>
                    {recall.recalledBy && (
                      <p className="mt-2 font-mono text-xs text-black/60 dark:text-white/60">
                        Auditor Authority: {recall.recalledBy}
                      </p>
                    )}
                    {recall.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${recall.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                      >
                        View On-Chain Recall Transaction
                        <IconExternalLink size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
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
        )}

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
                Laboratory certification and quality assay status.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-6 dark:bg-white/3 ${
                isRecalled || !isCertified
                  ? "border-red-500/25 bg-red-500/5"
                  : "border-black/10 bg-white"
              }`}
            >
              {!isCertified ? (
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                      CERTIFICATION DENIED / NOT CERTIFIED
                    </span>
                    <span className="text-xs font-semibold text-black/70 dark:text-white/70">
                      Grade: {quality.grade && quality.grade !== "None" ? qualityLabel(quality.grade) : "Substandard"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-black/75 dark:text-white/75">
                    This honey batch failed quality inspection standards and was <strong>never granted lab quality certification</strong> on Ethereum Sepolia.
                  </p>

                  {recall?.reason && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-white/60 p-3 text-xs dark:bg-black/20">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        Lab Assay Finding:{" "}
                      </span>
                      <span className="text-black/80 dark:text-white/80">
                        {recall.reason}
                      </span>
                    </div>
                  )}

                  {quality.labReportUrl && (() => {
                    const apiBase =
                      process.env.NEXT_PUBLIC_API_URL ||
                      "https://honeychain-backend-trag.onrender.com";
                    let labReportLink = quality.labReportUrl;
                    if (
                      labReportLink.includes("res.cloudinary.com") ||
                      labReportLink.includes("raw/upload")
                    ) {
                      labReportLink = `${apiBase.replace(/\/+$/, "")}/api/batches/${encodeURIComponent(verification.batchId)}/certificate`;
                    } else if (!labReportLink.startsWith("http")) {
                      labReportLink = `${apiBase.replace(/\/+$/, "")}${labReportLink.startsWith("/") ? "" : "/"}${labReportLink}`;
                    }

                    return (
                      <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                        <div>
                          <p className="text-xs text-black/40 dark:text-white/40">
                            Laboratory Rejection & Assay Report
                          </p>
                          {quality.labReportHash && (
                            <p className="mt-1 max-w-md break-all font-mono text-xs text-black/60 dark:text-white/60">
                              {quality.labReportHash}
                            </p>
                          )}
                        </div>
                        <a
                          href={labReportLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          id="viewLabReportBtn"
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          View Rejection Report
                          <IconExternalLink size={16} />
                        </a>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
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

                  {quality.labReportUrl && (() => {
                    const apiBase =
                      process.env.NEXT_PUBLIC_API_URL ||
                      "https://honeychain-backend-trag.onrender.com";
                    let labReportLink = quality.labReportUrl;
                    if (
                      labReportLink.includes("res.cloudinary.com") ||
                      labReportLink.includes("raw/upload")
                    ) {
                      labReportLink = `${apiBase.replace(/\/+$/, "")}/api/batches/${encodeURIComponent(verification.batchId)}/certificate`;
                    } else if (!labReportLink.startsWith("http")) {
                      labReportLink = `${apiBase.replace(/\/+$/, "")}${labReportLink.startsWith("/") ? "" : "/"}${labReportLink}`;
                    }

                    return (
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
                          href={labReportLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          id="viewLabReportBtn"
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-honey/90"
                        >
                          View Lab Report
                          <IconExternalLink size={16} />
                        </a>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </section>
        )}

        {/* Blockchain */}
        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Blockchain Record</h2>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Critical traceability information verified against smart contract{" "}
                <span className="font-mono text-xs font-semibold text-honey">
                  {blockchain.contractAddress || "0xFc7211528ae5Ef5B302e7807F956e5e306903487"}
                </span>
                .
              </p>
            </div>

            <a
              href={`https://sepolia.etherscan.io/address/${blockchain.contractAddress || "0xFc7211528ae5Ef5B302e7807F956e5e306903487"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-honey/30 bg-honey/10 px-4 py-2 text-xs font-semibold text-honey transition hover:bg-honey/20"
            >
              <IconCurrencyEthereum size={16} />
              View Contract on Sepolia Etherscan
              <IconExternalLink size={14} />
            </a>
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

              <div className="rounded-xl border border-black/10 p-4 dark:border-white/10 sm:col-span-2">
                <p className="text-xs text-black/40 dark:text-white/40">
                  Smart Contract Address
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all font-mono text-xs font-semibold">
                    {blockchain.contractAddress || "0xFc7211528ae5Ef5B302e7807F956e5e306903487"}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/address/${blockchain.contractAddress || "0xFc7211528ae5Ef5B302e7807F956e5e306903487"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-honey hover:underline"
                  >
                    Sepolia Explorer
                    <IconExternalLink size={13} />
                  </a>
                </div>
              </div>
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

                  <a
                    href={blockchain.etherscanUrl || `https://sepolia.etherscan.io/tx/${blockchain.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
                  >
                    View transaction
                    <IconExternalLink size={15} />
                  </a>
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
              verified={verification.verifiedOnChain && !isRecalled}
              overrideText={isRecalled ? "Recalled on Chain" : undefined}
              isAlert={isRecalled}
            />

            <AuditCard
              label="Metadata Hash"
              verified={tamperProofAudit.metadataHashMatch}
            />

            <AuditCard
              label="Certification Integrity"
              verified={isCertified}
              overrideText={!isCertified ? "Certification Denied" : undefined}
              isAlert={!isCertified}
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
  overrideText,
  isAlert,
}: {
  label: string;
  verified: boolean;
  overrideText?: string;
  isAlert?: boolean;
}) {
  const isFailed = isAlert || !verified;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          !isFailed
            ? "bg-verified/10 text-verified"
            : "bg-alert/10 text-alert"
        }`}
      >
        {!isFailed ? <IconCheck size={18} /> : <IconX size={18} />}
      </div>

      <p className="mt-4 text-sm font-semibold">{label}</p>

      <p className={`mt-1 text-xs ${!isFailed ? "text-black/50 dark:text-white/50" : "font-semibold text-alert"}`}>
        {overrideText || (verified ? "Verified" : "Not verified")}
      </p>
    </div>
  );
}