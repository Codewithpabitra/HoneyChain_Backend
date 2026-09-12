"use client";

import React from "react";
import { IconActivity, IconBattery, IconClock } from "@tabler/icons-react";
import type { TelemetryHistoryPoint } from "@/types/telemetry";

interface HiveTabItem {
  hiveId: string;
  count?: number;
}

interface RecentTelemetryTableProps {
  readings: TelemetryHistoryPoint[];
  hiveId?: string;
  loading?: boolean;
  isSocketConnected?: boolean;
  title?: string;
  subtitle?: string;
  hives?: HiveTabItem[];
  selectedHiveId?: string;
  onSelectHive?: (hiveId: string) => void;
}

export default function RecentTelemetryTable({
  readings,
  hiveId,
  loading = false,
  isSocketConnected = false,
  title = "Live Telemetry Rolling Buffer (Last 10 Readings)",
  subtitle,
  hives,
  selectedHiveId,
  onSelectHive,
}: RecentTelemetryTableProps) {
  // Sort descending by timestamp (newest first) and cap strictly at 10 items
  const displayReadings = React.useMemo(() => {
    if (!readings || readings.length === 0) return [];
    return [...readings]
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [readings]);

  const activeHiveId = selectedHiveId || hiveId;

  // Check whether the feed has recent activity (<= 2 minutes)
  const isFeedLive = React.useMemo(() => {
    if (displayReadings.length === 0) return false;
    const latestTime = new Date(displayReadings[0].timestamp).getTime();
    if (isNaN(latestTime)) return false;
    return Math.abs(Date.now() - latestTime) <= 120000;
  }, [displayReadings]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/3">
      {/* Table Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-black/5 pb-4 dark:border-white/5 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-honey/15 text-honey">
              <IconActivity size={16} />
            </div>
            <h3 className="text-base font-semibold text-ink dark:text-ink-dark">
              {title}
            </h3>
            {activeHiveId && (
              <span className="font-mono text-xs font-bold text-honey">
                [{activeHiveId}]
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isFeedLive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-black/5 text-black/50 dark:bg-white/5 dark:text-white/50"
            }`}>
              {displayReadings.length} / 10 in Buffer
            </span>
          </div>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            {subtitle ||
              "Real-time high-frequency telemetry buffered in Redis (10-reading rolling window) and streamed over Socket.IO."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Optional Hive Tabs */}
          {hives && hives.length > 0 && onSelectHive && (
            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
              {hives.map((h) => {
                const isSelected = activeHiveId === h.hiveId;
                return (
                  <button
                    key={h.hiveId}
                    type="button"
                    onClick={() => onSelectHive(h.hiveId)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                        : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
                    }`}
                  >
                    {h.hiveId}
                    {typeof h.count === "number" && (
                      <span className="ml-1 text-[10px] opacity-60">
                        ({h.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Feed and Socket Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Device Feed Status */}
            {displayReadings.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-black/2 px-2.5 py-1 text-black/50 dark:border-white/5 dark:bg-white/5 dark:text-white/50">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span>Standby • Awaiting Hardware</span>
              </span>
            ) : isFeedLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">Live Streaming</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Hardware Standby (Offline)</span>
              </span>
            )}

            {/* WebSocket Stream Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-black/2 px-2.5 py-1 text-black/60 dark:border-white/5 dark:bg-white/5 dark:text-white/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isSocketConnected ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              <span className="text-[11px]">
                {isSocketConnected ? "Socket Stream Ready" : "Connecting..."}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-xs text-black/50 dark:text-white/50">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
            Loading latest 10 readings from Redis...
          </div>
        ) : displayReadings.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-black/10 p-6 text-center text-xs text-black/50 dark:border-white/10 dark:text-white/50">
            <IconClock size={24} className="mb-2 text-honey/70" />
            <p className="font-semibold text-ink dark:text-ink-dark">
              Awaiting live telemetry from {activeHiveId ? `[${activeHiveId}]` : "edge gateway"}
            </p>
            <p className="mt-1 max-w-md text-[11px] text-black/40 dark:text-white/40">
              No live readings in buffer. When your physical hardware gateway transmits, sensor data will stream here in real time.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/10 text-black/60 dark:border-white/10 dark:text-white/60">
                <th className="pb-3 font-semibold">Row</th>
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">IoT Device</th>
                <th className="pb-3 font-semibold">Brood Temp</th>
                <th className="pb-3 font-semibold">Humidity</th>
                <th className="pb-3 font-semibold">Hive Weight</th>
                <th className="pb-3 font-semibold">Bee Traffic</th>
                <th className="pb-3 font-semibold">Battery</th>
                <th className="pb-3 font-semibold text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {displayReadings.map((r, idx) => {
                const isLatest = idx === 0;
                const rawTimestamp = r.timestamp;
                const date = new Date(rawTimestamp);
                const isValidDate = !isNaN(date.getTime());

                const timeFormatted = isValidDate
                  ? date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : String(rawTimestamp);

                const dateFormatted = isValidDate
                  ? date.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })
                  : "";

                // Safe extraction of the exact 9 hardware inputs
                const deviceIdVal = r.deviceId || (r as any).deviceMetadata?.deviceId || null;
                const tempVal =
                  typeof r.temperature === "number" ? r.temperature : null;
                const humidityVal =
                  typeof r.humidity === "number" ? r.humidity : null;
                const weightVal =
                  typeof r.weightKg === "number"
                    ? r.weightKg
                    : typeof (r as any).weight === "number"
                    ? (r as any).weight
                    : null;
                const batteryVal =
                  typeof r.batteryLevelPct === "number"
                    ? r.batteryLevelPct
                    : typeof (r as any).battery === "number"
                    ? (r as any).battery
                    : null;
                const beeIn =
                  typeof r.beeInCount === "number" ? r.beeInCount : null;
                const beeOut =
                  typeof r.beeOutCount === "number" ? r.beeOutCount : null;
                const netFlow =
                  typeof r.flow === "number"
                    ? r.flow
                    : beeIn !== null && beeOut !== null
                    ? beeIn - beeOut
                    : null;

                const isTempAbnormal =
                  tempVal !== null && (tempVal < 33 || tempVal > 37);

                return (
                  <tr
                    key={r.id || `${rawTimestamp}-${idx}`}
                    className={`transition-colors ${
                      isLatest
                        ? "bg-honey/8 font-medium hover:bg-honey/12 dark:bg-honey/10 dark:hover:bg-honey/15"
                        : "hover:bg-black/2 dark:hover:bg-white/2"
                    }`}
                  >
                    {/* Row & Latest Indicator */}
                    <td className="py-3 pr-2">
                      {isLatest ? (
                        isFeedLive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/50 dark:bg-white/5 dark:text-white/50">
                            RECORDED
                          </span>
                        )
                      ) : (
                        <span className="font-mono text-xs text-black/40 dark:text-white/40">
                          #{idx + 1}
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 pr-4 font-mono text-xs text-ink dark:text-ink-dark">
                      <span className="font-semibold">{timeFormatted}</span>
                      {dateFormatted && (
                        <span className="ml-1.5 text-[11px] text-black/40 dark:text-white/40">
                          {dateFormatted}
                        </span>
                      )}
                    </td>

                    {/* IoT Device Gateway */}
                    <td className="py-3 pr-4 font-mono text-xs text-black/60 dark:text-white/60">
                      {deviceIdVal ? (
                        <span className="rounded bg-black/4 px-1.5 py-0.5 dark:bg-white/5">
                          {deviceIdVal}
                        </span>
                      ) : activeHiveId ? (
                        <span className="text-black/40 dark:text-white/40">{activeHiveId}</span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>

                    {/* Temperature */}
                    <td className="py-3 pr-4">
                      {tempVal !== null ? (
                        <span
                          className={`font-semibold ${
                            isTempAbnormal
                              ? "text-alert font-bold"
                              : "text-ink dark:text-ink-dark"
                          }`}
                        >
                          {tempVal.toFixed(1)}°C
                        </span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>

                    {/* Humidity */}
                    <td className="py-3 pr-4 text-ink dark:text-ink-dark">
                      {humidityVal !== null ? (
                        <span>{humidityVal.toFixed(1)}%</span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>

                    {/* Weight */}
                    <td className="py-3 pr-4 font-mono text-ink dark:text-ink-dark">
                      {weightVal !== null ? (
                        <span>{weightVal.toFixed(2)} kg</span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>

                    {/* Bee Traffic (In / Out) */}
                    <td className="py-3 pr-4">
                      {beeIn !== null || beeOut !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{beeIn ?? 0} in
                          </span>
                          <span className="text-black/30 dark:text-white/30">/</span>
                          <span className="text-amber-600 dark:text-amber-400">
                            -{beeOut ?? 0} out
                          </span>
                        </span>
                      ) : netFlow !== null ? (
                        <span
                          className={`font-medium ${
                            netFlow >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {netFlow > 0 ? `+${netFlow}` : netFlow} net
                        </span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>

                    {/* Battery */}
                    <td className="py-3 pr-4">
                      {batteryVal !== null ? (
                        <span className="inline-flex items-center gap-1 font-medium text-black/70 dark:text-white/70">
                          <IconBattery size={13} className="text-honey" />
                          {batteryVal}%
                        </span>
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 text-right">
                      {isFeedLive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Live Buffer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-black/60 dark:bg-white/5 dark:text-white/40">
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
