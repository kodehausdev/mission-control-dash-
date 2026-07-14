import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { getBillingData } from "@/lib/server/billing";
import { listClients } from "@/lib/server/clients";
import { Badge, Card, CardHeader, PageHeader, StatCard, type Tone } from "@/components/ui";
import { QuickActions, RetryButton } from "@/components/billing/billing-actions";
import { dateShort, daysUntil, money, moneyExact, plural } from "@/lib/format";

export const dynamic = "force-dynamic";

const INV_GRID = "grid grid-cols-[110px_1.4fr_90px_90px_100px] gap-2";

const STATUS_TONE: Record<string, Tone> = {
  Paid: "green",
  Failed: "red",
  Open: "amber",
  Void: "neutral",
};

export default async function BillingPage() {
  await requireOperator();
  const [{ summary, invoices, failed }, clients] = await Promise.all([
    getBillingData(),
    listClients(),
  ]);

  const trialsSoon = clients
    .filter((c) => {
      const d = daysUntil(c.trialEndsAt);
      return c.status === "Trial" && d !== null && d <= 7;
    })
    .slice(0, 3);

  return (
    <div className="flex max-w-[1480px] flex-col gap-[14px] px-[26px] pb-8 pt-[22px]">
      <PageHeader
        title="Billing"
        subtitle={
          summary.connected
            ? "Connected to Stripe · live subscription + invoice data"
            : "Stripe is not configured — set STRIPE_SECRET_KEY to activate this screen"
        }
      />

      <div className="grid grid-cols-5 gap-[10px]">
        <StatCard
          label="Current MRR"
          value={summary.connected ? money(summary.mrrCents) : "—"}
          valueClass="!text-[20px]"
          delta={
            summary.netNewMrrCents === null
              ? "first month of snapshots"
              : `${summary.netNewMrrCents >= 0 ? "+" : "−"}${money(Math.abs(summary.netNewMrrCents))} net new`
          }
          deltaClass={(summary.netNewMrrCents ?? 0) >= 0 ? "text-green" : "text-red"}
        />
        <StatCard
          label="ARR run rate"
          value={summary.connected ? money(summary.arrCents, { compact: true }) : "—"}
          valueClass="!text-[20px]"
          delta={plural(summary.activeSubs, "subscription")}
        />
        <StatCard
          label="Failed payments"
          labelClass={summary.failedCount > 0 ? "text-red" : "text-muted"}
          value={summary.connected ? money(summary.failedCents) : "—"}
          valueClass={`!text-[20px] ${summary.failedCount > 0 ? "text-red" : ""}`}
          delta={
            summary.failedCount > 0
              ? `${plural(summary.failedCount, "invoice")} · dunning active`
              : "none outstanding"
          }
        />
        <StatCard
          label="Renewals · 7 days"
          value={summary.connected ? money(summary.renewals7dCents) : "—"}
          valueClass="!text-[20px]"
          delta={plural(summary.renewals7dCount, "subscription")}
        />
        <StatCard
          label="Refunds MTD"
          value={summary.connected ? money(summary.refundsMtdCents) : "—"}
          valueClass="!text-[20px]"
          delta={plural(summary.refundsMtdCount, "refund")}
        />
      </div>

      <div className="grid grid-cols-[1.7fr_1fr] items-start gap-[14px]">
        <Card>
          <CardHeader
            title="Recent invoices"
            action={
              <a
                href="https://dashboard.stripe.com/invoices"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold hover:underline"
              >
                Open in Stripe
              </a>
            }
          />
          <div
            className={`${INV_GRID} border-b border-white/5 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint`}
          >
            <span>Invoice</span>
            <span>Client</span>
            <span className="text-right">Amount</span>
            <span>Status</span>
            <span className="text-right">Date</span>
          </div>
          {invoices.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-faint">
              {summary.connected ? "No invoices yet." : "Connect Stripe to see invoices."}
            </div>
          )}
          {invoices.map((iv) => (
            <div
              key={iv.id}
              className={`${INV_GRID} items-center border-b border-white/4 px-4 py-[9px] hover:bg-white/2`}
            >
              <a
                href={`https://dashboard.stripe.com/invoices/${iv.id}`}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer font-mono text-[11.5px] hover:underline"
              >
                {iv.number}
              </a>
              <span className="truncate text-[12.5px] font-medium">{iv.clientName}</span>
              <span className="text-right font-mono text-xs">{moneyExact(iv.amountCents)}</span>
              <span>
                <Badge tone={STATUS_TONE[iv.status] ?? "neutral"}>{iv.status}</Badge>
              </span>
              <span className="text-right font-mono text-[11.5px] text-faint">
                {dateShort(iv.dateIso)}
              </span>
            </div>
          ))}
        </Card>

        <div className="flex flex-col gap-[14px]">
          <Card className={failed.length > 0 ? "!border-red/20" : ""}>
            <CardHeader
              title="Failed payments"
              titleClassName={failed.length > 0 ? "text-red-soft" : ""}
            />
            {failed.length === 0 && (
              <div className="px-4 py-5 text-center text-[12px] text-faint">
                Nothing failing right now.
              </div>
            )}
            {failed.map((fp) => (
              <div
                key={fp.invoiceId}
                className="flex items-center gap-[10px] border-b border-white/4 px-4 py-[10px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium">{fp.clientName}</div>
                  <div className="text-[11px] text-muted">
                    attempt {fp.attemptCount} · auto-dunning
                  </div>
                </div>
                <span className="font-mono text-xs text-red">{moneyExact(fp.amountCents)}</span>
                <RetryButton invoiceId={fp.invoiceId} />
              </div>
            ))}
          </Card>

          <Card className="px-4 py-[15px]">
            <div className="mb-[11px] text-[13px] font-semibold">Quick actions</div>
            <QuickActions />
          </Card>

          <Card>
            <CardHeader title="Trials ending — convert now" />
            {trialsSoon.length === 0 && (
              <div className="px-4 py-5 text-center text-[12px] text-faint">
                No trials end this week.
              </div>
            )}
            {trialsSoon.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-[10px] border-b border-white/4 px-4 py-[10px]"
              >
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted">
                    {c.planLabel} · ends {dateShort(c.trialEndsAt)}
                  </div>
                </div>
                <Link
                  href={`/clients/${encodeURIComponent(c.id)}`}
                  className="cursor-pointer rounded-[7px] bg-accent/15 px-[10px] py-1 text-[11px] font-semibold !text-lav hover:bg-accent/28"
                >
                  Open
                </Link>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
