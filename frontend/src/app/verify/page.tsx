"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconScan,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";

export default function VerifyPage() {
  const router = useRouter();
  const [batchId, setBatchId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBatchId = batchId.trim();

    if (!trimmedBatchId) return;

    router.push(`/verify/${encodeURIComponent(trimmedBatchId)}`);
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-12 text-ink dark:bg-paper-dark dark:text-ink-dark md:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconShieldCheck size={30} stroke={1.7} />
          </div>

          <p className="mt-6 text-sm font-medium text-honey">
            Honey Chain
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Verify Your Honey
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/50 dark:text-white/50">
            Enter the Batch ID printed on your honey package to verify its
            origin, quality certification and blockchain-backed traceability.
          </p>
        </div>

        {/* Verification card */}
        <div className="mt-10 rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/3 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
              <IconScan size={21} stroke={1.7} />
            </div>

            <div>
              <h2 className="font-semibold">Batch Verification</h2>

              <p className="text-xs text-black/50 dark:text-white/50">
                Check the authenticity of a registered batch.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="batchId"
              className="mb-2 block text-sm font-medium"
            >
              Batch ID
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="batchId"
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                placeholder="e.g. HC-2026-0001"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-black/2 px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-honey/60 focus:ring-2 focus:ring-honey/10 dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/30"
              />

              <button
                type="submit"
                disabled={!batchId.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Verify
                <IconArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Origin",
              description: "Verify harvest and source information.",
            },
            {
              title: "Quality",
              description: "Check laboratory certification details.",
            },
            {
              title: "Blockchain",
              description: "Validate recorded traceability events.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3"
            >
              <IconSparkles
                size={18}
                className="text-honey"
                stroke={1.7}
              />

              <h3 className="mt-4 text-sm font-semibold">
                {item.title}
              </h3>

              <p className="mt-1 text-xs leading-5 text-black/50 dark:text-white/50">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="mt-8 text-center text-xs text-black/40 dark:text-white/40">
          Verification uses the public Honey Chain verification record.
        </p>
      </div>
    </main>
  );
}