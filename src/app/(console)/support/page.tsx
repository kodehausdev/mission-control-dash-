import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { getTicket, listTickets } from "@/lib/server/tickets";
import { listClients } from "@/lib/server/clients";
import { toneBg, toneText, MonoTile, type Tone } from "@/components/ui";
import { NewTicketButton, ReplyBox, ResolveButton } from "@/components/support/support-ui";
import { initials, timeAgo, timeShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  await requireOperator();
  const { t } = await searchParams;
  const [tickets, clients] = await Promise.all([listTickets(), listClients()]);

  const openCount = tickets.filter((tk) => tk.status === "open").length;
  const urgentCount = tickets.filter(
    (tk) => tk.priority === "urgent" && tk.status !== "resolved"
  ).length;

  const selectedId = Number(t) || tickets[0]?.id;
  const ticket = selectedId ? await getTicket(selectedId) : null;
  const ticketClient = ticket?.tenantId
    ? (clients.find((c) => c.id === ticket.tenantId) ?? null)
    : null;

  const statusTone: Tone =
    ticket?.status === "resolved" ? "green" : ticket?.status === "pending" ? "amber" : "red";

  return (
    <div className="flex h-full min-h-0">
      {/* ticket list */}
      <div className="flex w-[300px] flex-none flex-col border-r border-white/6">
        <div className="flex items-start justify-between px-4 pb-[10px] pt-4">
          <div>
            <div className="text-[15px] font-semibold">Support inbox</div>
            <div className="mt-[2px] text-[11.5px] text-muted">
              {openCount} open · {urgentCount} urgent
            </div>
          </div>
          <NewTicketButton tenants={clients.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-faint">
              No tickets yet — client issues you log land here.
            </div>
          )}
          {tickets.map((tk) => (
            <Link
              key={tk.id}
              href={`/support?t=${tk.id}`}
              className={`block cursor-pointer border-b border-white/4 px-4 py-[11px] !text-fg hover:bg-white/3 ${
                tk.id === selectedId
                  ? "border-l-2 border-l-accent bg-accent/7"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-center gap-[7px]">
                <span className={`h-[6px] w-[6px] flex-none rounded-full ${toneBg(tk.priorityTone)}`} />
                <span className="flex-1 truncate text-[12.5px] font-semibold">{tk.subject}</span>
                <span className="font-mono text-[10.5px] text-ghost">{timeShort(tk.updatedAt)}</span>
              </div>
              <div className="mt-[3px] text-[11.5px] text-muted">
                {tk.tenantName} · {tk.status}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* thread */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!ticket ? (
          <div className="grid flex-1 place-items-center text-[12.5px] text-faint">
            Select a ticket — or create the first one.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-[10px] border-b border-white/6 px-5 py-[14px]">
              <div className="flex-1">
                <div className="text-sm font-semibold">{ticket.subject}</div>
                <div className="mt-[2px] text-[11.5px] text-muted">
                  {ticket.tenantName} · opened {timeAgo(ticket.createdAt)} ·{" "}
                  <span className="font-mono">{ticket.ref}</span>
                </div>
              </div>
              <ResolveButton ticketId={ticket.id} resolved={ticket.status === "resolved"} />
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-[18px]">
              {ticket.messages.length === 0 && (
                <div className="py-6 text-center text-[12px] text-faint">
                  No messages on this ticket yet — reply below to start the thread.
                </div>
              )}
              {ticket.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex max-w-[78%] flex-col gap-[3px] ${
                    m.isOperator ? "self-end" : "self-start"
                  }`}
                >
                  <span className="px-1 text-[10.5px] text-faint">
                    {m.author} · {timeAgo(m.atIso)}
                  </span>
                  <div
                    className={`rounded-[11px] border border-white/5 px-[13px] py-[9px] text-[12.5px] leading-[1.55] ${
                      m.isOperator ? "bg-accent/16 text-[#E4E0FF]" : "bg-white/4 text-mid"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/6 px-5 py-3">
              <ReplyBox ticketId={ticket.id} clientName={ticket.tenantName} />
            </div>
          </>
        )}
      </div>

      {/* context rail */}
      <div className="flex w-[250px] flex-none flex-col gap-[14px] overflow-y-auto border-l border-white/6 p-4">
        {ticket && (
          <>
            <div>
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint">
                Customer
              </div>
              {ticketClient ? (
                <Link
                  href={`/clients/${encodeURIComponent(ticketClient.id)}`}
                  className="flex cursor-pointer items-center gap-[9px] rounded-[9px] border border-white/6 bg-white/3 px-[11px] py-[9px] !text-fg hover:border-accent/40"
                >
                  <MonoTile text={initials(ticketClient.name)} size={26} className="!bg-accent/14 !text-lav" />
                  <div>
                    <div className="text-[12.5px] font-medium">{ticketClient.name}</div>
                    <div className="text-[10.5px] text-muted">
                      {ticketClient.planLabel} plan · health {ticketClient.health}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="rounded-[9px] border border-white/6 bg-white/3 px-[11px] py-[9px] text-[11.5px] text-faint">
                  No client linked.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-[9px]">
              <div className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint">
                Details
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Status</span>
                <span className={toneText(statusTone)}>{ticket.status}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Priority</span>
                <span className={toneText(ticket.priorityTone)}>{ticket.priority}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Channel</span>
                <span>{ticket.channel}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Linked call</span>
                <span className="font-mono text-[11px]">{ticket.linkedCallId ?? "—"}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint">
                Data posture
              </div>
              <div className="rounded-lg border border-white/5 bg-white/3 px-[11px] py-[9px] font-mono text-[11px] leading-[1.6] text-mono-soft">
                Call content is never stored — link tickets to audit event ids; transcripts don&apos;t
                exist by design.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
