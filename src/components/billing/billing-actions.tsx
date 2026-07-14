"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useShellUI } from "@/components/shell/shell-ui";
import { retryAllFailedAction, retryInvoiceAction } from "@/app/(console)/billing/actions";

export function RetryButton({ invoiceId }: { invoiceId: string }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await retryInvoiceAction(invoiceId);
          toast(res.message);
          router.refresh();
        })
      }
      className="flex-none cursor-pointer rounded-[7px] bg-red/12 px-[10px] py-1 text-[11px] font-semibold text-red hover:bg-red/22 disabled:opacity-50"
    >
      {pending ? "…" : "Retry"}
    </button>
  );
}

export function QuickActions() {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const stub = (msg: string) => () => toast(msg);
  const btn =
    "cursor-pointer rounded-lg border border-white/9 px-[10px] py-[7px] text-center text-xs font-medium text-mid hover:bg-white/5 disabled:opacity-50";

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await retryAllFailedAction();
            toast(res.message);
            router.refresh();
          })
        }
        className={btn}
      >
        {pending ? "Retrying…" : "Retry all failed"}
      </button>
      <button onClick={stub("Invoice drafting isn't wired yet — create it in Stripe.")} className={btn}>
        Send invoice
      </button>
      <button onClick={stub("Plan changes aren't automated yet — adjust in Stripe.")} className={btn}>
        Upgrade plan
      </button>
      <button onClick={stub("Plan changes aren't automated yet — adjust in Stripe.")} className={btn}>
        Downgrade
      </button>
    </div>
  );
}
