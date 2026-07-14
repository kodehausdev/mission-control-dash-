"use client";

import { useTransition } from "react";
import { useShellUI } from "@/components/shell/shell-ui";
import { toggleAiAction } from "@/app/(console)/clients/[id]/actions";

export function ProfileActions({
  tenantId,
  aiPaused,
}: {
  tenantId: string;
  aiPaused: boolean;
}) {
  const { toast } = useShellUI();
  const [pending, startTransition] = useTransition();

  const stub = (msg: string) => () => toast(msg);

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleAiAction(tenantId);
            toast(res.message);
          })
        }
        className={`cursor-pointer rounded-lg border px-[13px] py-[6px] text-xs font-semibold hover:bg-white/5 disabled:opacity-60 ${
          aiPaused ? "border-green/35 text-green" : "border-amber/35 text-amber"
        }`}
      >
        {pending ? "Working…" : aiPaused ? "Resume AI" : "Pause AI"}
      </button>
      <button
        onClick={stub("Plan changes aren't automated yet — adjust the subscription in Stripe.")}
        className="cursor-pointer rounded-lg bg-accent px-[13px] py-[6px] text-xs font-semibold text-white hover:bg-accent-hi"
      >
        Upgrade plan
      </button>
      <button
        onClick={stub("Email sending isn't wired up yet.")}
        className="cursor-pointer rounded-lg border border-white/10 px-[13px] py-[6px] text-xs font-medium text-mid hover:bg-white/5"
      >
        Send onboarding email
      </button>
      <button
        onClick={stub("Cancellations aren't automated yet — cancel the subscription in Stripe.")}
        className="cursor-pointer rounded-lg border border-red/30 px-[13px] py-[6px] text-xs font-medium text-red hover:bg-red/10"
      >
        Cancel
      </button>
    </div>
  );
}
