"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShellUI } from "@/components/shell/shell-ui";
import {
  convertLeadToClientAction,
  createLeadAction,
  deleteLeadAction,
  moveLeadAction,
} from "@/app/(console)/leads/actions";
import type { LeadRow, Stage } from "@/lib/server/leads";
import { money, timeShort } from "@/lib/format";

export interface BoardColumn {
  stage: Stage;
  label: string;
  color: string;
  sumCents: number;
  cards: LeadRow[];
}

const ORDER: Stage[] = [
  "new",
  "demo_scheduled",
  "demo_completed",
  "proposal_sent",
  "won",
  "lost",
];

function NewLeadDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createLeadAction({
        business: String(fd.get("business") ?? ""),
        ownerName: String(fd.get("owner") ?? ""),
        industry: String(fd.get("industry") ?? ""),
        note: String(fd.get("note") ?? ""),
        valueDollars: Number(fd.get("value")) || undefined,
        phone: String(fd.get("phone") ?? ""),
        email: String(fd.get("email") ?? ""),
      });
      toast(res.message);
      if (res.ok) {
        onClose();
        router.refresh();
      }
    });
  }

  const input =
    "w-full rounded-[8px] border border-white/8 bg-field px-3 py-2 text-[12.5px] text-fg placeholder:text-faint focus:border-accent/50";

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
          New lead
        </div>
        <div className="flex flex-col gap-[10px] p-[17px]">
          <input name="business" required placeholder="Business name *" className={input} />
          <div className="grid grid-cols-2 gap-[10px]">
            <input name="owner" placeholder="Owner / contact" className={input} />
            <input name="industry" placeholder="Industry (e.g. Dental)" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            <input
              name="value"
              type="number"
              min="0"
              step="1"
              placeholder="Est. value $/mo"
              className={input}
            />
            <input name="phone" placeholder="Phone" className={input} />
          </div>
          <input name="email" type="email" placeholder="Email" className={input} />
          <textarea name="note" rows={3} placeholder="Notes" className={`${input} resize-none`} />
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
            {pending ? "Adding…" : "Add lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const idx = ORDER.indexOf(lead.stage);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  const move = (stage: Stage) =>
    startTransition(async () => {
      const res = await moveLeadAction(lead.id, stage);
      toast(res.message);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteLeadAction(lead.id);
      toast(res.message);
      router.refresh();
    });

  const convert = () =>
    startTransition(async () => {
      const res = await convertLeadToClientAction(lead.id);
      toast(res.message);
      if (res.ok && res.id) {
        router.push(`/clients/${encodeURIComponent(res.id)}`);
      } else {
        router.refresh();
      }
    });

  return (
    <div
      className={`group rounded-[10px] border border-white/6 bg-card px-[13px] py-[11px] shadow-[0_1px_2px_rgba(0,0,0,.35)] hover:border-accent/45 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 text-[13px] font-semibold">{lead.business}</div>
        <button
          onClick={remove}
          title="Delete lead"
          className="hidden cursor-pointer text-[13px] text-ghost hover:text-red group-hover:block"
        >
          ×
        </button>
      </div>
      <div className="mt-[2px] text-[11.5px] text-muted">
        {[lead.ownerName, lead.industry].filter(Boolean).join(" · ") || "—"}
      </div>
      {lead.note && (
        <div className="mt-[7px] text-[11.5px] leading-[1.5] text-soft">{lead.note}</div>
      )}
      <div className="mt-[9px] flex items-center gap-[6px]">
        <span className="font-mono text-[11px] font-semibold text-green">
          {lead.valueCents != null ? `${money(lead.valueCents)}/mo` : "—"}
        </span>
        <span className="flex-1" />
        <span className="font-mono text-[10.5px] text-faint">{timeShort(lead.updatedAt)}</span>
      </div>

      {lead.stage === "won" && (
        <div className="mt-[9px]">
          {lead.tenantId ? (
            <Link
              href={`/clients/${encodeURIComponent(lead.tenantId)}`}
              className="block w-full cursor-pointer rounded-md bg-green/12 py-[5px] text-center text-[10.5px] font-semibold text-green hover:bg-green/22"
            >
              View client →
            </Link>
          ) : (
            <button
              disabled={pending}
              onClick={convert}
              className="w-full cursor-pointer rounded-md bg-green/15 py-[5px] text-[10.5px] font-semibold text-green hover:bg-green/26 disabled:opacity-50"
            >
              {pending ? "Converting…" : "Convert to client"}
            </button>
          )}
        </div>
      )}

      <div className="mt-2 hidden justify-between gap-1 group-hover:flex">
        <button
          disabled={!prev || pending}
          onClick={() => prev && move(prev)}
          className="flex-1 cursor-pointer rounded-md border border-white/8 py-[3px] text-[10.5px] text-soft hover:bg-white/5 disabled:opacity-30"
        >
          ‹ back
        </button>
        <button
          disabled={!next || pending}
          onClick={() => next && move(next)}
          className="flex-1 cursor-pointer rounded-md bg-accent/15 py-[3px] text-[10.5px] font-semibold text-lav hover:bg-accent/28 disabled:opacity-30"
        >
          advance ›
        </button>
      </div>
    </div>
  );
}

export function LeadsBoardView({
  columns,
  pipelineCents,
  demoWinRatePct,
}: {
  columns: BoardColumn[];
  pipelineCents: number;
  demoWinRatePct: number | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[19px] font-semibold tracking-[-.02em]">Leads</div>
          <div className="mt-[2px] text-[12.5px] text-muted">
            {money(pipelineCents)}/mo in pipeline
            {demoWinRatePct !== null ? ` · ${demoWinRatePct}% demo → won` : " · no closed deals yet"}
          </div>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white shadow-[0_2px_10px_rgba(108,92,231,.35)] hover:bg-accent-hi"
        >
          New lead
        </button>
      </div>

      <div className="flex items-start gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div key={col.stage} className="flex w-[236px] flex-none flex-col gap-2">
            <div className="flex items-center gap-[7px] px-[3px]">
              <span
                className="h-[7px] w-[7px] rounded-[2.5px]"
                style={{ background: col.color }}
              />
              <span className="text-xs font-semibold">{col.label}</span>
              <span className="font-mono text-[11px] text-faint">{col.cards.length}</span>
              <span className="flex-1" />
              <span className="font-mono text-[11px] text-faint">
                {col.sumCents > 0 ? money(col.sumCents) : ""}
              </span>
            </div>
            {col.cards.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
            {col.cards.length === 0 && (
              <div className="rounded-[10px] border border-dashed border-white/8 px-3 py-4 text-center text-[11px] text-ghost">
                Empty
              </div>
            )}
          </div>
        ))}
      </div>

      {dialogOpen && <NewLeadDialog onClose={() => setDialogOpen(false)} />}
    </>
  );
}
