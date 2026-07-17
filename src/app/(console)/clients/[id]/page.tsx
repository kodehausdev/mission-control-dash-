import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/server/operator";
import { getClient } from "@/lib/server/clients";
import { getCustomerBilling } from "@/lib/server/billing";
import { tenantStats, upcomingAppointments } from "@/lib/server/appointments";
import { listConversations } from "@/lib/server/activity";
import { getOptOuts } from "@/lib/server/optouts";
import { engineHealthy } from "@/lib/server/engine";
import {
  Badge,
  Card,
  CardHeader,
  DotLabel,
  StatCard,
  healthTone,
  toneText,
} from "@/components/ui";
import { ProfileActions } from "@/components/clients/profile-actions";
import { dateShort, initials, money, timeShort } from "@/lib/format";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-[12.5px]">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireOperator();
  const isAdminPlus = me.role === "owner" || me.role === "admin";
  const { id } = await params;
  const client = await getClient(decodeURIComponent(id));
  if (!client) notFound();

  const [stats, bookings, convos, customerBilling, engineUp, optOuts] = await Promise.all([
    tenantStats(client.id),
    upcomingAppointments(client.id, 3),
    listConversations(4, { tenantId: client.id }),
    getCustomerBilling(client.stripeCustomerId, client.stripeSubscriptionId),
    engineHealthy(),
    getOptOuts(client.id),
  ]);

  const hours =
    client.openHour != null && client.closeHour != null
      ? `${client.openHour}:00–${client.closeHour}:00 · ${client.timezone ?? ""}`
      : "—";

  const integrations: { name: string; ok: boolean; label: string }[] = [
    { name: "Twilio voice line", ok: client.line, label: client.line ? "Connected" : "Not provisioned" },
    { name: "WhatsApp Business", ok: client.wa, label: client.wa ? "Connected" : "Not set up" },
    {
      name: "Stripe",
      ok: !!client.stripeCustomerId && client.status !== "Past due",
      label: !client.stripeCustomerId
        ? "No customer"
        : client.status === "Past due"
          ? "Payment failing"
          : "Active",
    },
    { name: "Engine", ok: engineUp, label: engineUp ? "Reachable" : "Offline" },
  ];

  return (
    <div className="flex max-w-[1480px] flex-col gap-4 px-[26px] pb-8 pt-[22px]">
      <div className="flex items-center gap-2 text-xs text-faint">
        <Link href="/clients" className="hover:underline">
          Clients
        </Link>
        <span className="text-slash">/</span>
        <span className="text-soft">{client.name}</span>
      </div>

      {/* header */}
      <div className="flex items-center gap-[14px]">
        <div className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-accent/25 bg-accent/14 text-sm font-bold text-lav">
          {initials(client.name)}
        </div>
        <div>
          <div className="flex items-center gap-[10px]">
            <span className="text-[19px] font-semibold tracking-[-.02em]">{client.name}</span>
            <Badge tone={client.statusTone}>{client.status}</Badge>
            <DotLabel tone={client.aiTone}>AI {client.ai}</DotLabel>
          </div>
          <div className="mt-[3px] text-[12.5px] text-muted">
            {client.industry ?? "—"} · {client.planLabel} plan · Client since{" "}
            {dateShort(client.createdAt)} · Tenant <span className="font-mono">{client.id}</span>
          </div>
        </div>
        <div className="flex-1" />
        {isAdminPlus && <ProfileActions tenantId={client.id} aiPaused={client.ai === "Paused"} />}
      </div>

      {/* stats strip — real 30-day aggregates from the audit trail */}
      <div className="grid grid-cols-5 gap-[10px]">
        <StatCard label="Calls · 30d" value={stats.calls30d} valueClass="!text-[18px]" />
        <StatCard label="Booked · 30d" value={stats.bookings30d} valueClass="!text-[18px]" />
        <StatCard
          label="Booking rate"
          value={stats.bookingRatePct != null ? `${stats.bookingRatePct}%` : "—"}
          valueClass="!text-[18px]"
          delta="bookings ÷ answered calls"
        />
        <StatCard
          label="Cancellations · 30d"
          value={stats.cancellations30d}
          valueClass="!text-[18px]"
        />
        <StatCard
          label="Guardrail events · 30d"
          value={stats.guardrails30d}
          valueClass="!text-[18px]"
          delta={stats.guardrails30d > 0 ? "compliance intercepts" : "clean"}
          deltaClass={stats.guardrails30d > 0 ? "text-amber" : "text-green"}
        />
      </div>

      <div className="grid grid-cols-[1fr_1.5fr] items-start gap-[14px]">
        {/* left column */}
        <div className="flex flex-col gap-[14px]">
          <Card className="flex flex-col gap-[9px] px-4 py-[15px]">
            <div className="mb-[2px] text-[13px] font-semibold">Business</div>
            <Row label="Owner">{client.owner ?? "—"}</Row>
            <Row label="Email">
              <span className="font-mono text-[11.5px]">{client.ownerEmail ?? "—"}</span>
            </Row>
            <Row label="Address">{client.address ?? "—"}</Row>
            <Row label="Business hours">{hours}</Row>
            <Row label="Health score">
              <span className={`font-mono ${toneText(healthTone(client.health))}`}>
                {client.health} / 100
              </span>
            </Row>
            {client.reasons.length > 0 && (
              <div className="mt-1 rounded-lg border border-amber/20 bg-amber/8 px-[10px] py-[7px] text-[11.5px] text-amber-soft">
                {client.reasons.join(" · ")}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-[9px] px-4 py-[15px]">
            <div className="mb-[2px] text-[13px] font-semibold">Subscription</div>
            <Row label="Plan">
              {client.planLabel}
              {client.mrrCents != null ? ` — ${money(client.mrrCents)}/mo` : ""}
            </Row>
            <Row label="Next invoice">
              {customerBilling.nextInvoiceIso ? dateShort(customerBilling.nextInvoiceIso) : "—"}
            </Row>
            <Row label="Payment method">
              <span className="font-mono text-[11.5px]">
                {customerBilling.paymentMethodLabel ?? "—"}
              </span>
            </Row>
            <Row label="Stripe customer">
              {client.stripeCustomerId ? (
                <a
                  href={`https://dashboard.stripe.com/customers/${client.stripeCustomerId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11.5px]"
                >
                  {client.stripeCustomerId}
                </a>
              ) : (
                "—"
              )}
            </Row>
          </Card>

          <Card className="flex flex-col gap-[10px] px-4 py-[15px]">
            <div className="text-[13px] font-semibold">Numbers &amp; channels</div>
            <Row label="Voice">
              <span className="font-mono text-[11.5px]">{client.phone ?? "—"}</span>
            </Row>
            <Row label="WhatsApp">
              <DotLabel tone={client.wa ? "green" : "neutral"}>
                {client.wa ? "Connected" : "Not connected"}
              </DotLabel>
            </Row>
            <Row label="SMS fallback">
              <DotLabel tone={client.line ? "green" : "neutral"}>
                {client.line ? "Enabled" : "Needs voice line"}
              </DotLabel>
            </Row>
          </Card>

          <Card className="flex flex-col gap-2 px-4 py-[15px]">
            <div className="mb-[2px] text-[13px] font-semibold">Integrations</div>
            {integrations.map((ig) => (
              <div
                key={ig.name}
                className="flex items-center gap-[9px] rounded-lg border border-white/5 bg-white/3 px-[10px] py-[7px]"
              >
                <span
                  className={`h-[6px] w-[6px] flex-none rounded-full ${ig.ok ? "bg-green" : "bg-red"}`}
                />
                <span className="flex-1 text-[12.5px] font-medium">{ig.name}</span>
                <span className={`text-[11px] ${ig.ok ? "text-green" : "text-red"}`}>
                  {ig.label}
                </span>
              </div>
            ))}
          </Card>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-[14px]">
          <Card>
            <CardHeader
              title="Recent conversations"
              action={
                <Link href="/conversations" className="text-[11px] hover:underline">
                  Open inbox
                </Link>
              }
            />
            {convos.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-faint">
                No recorded events for this tenant yet.
              </div>
            )}
            {convos.map((cv) => (
              <div
                key={cv.id}
                className="flex items-center gap-[11px] border-b border-white/4 px-4 py-[10px] hover:bg-white/2"
              >
                <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-soft">
                  {cv.phoneTail ? `··${cv.phoneTail.slice(-2)}` : "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium">
                    {cv.phoneTail ? `Caller ··${cv.phoneTail}` : "Caller"}{" "}
                    <span className="font-normal text-faint">· {cv.intent}</span>
                  </div>
                  <div className="truncate text-[11.5px] text-muted">{cv.summary}</div>
                </div>
                <Badge tone={cv.outcomeTone}>{cv.outcome}</Badge>
                <span className="flex-none font-mono text-[11px] text-ghost">
                  {timeShort(cv.atIso)}
                </span>
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader title="Upcoming bookings" />
            {bookings.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-faint">
                No confirmed upcoming appointments.
              </div>
            )}
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-[11px] border-b border-white/4 px-4 py-[10px]"
              >
                <span className="w-[110px] flex-none font-mono text-[11.5px] text-soft">
                  {dateShort(b.date)} · {b.timeSlot}
                </span>
                <span className="flex-1 text-[12.5px] font-medium">{b.testType}</span>
                <span className="text-xs text-soft">{b.patientName}</span>
                <Badge tone="green">Confirmed</Badge>
              </div>
            ))}
          </Card>

          <Card className="px-4 py-[15px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Compliance posture</span>
              <span className="text-[11px] text-green">Enforced at source</span>
            </div>
            <div className="mt-2 text-xs leading-[1.6] text-muted">
              Conversation content is never persisted — the engine stores whitelisted booking
              fields and PHI-minimized audit events only (phone tails, no transcripts).{" "}
              {stats.guardrails30d > 0
                ? `${stats.guardrails30d} guardrail intercept${stats.guardrails30d === 1 ? "" : "s"} in the last 30 days.`
                : "No guardrail intercepts in the last 30 days."}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/4 pt-3 text-xs">
              <span className="text-muted">TCPA opt-outs (STOP)</span>
              <span className={optOuts.count > 0 ? "font-mono text-amber" : "font-mono text-soft"}>
                {optOuts.count}
              </span>
            </div>
            {optOuts.recent.length > 0 && (
              <div className="mt-[6px] text-[11px] leading-[1.6] text-faint">
                Suppressed: {optOuts.recent.map((o) => `··${o.phoneTail}`).join(", ")}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
