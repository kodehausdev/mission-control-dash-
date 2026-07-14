import { requireOperator } from "@/lib/server/operator";
import { checkServices, incidentBars24h, type ServiceState } from "@/lib/server/health";
import { todayCounters } from "@/lib/server/activity";
import { listClients } from "@/lib/server/clients";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATE_COLOR: Record<ServiceState, { dot: string; text: string; border: string }> = {
  operational: { dot: "bg-green", text: "text-green", border: "border-white/6" },
  degraded: { dot: "bg-amber", text: "text-amber", border: "border-amber/30" },
  down: { dot: "bg-red", text: "text-red", border: "border-red/30" },
  unconfigured: { dot: "bg-mono-soft", text: "text-mono-soft", border: "border-white/6" },
};

export default async function AiHealthPage() {
  await requireOperator();
  const [services, incidents, today, clients] = await Promise.all([
    checkServices(),
    incidentBars24h(),
    todayCounters(),
    listClients(),
  ]);

  const worst = services.reduce<"ok" | "degraded" | "down">((acc, s) => {
    if (s.state === "down") return "down";
    if (s.state === "degraded" && acc !== "down") return "degraded";
    return acc;
  }, "ok");

  const bookingRate =
    today.calls > 0 ? Math.round((today.bookings / today.calls) * 100) : null;
  const maxBar = Math.max(1, ...incidents.bars.map((b) => b.count));

  return (
    <div className="flex max-w-[1280px] flex-col gap-[14px] px-[26px] pb-8 pt-[22px]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <PageHeader
            title="AI Health"
            subtitle={`Platform status across all ${clients.length} tenants · probed just now`}
          />
        </div>
        <div
          className={`flex items-center gap-[7px] rounded-[9px] border px-[13px] py-[6px] ${
            worst === "ok"
              ? "border-green/22 bg-green/8"
              : worst === "degraded"
                ? "border-amber/22 bg-amber/8"
                : "border-red/25 bg-red/8"
          }`}
        >
          <span
            className={`mc-pulse-fast h-[7px] w-[7px] rounded-full ${
              worst === "ok" ? "bg-green" : worst === "degraded" ? "bg-amber" : "bg-red"
            }`}
          />
          <span
            className={`text-xs font-semibold ${
              worst === "ok" ? "text-green" : worst === "degraded" ? "text-amber" : "text-red"
            }`}
          >
            {worst === "ok"
              ? "All systems operational"
              : worst === "degraded"
                ? "Partial degradation"
                : "Service outage"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[10px]">
        {services.map((sv) => {
          const c = STATE_COLOR[sv.state];
          return (
            <div
              key={sv.name}
              className={`rounded-xl border bg-card px-[15px] py-[13px] ${c.border}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-[7px] w-[7px] rounded-full ${c.dot}`} />
                <span className="flex-1 text-[12.5px] font-semibold">{sv.name}</span>
                <span className={`text-[11px] ${c.text}`}>{sv.label}</span>
              </div>
              <div className="mt-[11px] flex gap-4">
                <div>
                  <div className="text-[10px] text-faint">Latency</div>
                  <div className={`mt-[2px] font-mono text-[13px] ${sv.latencyMs != null && sv.latencyMs > 1200 ? "text-amber" : ""}`}>
                    {sv.latencyMs != null ? `${sv.latencyMs}ms` : "—"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-faint">Note</div>
                  <div className="mt-[2px] truncate text-[11.5px] text-soft">
                    {sv.note || "Healthy"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_1fr_1.4fr] items-stretch gap-[14px]">
        <Card className="px-4 py-[15px]">
          <div className="text-[13px] font-semibold">Events today</div>
          <div className="mt-[10px] font-mono text-2xl font-semibold">
            {(today.calls + today.bookings).toLocaleString()}
          </div>
          <div className="mt-[3px] text-[11.5px] text-muted">
            {today.calls} calls answered · {today.bookings} bookings confirmed
          </div>
        </Card>

        <Card className="px-4 py-[15px]">
          <div className="text-[13px] font-semibold">Booking rate today</div>
          <div className="mt-[10px] font-mono text-2xl font-semibold text-green">
            {bookingRate != null ? `${bookingRate}%` : "—"}
          </div>
          <div className="mt-[3px] text-[11.5px] text-muted">
            {bookingRate != null
              ? `${today.bookings} of ${today.calls} answered calls booked`
              : "No calls answered yet today"}
          </div>
          {bookingRate != null && (
            <div className="mt-3 flex h-[5px] gap-[3px]">
              <div className="rounded-[3px] bg-green" style={{ flex: bookingRate }} />
              <div className="rounded-[3px] bg-white/10" style={{ flex: 100 - bookingRate }} />
            </div>
          )}
        </Card>

        <Card className="px-4 py-[15px]">
          <div className="flex justify-between">
            <span className="text-[13px] font-semibold">Incidents · last 24h</span>
            <span className="text-[11px] text-muted">
              {incidents.total} total · guardrail, emergency, cancellations
            </span>
          </div>
          <div className="mt-[14px] flex h-16 items-end gap-1">
            {incidents.bars.map((b, i) => (
              <div
                key={i}
                title={`${b.count} events`}
                className={`flex-1 rounded-t-[3px] ${
                  b.count >= 5 ? "bg-amber" : b.count > 0 ? "bg-accent/70" : "bg-white/8"
                }`}
                style={{
                  height: b.count > 0 ? `${Math.max(10, (b.count / maxBar) * 100)}%` : "6px",
                }}
              />
            ))}
          </div>
          <div className="mt-[6px] flex justify-between font-mono text-[10px] text-ghost">
            <span>−24h</span>
            <span>−18h</span>
            <span>−12h</span>
            <span>−6h</span>
            <span>now</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
