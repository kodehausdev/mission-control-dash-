"use client";

import { useRouter } from "next/navigation";
import { useShellUI } from "./shell-ui";
import { toneBg, type Tone } from "@/components/ui";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  tone: Tone;
  atLabel: string;
  href: string;
}

export function NotifDrawer({ items }: { items: NotificationItem[] }) {
  const { toggleNotif } = useShellUI();
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-60" onClick={toggleNotif}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-4 top-[54px] max-h-[calc(100vh-80px)] w-[360px] overflow-y-auto rounded-[13px] border border-white/9 bg-pop shadow-[0_18px_50px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-[13px]">
          <span className="text-[13px] font-semibold">Notifications</span>
          <span className="text-[11px] text-faint">live, derived from current state</span>
        </div>
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-faint">
            Nothing needs your attention right now.
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              toggleNotif();
              router.push(n.href);
            }}
            className="flex w-full cursor-pointer gap-[11px] border-b border-white/4 px-4 py-[11px] text-left hover:bg-white/3"
          >
            <span className={`mt-[5px] h-[7px] w-[7px] flex-none rounded-full ${toneBg(n.tone)}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium leading-[1.4]">{n.title}</span>
              <span className="mt-[2px] block text-[11.5px] leading-[1.45] text-muted">
                {n.body}
              </span>
            </span>
            <span className="flex-none font-mono text-[10.5px] text-ghost">{n.atLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
