"use client";

import {
  IconCheck,
  IconCircle,
  IconMapPin,
} from "@tabler/icons-react";
import type { CustodyEvent } from "@/types/batch";

interface TraceabilityTimelineProps {
  events: CustodyEvent[];
}

export default function TraceabilityTimeline({
  events,
}: TraceabilityTimelineProps) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <div key={`${event.txHash}-${event.timestamp}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey/10 text-honey">
                {isLast ? (
                  <IconCheck size={18} />
                ) : (
                  <IconCircle size={12} />
                )}
              </div>

              {!isLast && (
                <div className="h-full min-h-12 w-px bg-black/10 dark:bg-white/10" />
              )}
            </div>

            <div className="pb-7">
              <p className="text-sm font-semibold">
                {event.from} → {event.to}
              </p>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
                <IconMapPin size={14} />
                {event.location}
              </div>

              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}