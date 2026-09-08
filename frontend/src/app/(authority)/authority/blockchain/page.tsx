"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconCurrencyEthereum ,
  IconExternalLink,
  IconHash,
  IconShieldCheck,
} from "@tabler/icons-react";

const stats = [
  { label: "Registered Batches", value: "—" },
  { label: "On-Chain Verified", value: "—" },
  { label: "Blockchain Events", value: "—" },
  { label: "Network", value: "Sepolia" },
];

export default function AuthorityBlockchainPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Immutable Traceability
        </p>

        <h1 className="text-3xl font-bold tracking-tight">Blockchain</h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Monitor blockchain-backed honey traceability records and verify
          critical supply-chain events.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3"
          >
            <p className="text-sm text-black/50 dark:text-white/50">
              {stat.label}
            </p>

            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Network status */}
      <div className="mt-8 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
              <IconCurrencyEthereum  size={24} stroke={1.7} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Ethereum Sepolia</h2>

                <span className="rounded-full border border-verified/20 bg-verified/10 px-2.5 py-1 text-xs font-medium text-verified">
                  Test Network
                </span>
              </div>

              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Used for blockchain-backed Honey Chain traceability records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-verified">
            <IconShieldCheck size={18} />
            Network configured
          </div>
        </div>
      </div>

      {/* Verification */}
      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconHash size={21} stroke={1.7} />
          </div>

          <div>
            <h2 className="font-semibold">On-Chain Verification</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50 dark:text-white/50">
              Honey Chain records critical batch information and blockchain
              transaction references so that registered traceability events
              can be independently verified.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs text-black/40 dark:text-white/40">
              Transaction Hash
            </p>
            <p className="mt-2 font-mono text-sm text-black/40 dark:text-white/40">
              —
            </p>
          </div>

          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs text-black/40 dark:text-white/40">
              Block Number
            </p>
            <p className="mt-2 font-mono text-sm text-black/40 dark:text-white/40">
              —
            </p>
          </div>

          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs text-black/40 dark:text-white/40">
              Contract Address
            </p>
            <p className="mt-2 font-mono text-sm text-black/40 dark:text-white/40">
              —
            </p>
          </div>
        </div>
      </div>

      {/* How verification works */}
      <div className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Verification Flow</h2>

          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Critical traceability information can be checked from the public
            verification page.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Register",
              description:
                "A honey batch is registered with its harvest and source information.",
            },
            {
              number: "02",
              title: "Record",
              description:
                "Critical blockchain-backed events receive transaction references.",
            },
            {
              number: "03",
              title: "Verify",
              description:
                "Consumers and authorities can verify a batch through its public record.",
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

      {/* Public verification */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Public Batch Verification</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Verify a registered honey batch using its Batch ID.
            </p>
          </div>

          <Link
            href="/verify"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            Open verification
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {/* Explorer note */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
        <IconExternalLink size={16} />

        <span>
          Transaction explorer links will become available for individual
          blockchain records returned by the backend.
        </span>
      </div>
    </div>
  );
}