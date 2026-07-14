import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { listClients } from "@/lib/server/clients";
import { getWorkspaceSettings } from "@/lib/server/settings";
import { Badge, DotLabel, HealthBar, MonoTile, PageHeader, healthTone } from "@/components/ui";
import { NewClientButton } from "@/components/clients/new-client-dialog";
import { initials, money, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "attention", label: "Needs attention" },
  { id: "risk", label: "High risk" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const GRID =
  "grid grid-cols-[minmax(190px,1.5fr)_110px_76px_86px_70px_140px_66px_72px_92px_110px_84px] gap-2";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const me = await requireOperator();
  const isAdminPlus = me.role === "owner" || me.role === "admin";
  const { filter: rawFilter } = await searchParams;
  const filter: FilterId = (FILTERS.find((f) => f.id === rawFilter)?.id ?? "all") as FilterId;

  const [all, settings] = await Promise.all([listClients(), getWorkspaceSettings()]);
  const plans = Object.keys(settings.planPrices).filter((p) => p !== "standard");
  const clients = all.filter((c) =>
    filter === "all"
      ? true
      : filter === "healthy"
        ? c.health >= 80
        : filter === "attention"
          ? c.health >= 60 && c.health < 80
          : c.health < 60
  );

  return (
    <div className="flex flex-col gap-[14px] px-[26px] pb-8 pt-[22px]">
      <div className="flex items-center gap-[10px]">
        <PageHeader
          title="Clients"
          subtitle="Every tenant is fully isolated — numbers, knowledge base, calendar, data."
        />
        <div className="flex-1" />
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/clients" : `/clients?filter=${f.id}`}
            className={`cursor-pointer rounded-[7px] border px-[11px] py-[5px] text-xs font-medium hover:border-white/20 ${
              filter === f.id
                ? "border-accent/40 bg-accent/16 !text-lav"
                : "border-white/9 !text-soft"
            }`}
          >
            {f.label}
          </Link>
        ))}
        {isAdminPlus && (
          <NewClientButton plans={plans} defaultTrialDays={settings.defaultTrialDays} />
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-white/6 bg-card shadow-[0_1px_2px_rgba(0,0,0,.35)]">
        <div className="min-w-[1220px]">
          <div
            className={`${GRID} sticky top-0 border-b border-white/6 bg-card px-4 py-[9px] text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint`}
          >
            <span>Business</span>
            <span>Industry</span>
            <span>Plan</span>
            <span>Status</span>
            <span className="text-right">MRR</span>
            <span>Phone</span>
            <span>WA</span>
            <span>Line</span>
            <span>AI status</span>
            <span>Health</span>
            <span className="text-right">Last active</span>
          </div>

          {clients.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-faint">
              {all.length === 0
                ? "No tenants yet — clients appear here once onboarded (or once the 0006 migration is applied)."
                : "No clients match this filter."}
            </div>
          )}

          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${encodeURIComponent(c.id)}`}
              className={`${GRID} cursor-pointer items-center border-b border-white/4 px-4 py-[9px] !text-fg hover:bg-accent/5`}
            >
              <span className="flex min-w-0 items-center gap-[9px]">
                <MonoTile text={initials(c.name)} />
                <span className="truncate text-[13px] font-medium">{c.name}</span>
              </span>
              <span className="text-xs text-soft">{c.industry ?? "—"}</span>
              <span className="text-xs text-mid">{c.planLabel}</span>
              <span>
                <Badge tone={c.statusTone}>{c.status}</Badge>
              </span>
              <span className="text-right font-mono text-[12.5px] text-mid">
                {c.mrrCents != null ? money(c.mrrCents) : "—"}
              </span>
              <span className="font-mono text-[11.5px] text-soft">{c.phone ?? "—"}</span>
              <span className={`text-[13px] ${c.wa ? "text-green" : "text-slash"}`}>
                {c.wa ? "●" : "—"}
              </span>
              <span className={`text-[13px] ${c.line ? "text-green" : "text-red"}`}>
                {c.line ? "●" : "—"}
              </span>
              <DotLabel tone={c.aiTone}>{c.ai}</DotLabel>
              <HealthBar health={c.health} tone={healthTone(c.health)} />
              <span className="text-right text-[11.5px] text-faint">{timeAgo(c.lastActiveAt)}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="text-[11.5px] text-faint">
        Showing {clients.length} of {all.length} clients · sorted by last activity
      </div>
    </div>
  );
}
