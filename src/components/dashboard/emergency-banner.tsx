"use client";

import { useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { EmergencyEvent } from "@/lib/server/activity";

/**
 * Dismissible per-session (client-side state only, same as the amber
 * health-score AlertBanner) — the underlying emergency.detected event stays
 * in the audit trail and on AI Health/Conversations regardless, this only
 * clears the Dashboard banner so it doesn't sit there once it's been seen
 * and handled.
 */
export function EmergencyBanner({ events }: { events: EmergencyEvent[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (events.length === 0 || dismissed) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-red/35 bg-red/10 px-[14px] py-[12px]">
      <div className="flex items-center gap-[10px]">
        <span className="mc-pulse-fast h-[8px] w-[8px] flex-none rounded-full bg-red" />
        <span className="text-[13px] font-semibold text-red-soft">
          {events.length === 1
            ? "Emergency redirect fired in the last 24h"
            : `${events.length} emergency redirects fired in the last 24h`}
        </span>
        <span className="flex-1" />
        <button
          onClick={() => setDismissed(true)}
          title="Dismiss"
          className="cursor-pointer px-1 text-[14px] text-red-soft hover:text-red"
        >
          ×
        </button>
      </div>
      <div className="flex flex-col gap-[6px] pl-[18px]">
        {events.slice(0, 4).map((e) => (
          <div key={e.id} className="flex items-center gap-[10px] text-[12px]">
            <span className="text-red-soft">
              <b className="text-fg">{e.tenantName}</b>
              {e.phoneTail ? ` — caller ··${e.phoneTail}` : ""} · {timeAgo(e.atIso)}
            </span>
            <span className="flex-1" />
            {e.tenantId && (
              <Link
                href={`/clients/${encodeURIComponent(e.tenantId)}`}
                className="cursor-pointer rounded-[6px] border border-red/30 px-[9px] py-[3px] text-[11px] font-semibold !text-red hover:bg-red/12"
              >
                View client
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
