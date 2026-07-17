import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { listConversations } from "@/lib/server/activity";
import { Badge } from "@/components/ui";
import { channelLabel, timeAgo, timeShort } from "@/lib/format";

export const dynamic = "force-dynamic";

const ESCALATED = new Set(["Escalated", "Guardrail", "Opt-out", "Cancelled"]);

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; f?: string }>;
}) {
  await requireOperator();
  const { c, f } = await searchParams;
  const escalatedOnly = f === "escalated";

  const all = await listConversations(60);
  const convos = escalatedOnly ? all.filter((cv) => ESCALATED.has(cv.outcome)) : all;

  const selectedId = Number(c) || convos[0]?.id;
  const selected = convos.find((cv) => cv.id === selectedId) ?? convos[0] ?? null;

  const callsToday = all.filter(
    (cv) => new Date(cv.atIso).toDateString() === new Date().toDateString()
  ).length;

  const dataEntries = selected
    ? Object.entries(selected.data).filter(([, v]) => v != null && v !== "")
    : [];

  return (
    <div className="flex h-full min-h-0">
      {/* list */}
      <div className="flex min-h-0 min-w-0 flex-[1.15] flex-col border-r border-white/6">
        <div className="flex items-center gap-[10px] px-5 pb-[10px] pt-4">
          <div className="flex-1">
            <div className="text-[15px] font-semibold">Conversations</div>
            <div className="mt-[2px] text-[11.5px] text-muted">
              All tenants · {callsToday} events today · PHI-minimized audit trail
            </div>
          </div>
          <Link
            href="/conversations"
            className={`rounded-[7px] px-[10px] py-1 text-[11.5px] font-semibold ${
              !escalatedOnly
                ? "bg-accent/14 !text-lav"
                : "border border-white/8 !text-soft hover:bg-white/4"
            }`}
          >
            All channels
          </Link>
          <Link
            href="/conversations?f=escalated"
            className={`rounded-[7px] px-[10px] py-1 text-[11.5px] ${
              escalatedOnly
                ? "bg-accent/14 font-semibold !text-lav"
                : "border border-white/8 !text-soft hover:bg-white/4"
            }`}
          >
            Escalated
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convos.length === 0 && (
            <div className="px-5 py-10 text-center text-[12.5px] text-faint">
              No events recorded yet — conversations appear as the engine answers calls.
            </div>
          )}
          {convos.map((cv) => (
            <Link
              key={cv.id}
              href={`/conversations?${escalatedOnly ? "f=escalated&" : ""}c=${cv.id}`}
              className={`flex cursor-pointer items-center gap-[11px] border-b border-white/4 px-5 py-[10.5px] !text-fg hover:bg-white/3 ${
                selected?.id === cv.id
                  ? "border-l-2 border-l-accent bg-accent/7"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-soft">
                {cv.phoneTail ? `·${cv.phoneTail.slice(-2)}` : "—"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium">
                  {cv.phoneTail ? `Caller ··${cv.phoneTail}` : "System"}{" "}
                  <span className="font-normal text-ghost">→ {cv.tenantName}</span>
                </div>
                <div className="truncate text-[11.5px] text-muted">
                  {cv.intent} · {cv.summary}
                </div>
              </div>
              <div className="flex flex-none flex-col items-end gap-[3px]">
                <Badge tone={cv.outcomeTone}>{cv.outcome}</Badge>
                <span className="font-mono text-[10.5px] text-ghost">
                  {channelLabel(cv.channel)} · {timeShort(cv.atIso)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* detail */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="grid flex-1 place-items-center text-[12.5px] text-faint">
            Select a conversation.
          </div>
        ) : (
          <>
            <div className="border-b border-white/6 px-5 py-[14px]">
              <div className="flex items-center gap-[9px]">
                <span className="text-[13.5px] font-semibold">
                  {selected.phoneTail ? `Caller ··${selected.phoneTail}` : "System event"}
                </span>
                <span className="text-[11px] text-faint">
                  → {selected.tenantName} · {channelLabel(selected.channel)}
                </span>
                <span className="flex-1" />
                <Badge tone={selected.outcomeTone}>{selected.outcome}</Badge>
              </div>
              <div className="mt-[3px] text-[11.5px] text-muted">
                {selected.intent} · {timeAgo(selected.atIso)}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-[14px] overflow-y-auto px-5 py-[18px]">
              <div className="rounded-[11px] border border-white/5 bg-white/4 px-[13px] py-[10px] text-[12.5px] leading-[1.55] text-mid">
                {selected.summary}
              </div>

              {dataEntries.length > 0 && (
                <div>
                  <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint">
                    Recorded event data
                  </div>
                  <div className="flex flex-col gap-[6px] rounded-lg border border-white/5 bg-white/3 px-[13px] py-[10px]">
                    {dataEntries.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-xs">
                        <span className="font-mono text-muted">{k}</span>
                        <span className="truncate font-mono text-mid">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-accent/20 bg-accent/8 px-[13px] py-[10px] text-[11.5px] leading-[1.6] text-lav">
                No transcript exists for this conversation — by design. The engine keeps
                conversation state in memory only and persists whitelisted, PHI-minimized fields
                (phone tail, booking facts, event type). What you see here is everything that was
                stored.
              </div>

              {selected.tenantId && (
                <Link
                  href={`/clients/${encodeURIComponent(selected.tenantId)}`}
                  className="text-xs hover:underline"
                >
                  Open {selected.tenantName} →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
