"use client";

import {
  IconCheck,
  IconCircle,
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react";
import type { CustodyEvent } from "@/types/batch";

interface ExtendedCustodyEvent extends CustodyEvent {
  stage?: string;
  eventType?: string;
  etherscanUrl?: string;
  details?: Record<string, any>;
}

interface TraceabilityTimelineProps {
  events: ExtendedCustodyEvent[];
}

export default function TraceabilityTimeline({
  events,
}: TraceabilityTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        No custody events recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        // Smart timestamp parsing: convert Unix seconds to milliseconds
        const rawTs = Number(event.timestamp);
        const dateObj = new Date(rawTs < 1e11 ? rawTs * 1000 : rawTs);
        const formattedDate = isNaN(dateObj.getTime())
          ? "Recorded on chain"
          : dateObj.toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

        const stageTitle =
          event.stage ||
          event.eventType ||
          (event.from && event.to ? `${event.from} → ${event.to}` : "Custody Event");

        const location =
          event.location ||
          event.details?.location ||
          (stageTitle.includes("Harvest") ? "Sundarbans Biosphere Reserve" : "Verified Facility");

        const txHash = event.txHash;
        const etherscanUrl =
          event.etherscanUrl ||
          (txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : undefined);

        return (
          <div key={`${txHash || "evt"}-${index}-${event.timestamp}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey/10 text-honey">
                {isLast ? (
                  <IconCheck size={18} />
                ) : (
                  <IconCircle size={12} />
                )}
              </div>

              {!isLast && (
                <div className="h-full min-h-14 w-px bg-black/10 dark:bg-white/10" />
              )}
            </div>

            <div className="pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-honey/15 px-2 py-0.5 text-xs font-semibold text-honey">
                  {stageTitle}
                </span>
                {event.blockNumber && (
                  <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-black/60 dark:bg-white/5 dark:text-white/60">
                    Block #{event.blockNumber}
                  </span>
                )}
              </div>

              {event.from && event.to && (
                <p className="mt-1 text-sm font-semibold">
                  <span className="font-mono text-xs font-normal opacity-80">{event.from}</span>
                  <span className="mx-1 text-honey">→</span>
                  <span className="font-mono text-xs font-normal opacity-80">{event.to}</span>
                </p>
              )}

              <div className="mt-1 flex items-center gap-1.5 text-xs text-black/60 dark:text-white/60">
                <IconMapPin size={14} className="shrink-0 text-honey" />
                <span>{location}</span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <p className="text-xs text-black/40 dark:text-white/40">
                  {formattedDate}
                </p>

                {etherscanUrl && (
                  <a
                    href={etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-honey transition hover:underline"
                    title={`View transaction ${txHash} on Ethereum Sepolia Etherscan`}
                  >
                    Sepolia Tx
                    <IconExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}