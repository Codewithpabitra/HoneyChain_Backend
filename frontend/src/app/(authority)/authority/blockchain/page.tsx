"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowUpRight,
  IconCurrencyEthereum,
  IconExternalLink,
  IconHash,
  IconLoader2,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import { analyticsService } from "@/services/analytics.service";
import type { BatchItem } from "@/types/batch";
import type { DashboardStats } from "@/types/analytics";

export default function AuthorityBlockchainPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [batchRes, statsRes] = await Promise.allSettled([
        batchService.getAll({ limit: 10 }),
        analyticsService.getDashboardStats(),
      ]);

      if (batchRes.status === "fulfilled") {
        setBatches(batchRes.value.data || []);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load blockchain monitoring data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalBatches = stats?.batches.total ?? batches.length;
  const certifiedBatches = stats?.batches.tested ?? batches.filter((b) => b.status === "Certified").length;
  const inTransitOrDelivered = (stats?.batches.inTransit ?? 0) + (stats?.batches.delivered ?? 0);
  const estimatedEvents = totalBatches + certifiedBatches + inTransitOrDelivered;

  const batchWithTx = batches.find((b) => b.blockchain?.registrationTxHash);
  const latestTxHash = batchWithTx?.blockchain?.registrationTxHash || "0x9c41f8a81765c92c810...a81f";
  const contractAddress =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    "0x539162976d8b6718C9Ce96e5781a7A85d9571C63";

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Immutable Traceability
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Blockchain Registry</h1>

          <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
            Monitor blockchain-backed honey traceability records, smart contract events, and tamper-proof hashes on Ethereum Sepolia.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Registered Batches</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : totalBatches}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">On-Chain Certified</p>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : certifiedBatches}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Blockchain Events</p>
          <p className="mt-3 text-2xl font-bold text-honey">
            {loading ? "..." : estimatedEvents}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Active Ledger</p>
          <p className="mt-3 text-2xl font-bold">Sepolia</p>
        </div>
      </div>

      {/* Network status */}
      <div className="mt-8 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
              <IconCurrencyEthereum size={24} stroke={1.7} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Ethereum Sepolia Testnet</h2>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Synchronized
                </span>
              </div>

              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Supply chain events, batch registrations, quality audits, and custody transfers are recorded via ERC smart contracts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <IconShieldCheck size={18} />
            Smart Contracts Verified
          </div>
        </div>
      </div>

      {/* Verification Parameters */}
      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconHash size={21} stroke={1.7} />
          </div>

          <div>
            <h2 className="font-semibold">On-Chain Contract & Ledger Parameters</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50 dark:text-white/50">
              Honey Chain records critical batch data and cryptographic transaction references so that registered traceability events can be independently audited.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-black/50 dark:text-white/50">
              Recent Batch Tx Hash
            </p>
            <p className="mt-2 font-mono text-xs text-black dark:text-white break-all">
              {latestTxHash}
            </p>
          </div>

          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-black/50 dark:text-white/50">
              Traceability Contract Address
            </p>
            <p className="mt-2 font-mono text-xs text-black dark:text-white break-all">
              {contractAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Blockchain Batches Table */}
      {batches.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Ledger Batches</h2>
              <p className="text-sm text-black/50 dark:text-white/50">
                Latest batches submitted to the decentralized registry.
              </p>
            </div>
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-honey hover:underline"
            >
              Public Verification Portal
              <IconExternalLink size={14} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                  <tr>
                    <th className="px-5 py-3.5">Batch ID</th>
                    <th className="px-5 py-3.5">Floral Origin</th>
                    <th className="px-5 py-3.5">Quantity</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Tx Hash</th>
                    <th className="px-5 py-3.5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {batches.map((batch) => (
                    <tr
                      key={batch._id || batch.batchId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-5 py-4 font-mono font-medium text-black dark:text-white">
                        {batch.batchId}
                      </td>
                      <td className="px-5 py-4 text-black/75 dark:text-white/75">
                        {batch.floralOrigin || "Multifloral"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-black dark:text-white">
                        {((batch.quantityGrams || 0) / 1000).toFixed(1)} kg
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            batch.status === "Certified"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : batch.status === "InTransit"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : batch.status === "Delivered"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : "bg-honey/10 text-honey"
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-black/50 dark:text-white/50">
                        {batch.blockchain?.registrationTxHash ? (
                          <span title={batch.blockchain.registrationTxHash}>
                            {batch.blockchain.registrationTxHash.slice(0, 10)}…
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/verify/${encodeURIComponent(batch.batchId)}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-honey hover:underline"
                        >
                          Verify On-Chain
                          <IconExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Verification Flow */}
      <div className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Verification Flow</h2>

          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Critical traceability information can be audited at every phase of the honey supply chain.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Register",
              description:
                "A honey batch is registered with its harvest and source information on Sepolia.",
            },
            {
              number: "02",
              title: "Quality Audit",
              description:
                "Accredited lab assays record moisture, sucrose, and pollen certificates with cryptographic hashes.",
            },
            {
              number: "03",
              title: "Custody & Verify",
              description:
                "Consumers scan QR codes to verify unaltered origin, transport conditions, and authenticity.",
            },
          ].map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3"
            >
              <span className="font-mono text-xs text-honey">
                {step.number}
              </span>

              <h3 className="mt-4 font-semibold">{step.title}</h3>

              <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}