"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconCurrencyEthereum,
  IconCheck,
  IconExternalLink,
  IconHexagon,
  IconMapPin,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";

import TraceabilityTimeline from "@/components/traceability/TraceabilityTimeline";
import { verificationService } from "@/services/verification.service";
import type { BatchVerification, QualityGrade } from "@/types/batch";

function formatGrade(grade: QualityGrade): string {
  return grade.replace("Grade", "Grade ");
}

export default function TraceabilityPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = decodeURIComponent(params.batchId);

  const [data, setData] = useState<BatchVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTraceability() {
      try {
        setError(null);

        const result = await verificationService.verifyBatch(batchId);
        setData(result);
      } catch {
        setError("Unable to load the traceability record.");
      }
    }

    if (batchId) {
      loadTraceability();
    }
  }, [batchId]);

  if (error) {
    return (
      <main className="min-h-screen bg-paper px-5 py-12 text-ink dark:bg-paper-dark dark:text-ink-dark">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-sm text-black/50 hover:text-honey dark:text-white/50 dark:hover:text-honey"
          >
            <IconArrowLeft size={16} />
            Back to verification
          </Link>

          <div className="mt-16 rounded-3xl border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-white/3">
            <IconX size={32} className="mx-auto text-alert" stroke={1.7} />

            <h1 className="mt-5 text-2xl font-bold">
              Traceability unavailable
            </h1>

            <p className="mt-2 text-sm text-black/50 dark:text-white/50">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-paper px-5 py-12 dark:bg-paper-dark">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-4 h-4 w-72 animate-pulse rounded bg-black/5 dark:bg-white/5" />

          <div className="mt-10 h-56 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
        </div>
      </main>
    );
  }

  const { harvest, quality, blockchain } = data;

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink dark:bg-paper-dark dark:text-ink-dark md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 text-sm text-black/50 hover:text-honey dark:text-white/50 dark:hover:text-honey"
            >
              <IconArrowLeft size={16} />
              Verify another batch
            </Link>

            <p className="mt-7 text-sm font-medium text-honey">Honey Chain</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Traceability Record
            </h1>

            <p className="mt-2 font-mono text-sm text-black/50 dark:text-white/50">
              {data.batchId}
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${
              data.verifiedOnChain
                ? "bg-verified/10 text-verified"
                : "bg-alert/10 text-alert"
            }`}
          >
            {data.verifiedOnChain ? (
              <IconCheck size={16} />
            ) : (
              <IconX size={16} />
            )}

            {data.verifiedOnChain ? "Verified on-chain" : "Not verified"}
          </div>
        </div>

        {/* Origin */}
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Harvest Origin</h2>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Source information recorded for this batch.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
              <div className="flex items-center gap-3">
                <IconHexagon size={20} className="text-honey" />

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
            <DetailCard label="Quantity" value={`${harvest.quantityKg} kg`} />

            <DetailCard
              label="Source Hives"
              value={harvest.sourceHives.join(", ") || "—"}
            />

            <DetailCard label="Producer" value={harvest.producer} />
          </div>
        </section>

        {/* Quality */}
        {quality && (
          <section className="mt-10">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Quality Certification</h2>

              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Laboratory quality information attached to the batch.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
              <div className="grid gap-5 sm:grid-cols-3">
                <DetailCard
                  label="Quality Grade"
                  value={formatGrade(quality.grade)}
                />

                <DetailCard
                  label="Moisture"
                  value={`${quality.moisturePercentage}%`}
                />

                <DetailCard
                  label="Certified By"
                  value={quality.certifiedBy || "Accredited Laboratory"}
                />
              </div>
            </div>
          </section>
        )}

        {/* Blockchain */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Blockchain Record</h2>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Verified against Ethereum Sepolia smart contract{" "}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailCard label="Network" value={blockchain.network} />

              <DetailCard label="Chain ID" value={String(blockchain.chainId)} />

              <DetailCard label="Batch Status" value={blockchain.status} />

              <DetailCard
                label="Current Custodian"
                value={blockchain.currentCustodian}
              />
            </div>

            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
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

            {blockchain.txHash && (
              <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-black/40 dark:text-white/40">
                    Transaction Hash
                  </p>

                  <p className="mt-2 break-all font-mono text-xs">
                    {blockchain.txHash}
                  </p>
                </div>

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
            )}
          </div>
        </section>

        {/* Journey */}
        <section className="mt-10">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <IconShieldCheck size={20} className="text-honey" />

              <h2 className="text-lg font-semibold">Custody Journey</h2>
            </div>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Recorded custody events throughout the honey supply chain.
            </p>
          </div>

          <TraceabilityTimeline events={data.custodyTimeline} />
        </section>

        {/* Footer */}
        <div className="mt-10 flex flex-col gap-4 border-t border-black/10 pt-6 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
            <IconCurrencyEthereum size={15} />
            Honey Chain blockchain record
          </div>

          <Link
            href={`/verify/${encodeURIComponent(data.batchId)}`}
            className="inline-flex items-center gap-2 font-medium text-honey hover:underline"
          >
            Open verification result
            <IconArrowLeft size={15} className="rotate-180" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-xs text-black/40 dark:text-white/40">{label}</p>

      <p className="mt-2 wrap-break-word text-sm font-semibold">{value}</p>
    </div>
  );
}
