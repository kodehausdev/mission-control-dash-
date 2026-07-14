"use client";

import { Suspense, useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShellUI } from "@/components/shell/shell-ui";
import { createClientAction } from "@/app/(console)/clients/actions";

const inputCls =
  "w-full rounded-[8px] border border-white/8 bg-field px-3 py-2 text-[12.5px] text-fg placeholder:text-faint focus:border-accent/50";

function Dialog({
  plans,
  defaultTrialDays,
  onClose,
}: {
  plans: string[];
  defaultTrialDays: number;
  onClose: () => void;
}) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"trial" | "active">("trial");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createClientAction({
        business: String(fd.get("business") ?? ""),
        industry: String(fd.get("industry") ?? ""),
        ownerName: String(fd.get("owner") ?? ""),
        ownerEmail: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        plan: String(fd.get("plan") ?? plans[0] ?? "starter"),
        status,
        trialDays: Number(fd.get("trialDays")) || defaultTrialDays,
      });
      toast(res.message);
      if (res.ok && res.id) {
        onClose();
        router.push(`/clients/${encodeURIComponent(res.id)}`);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-70 flex justify-center bg-[rgba(6,6,10,.6)] pt-[14vh]"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="h-fit w-[460px] overflow-hidden rounded-[14px] border border-white/10 bg-pop shadow-[0_24px_70px_rgba(0,0,0,.6)]"
      >
        <div className="border-b border-white/6 px-[17px] py-[13px] text-[13px] font-semibold">
          New client
        </div>
        <div className="flex flex-col gap-[10px] p-[17px]">
          <input name="business" required placeholder="Business name *" className={inputCls} />
          <div className="grid grid-cols-2 gap-[10px]">
            <input name="industry" placeholder="Industry (e.g. Dental)" className={inputCls} />
            <select name="plan" defaultValue={plans[0] ?? "starter"} className={inputCls}>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            <input name="owner" placeholder="Owner / contact name" className={inputCls} />
            <input name="email" type="email" placeholder="Owner email" className={inputCls} />
          </div>
          <input name="phone" placeholder="Voice number (leave blank if not provisioned)" className={inputCls} />

          <div className="mt-1 flex items-center gap-4 text-[12.5px]">
            <label className="flex cursor-pointer items-center gap-[6px]">
              <input
                type="radio"
                name="statusPick"
                checked={status === "trial"}
                onChange={() => setStatus("trial")}
              />
              Start on trial
            </label>
            <label className="flex cursor-pointer items-center gap-[6px]">
              <input
                type="radio"
                name="statusPick"
                checked={status === "active"}
                onChange={() => setStatus("active")}
              />
              Start active
            </label>
          </div>
          {status === "trial" && (
            <input
              name="trialDays"
              type="number"
              min="1"
              defaultValue={defaultTrialDays}
              placeholder="Trial length (days)"
              className={`${inputCls} w-[140px] font-mono`}
            />
          )}

          <div className="text-[11px] leading-[1.5] text-faint">
            Numbers, WhatsApp, and billing are configured separately once the deal is
            provisioned — this just creates the client record.
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/6 px-[17px] py-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-white/10 px-3 py-[6px] text-xs font-medium text-mid hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white hover:bg-accent-hi disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create client"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Renders the "New client" trigger. Also auto-opens when the URL carries
 * ?new=1 — the Dashboard's "New client" shortcut links here since the
 * dialog only lives on the Clients page.
 */
function NewClientButtonInner({
  plans,
  defaultTrialDays,
}: {
  plans: string[];
  defaultTrialDays: number;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") queueMicrotask(() => setOpen(true));
  }, [params]);

  const close = () => {
    setOpen(false);
    if (params.get("new") === "1") router.replace("/clients");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white shadow-[0_2px_10px_rgba(108,92,231,.35)] hover:bg-accent-hi"
      >
        New client
      </button>
      {open && <Dialog plans={plans} defaultTrialDays={defaultTrialDays} onClose={close} />}
    </>
  );
}

export function NewClientButton(props: { plans: string[]; defaultTrialDays: number }) {
  return (
    <Suspense
      fallback={
        <button
          disabled
          className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white opacity-60"
        >
          New client
        </button>
      }
    >
      <NewClientButtonInner {...props} />
    </Suspense>
  );
}
