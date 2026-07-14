import Link from "next/link";
import { requireOperator } from "@/lib/server/operator";
import { listClients } from "@/lib/server/clients";
import { getWorkspaceSettings } from "@/lib/server/settings";
import { Badge, PageHeader, StatCard, toneBg, toneText, type Tone } from "@/components/ui";
import { TrialActions } from "@/components/trials/trial-actions";
import { dateShort, daysUntil, money } from "@/lib/format";

export const dynamic = "force-dynamic";

const GRID = "grid grid-cols-[1.5fr_90px_110px_130px_110px_130px_170px] gap-2";

export default async function TrialsPage() {
  await requireOperator();
  const [clients, settings] = await Promise.all([listClients(), getWorkspaceSettings()]);

  const trials = clients
    .filter((c) => c.status === "Trial")
    .map((c) => {
      const days = daysUntil(c.trialEndsAt) ?? 0;
      const likely = c.calls30d > 150 ? "High" : c.calls30d > 50 ? "Medium" : "Low";
      const likelyTone: Tone = likely === "High" ? "green" : likely === "Medium" ? "amber" : "red";
      const daysTone: Tone = days <= 2 ? "red" : days <= 7 ? "amber" : "green";
      return { ...c, days, likely, likelyTone, daysTone };
    })
    .sort((a, b) => a.days - b.days);

  const endingWeek = trials.filter((t) => t.days <= 7);
  const pipelineCents = trials.reduce((a, t) => a + (t.mrrCents ?? 0), 0);

  return (
    <div className="flex max-w-[1280px] flex-col gap-[14px] px-[26px] pb-8 pt-[22px]">
      <PageHeader
        title="Trials"
        subtitle={`${settings.defaultTrialDays}-day trials · conversion moves to Billing once the subscription is created`}
      />

      <div className="grid grid-cols-4 gap-[10px]">
        <StatCard label="Active trials" value={trials.length} valueClass="!text-[20px]" />
        <StatCard
          label="Ending this week"
          value={endingWeek.length}
          valueClass={`!text-[20px] ${endingWeek.length > 0 ? "text-amber" : ""}`}
        />
        <StatCard
          label="Calls handled · 30d"
          value={trials.reduce((a, t) => a + t.calls30d, 0)}
          valueClass="!text-[20px]"
        />
        <StatCard
          label="Pipeline value"
          value={`${money(pipelineCents)}/mo`}
          valueClass="!text-[20px]"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/6 bg-card">
        <div
          className={`${GRID} border-b border-white/6 px-4 py-[9px] text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint`}
        >
          <span>Business</span>
          <span>Plan</span>
          <span>Calls · 30d</span>
          <span>Ends</span>
          <span>Days left</span>
          <span>Likely to convert</span>
          <span className="text-right">Actions</span>
        </div>

        {trials.length === 0 && (
          <div className="px-4 py-8 text-center text-[12.5px] text-faint">
            No active trials. Set <span className="font-mono">trial_ends_at</span> on a tenant (or
            onboard a lead) to track one here.
          </div>
        )}

        {trials.map((t) => (
          <div
            key={t.id}
            className={`${GRID} items-center border-b border-white/4 px-4 py-[10px] hover:bg-white/2`}
          >
            <Link
              href={`/clients/${encodeURIComponent(t.id)}`}
              className="cursor-pointer text-[13px] font-medium !text-fg hover:!text-lav"
            >
              {t.name}
            </Link>
            <span className="text-xs text-mid">{t.planLabel}</span>
            <span className="font-mono text-xs text-soft">{t.calls30d}</span>
            <span className="text-xs text-soft">{dateShort(t.trialEndsAt)}</span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-1 w-10 overflow-hidden rounded-[3px] bg-white/7">
                <span
                  className={`block h-full rounded-[3px] ${toneBg(t.daysTone)}`}
                  style={{
                    width: `${Math.max(4, Math.min(100, Math.round((t.days / settings.defaultTrialDays) * 100)))}%`,
                  }}
                />
              </span>
              <span className={`font-mono text-[11.5px] ${toneText(t.daysTone)}`}>{t.days}d</span>
            </span>
            <span>
              <Badge tone={t.likelyTone}>{t.likely}</Badge>
            </span>
            <TrialActions tenantId={t.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
