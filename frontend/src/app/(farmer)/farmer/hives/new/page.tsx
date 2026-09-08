"use client";

import Link from "next/link";
import { IconArrowLeft, IconHexagon } from "@tabler/icons-react";

export default function NewHivePage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/farmer/hives"
          className="mb-5 inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-ink dark:text-white/50 dark:hover:text-white"
        >
          <IconArrowLeft size={17} />
          Back to Hives
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/10">
            <IconHexagon size={25} className="text-honey" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Add New Hive
            </h1>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Register a hive for smart monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <h2 className="mb-5 font-semibold">Hive Information</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Hive ID
              </label>
              <input
                type="text"
                placeholder="HIVE-001"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Hive Type
              </label>
              <select
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
                defaultValue=""
              >
                <option value="" disabled>
                  Select type
                </option>
                <option value="langstroth">Langstroth</option>
                <option value="top-bar">Top Bar</option>
                <option value="indian-standard">Indian Standard</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Apiary Location
              </label>
              <input
                type="text"
                placeholder="e.g. Sundarbans"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Installation Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/farmer/hives"
            className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            Cancel
          </Link>

          <button
            type="button"
            className="cursor-pointer rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Register Hive
          </button>
        </div>
      </form>
    </div>
  );
}