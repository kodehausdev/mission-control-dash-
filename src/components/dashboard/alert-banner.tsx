"use client";

import Link from "next/link";
import { useState } from "react";

export function AlertBanner({
  clientId,
  clientName,
  message,
}: {
  clientId: string;
  clientName: string;
  message: string;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <div className="flex items-center gap-[11px] rounded-[10px] border border-amber/22 bg-amber/8 px-[14px] py-[10px]">
      <span className="mc-pulse-fast h-[7px] w-[7px] flex-none rounded-full bg-amber" />
      <span className="text-[12.5px] text-amber-soft">
        <b className="text-amber-bright">{clientName}</b> — {message}
      </span>
      <div className="flex-1" />
      <Link
        href={`/clients/${encodeURIComponent(clientId)}`}
        className="cursor-pointer rounded-[7px] border border-amber/30 px-[10px] py-1 text-xs font-semibold !text-amber hover:bg-amber/12"
      >
        View client
      </Link>
      <button
        onClick={() => setGone(true)}
        className="cursor-pointer px-1 text-[14px] text-amber-dim hover:text-amber"
      >
        ×
      </button>
    </div>
  );
}
