"use client";

import { usePathname } from "next/navigation";
import { BRANDING } from "@/lib/branding";
import { useShellUI } from "./shell-ui";
import { IconBell, IconSearch } from "./icons";

const TITLES: [prefix: string, title: string][] = [
  ["/dashboard", "Dashboard"],
  ["/clients", "Clients"],
  ["/leads", "Leads"],
  ["/trials", "Trials"],
  ["/billing", "Billing"],
  ["/support", "Support"],
  ["/conversations", "Conversations"],
  ["/ai-health", "AI Health"],
  ["/analytics", "Analytics"],
  ["/settings", "Settings"],
];

export function Topbar({
  system,
  hasUnread,
}: {
  system: { ok: boolean; label: string };
  hasUnread: boolean;
}) {
  const pathname = usePathname();
  const { openCmd, toggleNotif } = useShellUI();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Dashboard";

  return (
    <div className="flex h-12 flex-none items-center gap-3 border-b border-white/6 px-5">
      <div className="flex min-w-0 items-baseline gap-[7px]">
        <span className="text-xs text-faint">{BRANDING.product}</span>
        <span className="text-xs text-slash">/</span>
        <span className="text-[13px] font-semibold">{title}</span>
      </div>
      <div className="flex-1" />

      <button
        onClick={openCmd}
        className="flex w-[260px] cursor-pointer items-center gap-2 rounded-lg border border-white/7 bg-field px-[10px] py-[5px] text-faint hover:border-white/16 hover:text-soft"
      >
        <IconSearch />
        <span className="flex-1 text-left text-xs">Search clients, invoices, leads…</span>
        <span className="rounded bg-white/6 px-[5px] py-px font-mono text-[10px] text-faint">
          ⌘K
        </span>
      </button>

      <button
        onClick={toggleNotif}
        className="relative flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border border-transparent text-soft hover:bg-white/5 hover:text-fg"
      >
        <IconBell />
        {hasUnread && (
          <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-bg bg-red" />
        )}
      </button>

      <div
        className={`flex items-center gap-[6px] rounded-lg border px-[9px] py-1 ${
          system.ok ? "border-green/18 bg-green/9" : "border-amber/22 bg-amber/8"
        }`}
      >
        <span
          className={`mc-pulse h-[6px] w-[6px] rounded-full ${system.ok ? "bg-green" : "bg-amber"}`}
        />
        <span className={`text-[11px] font-medium ${system.ok ? "text-green" : "text-amber"}`}>
          {system.label}
        </span>
      </div>
    </div>
  );
}
