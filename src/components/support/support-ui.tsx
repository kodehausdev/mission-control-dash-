"use client";

import { useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useShellUI } from "@/components/shell/shell-ui";
import {
  createTicketAction,
  replyToTicketAction,
  resolveTicketAction,
} from "@/app/(console)/support/actions";

export function ReplyBox({ ticketId, clientName }: { ticketId: number; clientName: string }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () => {
    if (!value.trim() || pending) return;
    startTransition(async () => {
      const res = await replyToTicketAction(ticketId, value);
      toast(res.message);
      if (res.ok) setValue("");
      router.refresh();
    });
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <input
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKey}
      placeholder={`Reply to ${clientName}… (⏎ to send)`}
      className="w-full rounded-[9px] border border-white/8 bg-field px-[13px] py-[9px] text-[12.5px] text-fg placeholder:text-faint focus:border-accent/50 disabled:opacity-60"
    />
  );
}

export function ResolveButton({ ticketId, resolved }: { ticketId: number; resolved: boolean }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (resolved) {
    return <span className="text-[11px] font-semibold text-green">Resolved</span>;
  }
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await resolveTicketAction(ticketId);
          toast(res.message);
          router.refresh();
        })
      }
      className="cursor-pointer rounded-lg bg-green/12 px-3 py-[5px] text-xs font-semibold text-green hover:bg-green/22 disabled:opacity-50"
    >
      {pending ? "Working…" : "Mark resolved"}
    </button>
  );
}

export function NewTicketButton({ tenants }: { tenants: { id: string; name: string }[] }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createTicketAction({
        subject: String(fd.get("subject") ?? ""),
        tenantId: String(fd.get("tenant") ?? "") || undefined,
        priority: String(fd.get("priority") ?? "normal"),
        channel: String(fd.get("channel") ?? "email"),
        body: String(fd.get("body") ?? ""),
      });
      toast(res.message);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  const input =
    "w-full rounded-[8px] border border-white/8 bg-field px-3 py-2 text-[12.5px] text-fg placeholder:text-faint focus:border-accent/50";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[7px] bg-accent/15 px-[10px] py-1 text-[11px] font-semibold text-lav hover:bg-accent/28"
      >
        New ticket
      </button>
      {open && (
        <div
          className="fixed inset-0 z-70 flex justify-center bg-[rgba(6,6,10,.6)] pt-[14vh]"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="h-fit w-[460px] overflow-hidden rounded-[14px] border border-white/10 bg-pop shadow-[0_24px_70px_rgba(0,0,0,.6)]"
          >
            <div className="border-b border-white/6 px-[17px] py-[13px] text-[13px] font-semibold">
              New support ticket
            </div>
            <div className="flex flex-col gap-[10px] p-[17px]">
              <input name="subject" required placeholder="Subject *" className={input} />
              <div className="grid grid-cols-2 gap-[10px]">
                <select name="tenant" className={input} defaultValue="">
                  <option value="">No client</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select name="priority" className={input} defaultValue="normal">
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <select name="channel" className={input} defaultValue="email">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <textarea
                name="body"
                rows={3}
                placeholder="First note (optional)"
                className={`${input} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-white/6 px-[17px] py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg border border-white/10 px-3 py-[6px] text-xs font-medium text-mid hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white hover:bg-accent-hi disabled:opacity-60"
              >
                {pending ? "Creating…" : "Create ticket"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
