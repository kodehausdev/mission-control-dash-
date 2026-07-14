"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useShellUI } from "@/components/shell/shell-ui";
import { convertTrialAction, extendTrialAction } from "@/app/(console)/trials/actions";

export function TrialActions({ tenantId }: { tenantId: string }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      toast(res.message);
      router.refresh();
    });

  return (
    <span className="flex justify-end gap-[6px]">
      <button
        disabled={pending}
        onClick={() => run(() => convertTrialAction(tenantId))}
        className="cursor-pointer rounded-[7px] bg-accent/15 px-[10px] py-1 text-[11px] font-semibold text-lav hover:bg-accent/28 disabled:opacity-50"
      >
        Convert
      </button>
      <button
        disabled={pending}
        onClick={() => run(() => extendTrialAction(tenantId, 7))}
        className="cursor-pointer rounded-[7px] border border-white/10 px-[10px] py-1 text-[11px] font-medium text-soft hover:bg-white/5 disabled:opacity-50"
      >
        Extend
      </button>
    </span>
  );
}
