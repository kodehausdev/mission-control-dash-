import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { listClients } from "@/lib/server/clients";
import { getBillingData } from "@/lib/server/billing";
import { bookingsLeaderboard, listFeed, todayCounters } from "@/lib/server/activity";
import { engineHealthy } from "@/lib/server/engine";
import {
  Card,
  CardHeader,
  MonoTile,
  StatCard,
  healthTone,
  toneText,
  Badge,
} from "@/components/ui";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { daysUntil, initials, money, plural } from "@/lib/format";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function countNewThisWeek(createdAts: string[]): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  return createdAts.filter((iso) => new Date(iso).getTime() > weekAgo).length;
}

export default async function DashboardPage() {
  const operator = await requireOperator();
  const [clients, billing, today, feed, leaders, engineUp] = await Promise.all([
    listClients(),
    getBillingData(),
    todayCounters(),
    listFeed(10),
    bookingsLeaderboard(7),
    engineHealthy(),
  ]);

  const newThisWeek = countNewThisWeek(clients.map((c) => c.createdAt));
  const trials = clients.filter((c) => c.status === "Trial");
  const trialsEndingWeek = trials.filter((c) => {
    const d = daysUntil(c.trialEndsAt);
    return d !== null && d <= 7;
  });
  const atRisk = clients
    .filter((c) => c.health < 72)
    .sort((a, b) => a.health - b.health)
    .slice(0, 4);
  const bookings30d = clients.reduce((a, c) => a + c.bookings30d, 0);
  const alertClient = atRisk.find((c) => c.health < 60 && c.reasons.length > 0);

  const firstName = operator.name.split(" ")[0];
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const maxLeader = Math.max(1, ...leaders.map((l) => l.bookings));

  return (
    <div className="flex max-w-[1480px] flex-col gap-[18px] px-[26px] pb-8 pt-[22px]">
      {alertClient && (
        <AlertBanner
          clientId={alertClient.id}
          clientName={alertClient.name}
          message={`${alertClient.reasons.join(" · ")}. Health score ${alertClient.health}.`}
        />
      )}

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[19px] font-semibold tracking-[-.02em]">
            {greeting()}, {firstName}
          </div>
          <div className="mt-[2px] text-[12.5px] text-muted">
            {dateLabel} · {today.calls.toLocaleString()} calls handled so far today
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leads"
            className="cursor-pointer rounded-lg border border-white/10 px-3 py-[6px] text-xs font-medium !text-mid hover:bg-white/5"
          >
            Add lead
          </Link>
          {(operator.role === "owner" || operator.role === "admin") && (
            <Link
              href="/clients?new=1"
              className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold !text-white shadow-[0_2px_10px_rgba(108,92,231,.35)] hover:bg-accent-hi"
            >
              New client
            </Link>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-7 gap-[10px]">
        <StatCard
          label="Active clients"
          value={clients.length}
          delta={newThisWeek > 0 ? `+${newThisWeek} this week` : "no change this week"}
          deltaClass={newThisWeek > 0 ? "text-green" : "text-muted"}
        />
        <StatCard
          label="MRR"
          value={billing.summary.connected ? money(billing.summary.mrrCents) : "—"}
          delta={
            !billing.summary.connected
              ? "Stripe not connected"
              : billing.summary.netNewMrrCents === null
                ? plural(billing.summary.activeSubs, "subscription")
                : `${billing.summary.netNewMrrCents >= 0 ? "+" : "−"}${money(Math.abs(billing.summary.netNewMrrCents))} vs last month`
          }
          deltaClass={
            billing.summary.connected && (billing.summary.netNewMrrCents ?? 0) >= 0
              ? "text-green"
              : "text-muted"
          }
        />
        <StatCard
          label="Trials"
          value={trials.length}
          delta={
            trialsEndingWeek.length > 0
              ? `${trialsEndingWeek.length} ending this week`
              : "none ending this week"
          }
          deltaClass={trialsEndingWeek.length > 0 ? "text-amber" : "text-muted"}
        />
        <StatCard label="AI calls today" value={today.calls} delta="across all tenants" />
        <StatCard
          label="Booked today"
          value={today.bookings}
          delta={today.calls > 0 ? `${Math.round((today.bookings / today.calls) * 100)}% of calls` : "—"}
        />
        <StatCard label="Bookings · 30d" value={bookings30d} delta="via AI, all clients" />
        <StatCard label="System health">
          <div className="mt-2 flex items-center gap-[7px]">
            <span className={`h-2 w-2 rounded-full ${engineUp ? "bg-green" : "bg-red"}`} />
            <span className="font-mono text-[15px] font-semibold">
              {engineUp ? "Online" : "Offline"}
            </span>
          </div>
          <Link
            href="/ai-health"
            className={`mt-[5px] block text-[11px] ${engineUp ? "!text-muted" : "!text-amber"} hover:underline`}
          >
            {engineUp ? "All services →" : "Engine unreachable →"}
          </Link>
        </StatCard>
      </div>

      {/* feed + right rail */}
      <div className="grid grid-cols-[1.7fr_1fr] items-start gap-[14px]">
        <LiveFeed initial={feed} />

        <div className="flex flex-col gap-[14px]">
          <Card>
            <CardHeader
              title="Needs attention"
              action={
                <Link href="/clients?filter=risk" className="text-[11px] hover:underline">
                  View all
                </Link>
              }
            />
            {atRisk.length === 0 && (
              <div className="px-4 py-5 text-center text-[12px] text-faint">
                Every client is healthy right now.
              </div>
            )}
            {atRisk.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${encodeURIComponent(c.id)}`}
                className="flex cursor-pointer items-center gap-[10px] border-b border-white/4 px-4 py-[10px] !text-fg hover:bg-white/3"
              >
                <MonoTile text={initials(c.name)} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted">{c.reasons[0] ?? "Low health score"}</div>
                </div>
                <span className={`font-mono text-xs font-semibold ${toneText(healthTone(c.health))}`}>
                  {c.health}
                </span>
              </Link>
            ))}
          </Card>

          <Card>
            <CardHeader
              title="Trials ending soon"
              action={
                <Link href="/trials" className="text-[11px] hover:underline">
                  All trials
                </Link>
              }
            />
            {trialsEndingWeek.length === 0 && (
              <div className="px-4 py-5 text-center text-[12px] text-faint">
                No trials end in the next 7 days.
              </div>
            )}
            {trialsEndingWeek.map((c) => {
              const d = daysUntil(c.trialEndsAt) ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/clients/${encodeURIComponent(c.id)}`}
                  className="flex cursor-pointer items-center gap-[10px] border-b border-white/4 px-4 py-[10px] !text-fg hover:bg-white/3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted">
                      {c.planLabel} plan · {c.calls30d} calls · 30d
                    </div>
                  </div>
                  <Badge tone={d <= 2 ? "red" : "amber"}>
                    {d <= 0 ? "ends today" : d === 1 ? "ends tomorrow" : `in ${d} days`}
                  </Badge>
                </Link>
              );
            })}
          </Card>

          <Card>
            <CardHeader
              title="Top performers this week"
              action={
                <Link href="/analytics" className="text-[11px] hover:underline">
                  Analytics
                </Link>
              }
            />
            {leaders.length === 0 && (
              <div className="px-4 py-5 text-center text-[12px] text-faint">
                No bookings recorded in the last 7 days.
              </div>
            )}
            {leaders.map((l, i) => (
              <Link
                key={l.tenantId}
                href={`/clients/${encodeURIComponent(l.tenantId)}`}
                className="flex cursor-pointer items-center gap-[10px] border-b border-white/4 px-4 py-[9px] !text-fg hover:bg-white/3"
              >
                <span className="w-4 flex-none font-mono text-[11px] text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{l.name}</div>
                  <div className="mt-[5px] h-[3px] overflow-hidden rounded-sm bg-white/7">
                    <div
                      className="h-full rounded-sm bg-accent"
                      style={{ width: `${Math.round((l.bookings / maxLeader) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className="font-mono text-[12.5px] font-semibold">{l.bookings}</div>
                  <div
                    className={`text-[10.5px] ${
                      l.deltaPct === null
                        ? "text-muted"
                        : l.deltaPct >= 0
                          ? "text-green"
                          : "text-red"
                    }`}
                  >
                    {l.deltaPct === null ? "new" : `${l.deltaPct >= 0 ? "+" : "−"}${Math.abs(l.deltaPct)}%`}
                  </div>
                </div>
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
