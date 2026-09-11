// src/app/(farmer)/farmer/harvests/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  IconPackage,
  IconPlus,
  IconRefresh,
  IconHexagon,
  IconBox,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { harvestService } from "@/services/harvest.service";
import { hiveService } from "@/services/hive.service";
import type { Harvest } from "@/types/harvest";
import type { Hive } from "@/types/hive";

export default function FarmerHarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Harvest modal
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [hives, setHives] = useState<Hive[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState("");
  const [quantityGrams, setQuantityGrams] = useState("15000");
  const [floralOrigin, setFloralOrigin] = useState("Sundarbans Wildflower");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchHarvests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await harvestService.getAll();
      setHarvests(res.data || []);
    } catch {
      setError("Failed to load harvests from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHarvests();
  }, [fetchHarvests]);

  async function openLogModal() {
    setIsLogOpen(true);
    setModalError(null);
    try {
      const hivesRes = await hiveService.getAll();
      setHives(hivesRes.data || []);
      if (hivesRes.data && hivesRes.data.length > 0) {
        setSelectedHiveId(hivesRes.data[0].hiveId);
      }
    } catch {
      // Handled silently
    }
  }

  async function handleCreateHarvest(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);

    const grams = parseFloat(quantityGrams);
    if (isNaN(grams) || grams <= 0) {
      setModalError("Please enter a valid harvest quantity in grams.");
      return;
    }
    if (!selectedHiveId) {
      setModalError("Please select the source hive.");
      return;
    }

    setSubmitting(true);
    try {
      await harvestService.create({
        hiveId: selectedHiveId,
        quantityGrams: grams,
        floralOrigin: floralOrigin.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsLogOpen(false);
      setNotes("");
      await fetchHarvests();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to log honey harvest.";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const totalYieldKg = harvests.reduce(
    (acc, h) => acc + (h.quantityGrams || 0) / 1000,
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Extraction & Yield
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
            Honey Harvests
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Log extractions directly from apiary hives and link them to verified batch batches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchHarvests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openLogModal}
            className="inline-flex items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb shadow-xs transition hover:brightness-95"
          >
            <IconPlus size={18} />
            Log Harvest
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Total Extractions</p>
          <p className="mt-2 text-2xl font-bold">{loading ? "—" : harvests.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Total Honey Yield</p>
          <p className="mt-2 text-2xl font-bold text-honey">
            {loading ? "—" : `${totalYieldKg.toFixed(1)} kg`}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Active Hives Harvested</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading
              ? "—"
              : new Set(harvests.map((h) => h.hiveId)).size}
          </p>
        </div>
      </div>

      {/* Harvests Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
          Loading harvests from registry…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-alert/20 bg-alert/5 p-6 text-center text-sm text-alert">
          {error}
        </div>
      ) : harvests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-12 text-center dark:border-white/15 dark:bg-white/3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconPackage size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-ink dark:text-ink-dark">
            No harvests recorded yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
            Log your first honey extraction from your active colonies to track honey production.
          </p>

          <button
            type="button"
            onClick={openLogModal}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
          >
            Log first harvest
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Harvest ID</th>
                  <th className="px-5 py-3.5">Source Hive</th>
                  <th className="px-5 py-3.5">Yield</th>
                  <th className="px-5 py-3.5">Floral Origin</th>
                  <th className="px-5 py-3.5">Extracted Date</th>
                  <th className="px-5 py-3.5">Linked Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {harvests.map((h) => (
                  <tr key={h._id || h.harvestId} className="transition hover:bg-black/1 dark:hover:bg-white/1">
                    <td className="px-5 py-4 font-mono font-semibold text-ink dark:text-ink-dark">
                      {h.harvestId}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/farmer/hives/${encodeURIComponent(h.hiveId)}`}
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-honey hover:underline"
                      >
                        <IconHexagon size={14} />
                        {h.hiveId}
                      </Link>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink dark:text-ink-dark">
                      {(h.quantityGrams / 1000).toFixed(2)} kg{" "}
                      <span className="text-xs text-black/40 dark:text-white/40">
                        ({h.quantityGrams.toLocaleString()} g)
                      </span>
                    </td>
                    <td className="px-5 py-4 text-black/70 dark:text-white/70">
                      {h.floralOrigin || "Sundarbans Flora"}
                    </td>
                    <td className="px-5 py-4 text-xs text-black/50 dark:text-white/50">
                      {new Date(h.harvestTimestamp).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      {h.batchId ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-honey">
                          <IconBox size={13} />
                          {h.batchId}
                        </span>
                      ) : (
                        <span className="text-xs text-black/35 dark:text-white/35">Unbatched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Harvest Modal */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-paper p-6 shadow-2xl dark:border-white/10 dark:bg-paper-dark">
            <h3 className="text-lg font-bold text-ink dark:text-ink-dark">Log Honey Harvest</h3>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Record extracted honey from a specific hive to maintain provenance.
            </p>

            {modalError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-alert/20 bg-alert/5 p-3 text-xs text-alert">
                <IconAlertTriangle size={15} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateHarvest} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70">
                  Source Hive *
                </label>
                {hives.length > 0 ? (
                  <select
                    value={selectedHiveId}
                    onChange={(e) => setSelectedHiveId(e.target.value)}
                    className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                  >
                    {hives.map((h) => (
                      <option key={h._id || h.hiveId} value={h.hiveId}>
                        {h.hiveId} ({h.beeSpecies || "Apis cerana"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. HIVE-001"
                    value={selectedHiveId}
                    onChange={(e) => setSelectedHiveId(e.target.value)}
                    className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70">
                  Quantity (grams) *
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  value={quantityGrams}
                  onChange={(e) => setQuantityGrams(e.target.value)}
                  className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                />
                <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                  = {(parseFloat(quantityGrams || "0") / 1000).toFixed(2)} kg
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70">
                  Floral Origin
                </label>
                <input
                  type="text"
                  value={floralOrigin}
                  onChange={(e) => setFloralOrigin(e.target.value)}
                  placeholder="e.g. Sundarbans Wildflower / Mustard Blossom"
                  className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extraction notes, supers harvested, weather..."
                  className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-honey px-5 py-2 text-xs font-semibold text-comb hover:brightness-95 disabled:opacity-50"
                >
                  {submitting && <IconLoader2 size={14} className="animate-spin" />}
                  {submitting ? "Saving…" : "Save Harvest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
