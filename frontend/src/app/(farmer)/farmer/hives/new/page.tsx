// src/app/(farmer)/farmer/hives/new/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconHexagon,
  IconMapPin,
  IconDeviceAnalytics,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { apiaryService } from "@/services/apiary.service";
import { hiveService } from "@/services/hive.service";
import type { Apiary } from "@/types/apiary";

export default function NewHivePage() {
  const router = useRouter();

  // Apiaries list
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [isLoadingApiaries, setIsLoadingApiaries] = useState(true);

  // Form states
  const [hiveId, setHiveId] = useState("");
  const [selectedApiaryId, setSelectedApiaryId] = useState("");
  const [createNewApiary, setCreateNewApiary] = useState(false);
  const [newApiaryName, setNewApiaryName] = useState("");
  const [newApiaryRegion, setNewApiaryRegion] = useState("");
  const [newApiaryLatitude, setNewApiaryLatitude] = useState("21.9497");
  const [newApiaryLongitude, setNewApiaryLongitude] = useState("89.1833");

  const [hiveType, setHiveType] = useState("Langstroth");
  const [beeSpecies, setBeeSpecies] = useState("Apis cerana indica");
  const [deviceId, setDeviceId] = useState("");
  const [installationDate, setInstallationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadApiaries() {
      try {
        const res = await apiaryService.getAll();
        if (mounted) {
          setApiaries(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedApiaryId(res.data[0]._id || res.data[0].apiaryId);
          } else {
            setCreateNewApiary(true);
          }
        }
      } catch {
        if (mounted) {
          setCreateNewApiary(true);
        }
      } finally {
        if (mounted) {
          setIsLoadingApiaries(false);
        }
      }
    }
    loadApiaries();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanHiveId = hiveId.trim();
    if (!cleanHiveId) {
      setError("Hive ID is required (e.g. HIVE-001).");
      return;
    }

    setSubmitting(true);
    try {
      let targetApiaryId = selectedApiaryId;

      // Create new apiary if requested or none existed
      if (createNewApiary || !targetApiaryId) {
        if (!newApiaryName.trim() || !newApiaryRegion.trim()) {
          setError("Please provide an apiary name and region.");
          setSubmitting(false);
          return;
        }

        const lat = parseFloat(newApiaryLatitude);
        const lng = parseFloat(newApiaryLongitude);

        const newApiaryRes = await apiaryService.create({
          name: newApiaryName.trim(),
          location: {
            region: newApiaryRegion.trim(),
            latitude: isNaN(lat) ? 22.0 : lat,
            longitude: isNaN(lng) ? 89.0 : lng,
          },
          floraType: ["Sundarbans Wildflower", "Mangrove Blossom"],
        });

        targetApiaryId = newApiaryRes.data._id || newApiaryRes.data.apiaryId;
      }

      await hiveService.create({
        hiveId: cleanHiveId,
        apiary: targetApiaryId,
        apiaryId: targetApiaryId,
        hiveType,
        beeSpecies,
        deviceMetadata: {
          deviceId: deviceId.trim() || `ESP32-${cleanHiveId}`,
          hardwareModel: "ESP32-WROOM-32U",
          firmwareVersion: "v2.1.0",
          batteryLevelPct: 100,
        },
        installationDate,
        notes: notes.trim() || undefined,
      });

      router.push("/farmer/hives");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to register hive. Check that Hive ID is unique.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/farmer/hives"
          className="mb-4 inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-ink dark:text-white/50 dark:hover:text-white"
        >
          <IconArrowLeft size={17} />
          Back to Hives
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconHexagon size={26} />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Hive</h1>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Register a smart IoT-connected hive to your apiary sanctuary.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-alert/20 bg-alert/5 p-4 text-sm text-alert">
          <IconAlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Apiary Selection */}
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconMapPin size={20} className="text-honey" />
              <h2 className="font-semibold">Apiary Sanctuary</h2>
            </div>

            {apiaries.length > 0 && (
              <button
                type="button"
                onClick={() => setCreateNewApiary(!createNewApiary)}
                className="text-xs font-semibold text-honey hover:underline"
              >
                {createNewApiary ? "Use existing apiary" : "+ Create new apiary"}
              </button>
            )}
          </div>

          {createNewApiary || apiaries.length === 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-black/50 dark:text-white/50">
                Provide details for the apiary location where this hive is situated.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                    Apiary Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newApiaryName}
                    onChange={(e) => setNewApiaryName(e.target.value)}
                    placeholder="Sundarbans Honey Sanctuary A"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                    Region *
                  </label>
                  <input
                    type="text"
                    required
                    value={newApiaryRegion}
                    onChange={(e) => setNewApiaryRegion(e.target.value)}
                    placeholder="Sundarbans, West Bengal"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newApiaryLatitude}
                    onChange={(e) => setNewApiaryLatitude(e.target.value)}
                    placeholder="21.9497"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newApiaryLongitude}
                    onChange={(e) => setNewApiaryLongitude(e.target.value)}
                    placeholder="89.1833"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Select Apiary *
              </label>
              <select
                value={selectedApiaryId}
                onChange={(e) => setSelectedApiaryId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              >
                {apiaries.map((a) => (
                  <option key={a._id || a.apiaryId} value={a._id || a.apiaryId}>
                    {a.name} ({a.location?.region || a.apiaryId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Section 2: Hive Details */}
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center gap-2">
            <IconHexagon size={20} className="text-honey" />
            <h2 className="font-semibold">Hive Characteristics</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Hive ID *
              </label>
              <input
                type="text"
                required
                value={hiveId}
                onChange={(e) => setHiveId(e.target.value)}
                placeholder="e.g. HIVE-101"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Hive Type
              </label>
              <select
                value={hiveType}
                onChange={(e) => setHiveType(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              >
                <option value="Langstroth">Langstroth</option>
                <option value="Top-Bar">Top-Bar</option>
                <option value="Warre">Warre</option>
                <option value="Indian Standard (ISI)">Indian Standard (ISI)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Bee Species
              </label>
              <select
                value={beeSpecies}
                onChange={(e) => setBeeSpecies(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              >
                <option value="Apis cerana indica">Apis cerana indica (Indian Honey Bee)</option>
                <option value="Apis mellifera">Apis mellifera (Western Honey Bee)</option>
                <option value="Apis dorsata">Apis dorsata (Giant Honey Bee)</option>
                <option value="Apis florea">Apis florea (Little Honey Bee)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Installation Date
              </label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Hardware / IoT Gateway */}
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center gap-2">
            <IconDeviceAnalytics size={20} className="text-honey" />
            <h2 className="font-semibold">IoT Gateway & Sensors</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Hardware Device ID
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder={`ESP32-${hiveId || "HIVE-001"}`}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
              <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                Default: ESP32-[HiveId]. Used for MQTT and sensor telemetry routing.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/70 dark:text-white/70">
                Operational Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Queen introduced August 2026, high nectar intake"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/farmer/hives"
            className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-honey px-6 py-2.5 text-sm font-semibold text-comb shadow-xs transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting && <IconLoader2 size={16} className="animate-spin" />}
            {submitting ? "Registering…" : "Register Hive"}
          </button>
        </div>
      </form>
    </div>
  );
}