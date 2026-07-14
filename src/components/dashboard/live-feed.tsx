"use client";

/*
 * Recent activity card. Server-rendered with the initial rows, then polls
 * /api/feed for anything newer. (Browser Realtime is intentionally off —
 * audit_events has no anon/authenticated read policies.)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, toneBg, type Tone } from "@/components/ui";
import { timeShort } from "@/lib/format";

export interface FeedItemView {
  id: number;
  tenantName: string;
  text: string;
  tone: Tone;
  atIso: string;
}

const POLL_MS = 10_000;

export function LiveFeed({ initial }: { initial: FeedItemView[] }) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const after = items[0]?.id;
      try {
        const res = await fetch(`/api/feed${after ? `?after=${after}` : ""}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { items: FeedItemView[] };
        if (!stop && body.items.length > 0) {
          setItems((prev) => [...body.items, ...prev].slice(0, 10));
        }
      } catch {
        // engine/db hiccup — try again next tick
      }
    };
    const iv = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [items]);

  return (
    <Card>
      <CardHeader
        title="Recent activity"
        action={
          <span className="flex items-center gap-[6px] text-[11px] text-faint">
            <span className="mc-pulse-fast h-[5px] w-[5px] rounded-full bg-green" />
            Live
          </span>
        }
      />
      <div className="flex flex-col">
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-faint">
            No activity recorded yet — events appear here as the AI answers calls.
          </div>
        )}
        {items.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-[11px] border-b border-white/4 px-4 py-[9.5px] hover:bg-white/2"
          >
            <span className={`h-[7px] w-[7px] flex-none rounded-full ${toneBg(f.tone)}`} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-body">
              <b className="font-semibold text-fg">{f.tenantName}</b> {f.text}
            </span>
            <span className="flex-none font-mono text-[11px] text-ghost">
              {timeShort(f.atIso)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
