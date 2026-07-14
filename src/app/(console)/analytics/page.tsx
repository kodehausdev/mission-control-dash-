import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { bookingsByMonth, linePoints, mrrSeries } from "@/lib/server/analytics";
import { listClients } from "@/lib/server/clients";
import { getLeadsBoard } from "@/lib/server/leads";
import { getBillingData } from "@/lib/server/billing";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

const TOP_GRID = "grid grid-cols-[36px_1.5fr_110px_120px_120px_1fr] gap-2";

export default async function AnalyticsPage() {
  await requireOperator();
  const [mrr, bookings, clients, leads, billing] = await Promise.all([
    mrrSeries(12),
    bookingsByMonth(12),
    listClients(),
    getLeadsBoard(),
    getBillingData(),
  ]);

  const { line, area } = linePoints(mrr.map((p) => p.value));
  const maxBookings = Math.max(1, ...bookings.map((b) => b.value));
  const totalBookings30d = clients.reduce((a, c) => a + c.bookings30d, 0);
  const totalCalls30d = clients.reduce((a, c) => a + c.calls30d, 0);
  const bookingRate =
    totalCalls30d > 0 ? Math.round((totalBookings30d / totalCalls30d) * 100) : null;

  const yoy =
    mrr.length >= 2 && mrr[0].value > 0
      ? Math.round(((mrr[mrr.length - 1].value - mrr[0].value) / mrr[0].value) * 100)
      : null;

  const top = clients
    .filter((c) => c.bookings30d > 0)
    .sort((a, b) => b.bookings30d - a.bookings30d)
    .slice(0, 5);
  const maxTop = Math.max(1, ...top.map((t) => t.bookings30d));

  const activeClients = clients.filter((c) => c.status === "Active").length;

  return (
    <div className="flex max-w-[1280px] flex-col gap-[14px] px-[26px] pb-8 pt-[22px]">
      <PageHeader
        title="Analytics"
        subtitle="Growth & performance · aggregated from Stripe, the audit trail, and the pipeline"
      />

      <div className="grid grid-cols-[1.6fr_1fr] items-stretch gap-[14px]">
        <Card className="px-[18px] py-4">
          <div className="flex items-baseline gap-[10px]">
            <span className="text-[13px] font-semibold">MRR growth</span>
            {yoy !== null && (
              <span className={`text-[11.5px] ${yoy >= 0 ? "text-green" : "text-red"}`}>
                {yoy >= 0 ? "+" : ""}
                {yoy}% over the period
              </span>
            )}
            <span className="flex-1" />
            <span className="text-[11px] text-faint">
              {mrr.length > 0
                ? `${mrr[0].label} → ${mrr[mrr.length - 1].label} · ${mrr.length} snapshot${mrr.length === 1 ? "" : "s"}`
                : "monthly snapshots"}
            </span>
          </div>
          {mrr.length >= 2 ? (
            <>
              <svg
                width="100%"
                height="190"
                viewBox="0 0 640 190"
                preserveAspectRatio="none"
                className="mt-3 block"
              >
                <polygon points={area} fill="rgba(108,92,231,.12)" />
                <polyline
                  points={line}
                  fill="none"
                  stroke="#6C5CE7"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-[6px] flex justify-between font-mono text-[10px] text-ghost">
                {mrr.map((p) => (
                  <span key={p.monthIso}>{p.label}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="grid h-[190px] place-items-center text-center text-[12px] text-faint">
              <div>
                MRR history builds itself from monthly snapshots.
                <br />
                Current MRR: {billing.summary.connected ? money(billing.summary.mrrCents) : "—"} —
                the first snapshot is already recorded; the line appears from month two.
              </div>
            </div>
          )}
        </Card>

        <Card className="flex flex-col px-[18px] py-4">
          <div className="flex items-baseline gap-[10px]">
            <span className="text-[13px] font-semibold">Bookings / month</span>
            <span className="text-[11.5px] text-green">
              {bookings[bookings.length - 1]?.value ?? 0} this month
            </span>
          </div>
          <div className="mt-[14px] flex min-h-[130px] flex-1 items-end gap-[6px]">
            {bookings.map((b, i) => (
              <div key={b.monthIso} className="flex h-full flex-1 flex-col items-center justify-end gap-[5px]">
                <div
                  className={`w-full rounded-t-[4px] ${i === bookings.length - 1 ? "bg-accent" : "bg-accent/35"}`}
                  style={{
                    height: b.value > 0 ? `${Math.max(4, (b.value / maxBookings) * 100)}%` : "2px",
                  }}
                />
                <span className="font-mono text-[9px] text-ghost">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-6 gap-[10px]">
        <StatCard
          label="Lead conversion"
          value={leads.demoWinRatePct != null ? `${leads.demoWinRatePct}%` : "—"}
          valueClass="!text-[18px]"
          delta="won ÷ closed leads"
        />
        <StatCard
          label="Booking rate · 30d"
          value={bookingRate != null ? `${bookingRate}%` : "—"}
          valueClass="!text-[18px]"
          delta="bookings ÷ calls"
        />
        <StatCard
          label="Calls · 30d"
          value={totalCalls30d}
          valueClass="!text-[18px]"
          delta="all tenants"
        />
        <StatCard
          label="Bookings · 30d"
          value={totalBookings30d}
          valueClass="!text-[18px]"
          delta="all tenants"
        />
        <StatCard
          label="Active clients"
          value={activeClients}
          valueClass="!text-[18px]"
          delta={`${clients.length} total tenants`}
        />
        <StatCard
          label="Pipeline"
          value={money(leads.pipelineCents)}
          valueClass="!text-[18px]"
          delta="open lead value /mo"
        />
      </div>

      <Card>
        <div className="border-b border-white/5 px-4 py-[13px] text-[13px] font-semibold">
          Top performing clients — bookings via AI, trailing 30 days
        </div>
        <div
          className={`${TOP_GRID} border-b border-white/5 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint`}
        >
          <span>#</span>
          <span>Client</span>
          <span className="text-right">Bookings</span>
          <span className="text-right">Booking rate</span>
          <span className="text-right">MRR</span>
          <span></span>
        </div>
        {top.length === 0 && (
          <div className="px-4 py-8 text-center text-[12.5px] text-faint">
            No bookings recorded in the last 30 days.
          </div>
        )}
        {top.map((t, i) => (
          <Link
            key={t.id}
            href={`/clients/${encodeURIComponent(t.id)}`}
            className={`${TOP_GRID} cursor-pointer items-center border-b border-white/4 px-4 py-[9px] !text-fg hover:bg-accent/5`}
          >
            <span className="font-mono text-[11.5px] text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[12.5px] font-medium">{t.name}</span>
            <span className="text-right font-mono text-xs">{t.bookings30d}</span>
            <span className="text-right font-mono text-xs text-green">
              {t.calls30d > 0 ? `${Math.round((t.bookings30d / t.calls30d) * 100)}%` : "—"}
            </span>
            <span className="text-right font-mono text-xs text-mid">
              {t.mrrCents != null ? money(t.mrrCents) : "—"}
            </span>
            <span className="block h-1 overflow-hidden rounded-[3px] bg-white/6">
              <span
                className="block h-full rounded-[3px] bg-accent"
                style={{ width: `${Math.round((t.bookings30d / maxTop) * 100)}%` }}
              />
            </span>
          </Link>
        ))}
      </Card>
    </div>
  );
}
