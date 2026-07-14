import { requireOperator } from "@/lib/server/operator";
import { getWorkspaceSettings } from "@/lib/server/settings";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  AlertToggle,
  EditableSelfName,
  InviteMemberButton,
  WorkspaceForm,
} from "@/components/settings/settings-ui";
import { initials, money } from "@/lib/format";

export const dynamic = "force-dynamic";

const ALERT_DEFS = [
  { id: "payFail", name: "Payment failures", desc: "Notify immediately when any charge fails" },
  { id: "trialEnd", name: "Trials ending", desc: "Daily digest of trials ending within 3 days" },
  { id: "aiDeg", name: "AI degradation", desc: "Alert when the engine goes unreachable" },
  { id: "usage", name: "High usage", desc: "Alert at 80% of plan call quota" },
  { id: "weekly", name: "Weekly summary", desc: "Monday morning business recap email" },
];

interface OperatorRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  joined_at: string | null;
}

export default async function SettingsPage() {
  const me = await requireOperator();
  const settings = await getWorkspaceSettings();

  const admin = supabaseAdmin();
  let team: OperatorRow[] = [];
  if (admin) {
    const { data, error } = await admin
      .from("operators")
      .select("user_id, display_name, email, role, joined_at")
      .order("created_at", { ascending: true });
    // 0007 (joined_at) not applied yet — fall back and treat everyone as
    // joined rather than showing a false "pending" for the whole team.
    if (error) {
      const retry = await admin
        .from("operators")
        .select("user_id, display_name, email, role")
        .order("created_at", { ascending: true });
      team = (retry.data ?? []).map((m) => ({ ...m, joined_at: new Date().toISOString() }));
    } else {
      team = (data ?? []) as OperatorRow[];
    }
  }

  const planLine = ["starter", "growth", "scale"]
    .filter((p) => settings.planPrices[p] != null)
    .map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)} ${money(settings.planPrices[p])}`)
    .join(" · ");

  return (
    <div className="flex max-w-[820px] flex-col gap-[14px] px-[26px] pb-8 pt-[22px]">
      <PageHeader title="Settings" subtitle="Workspace, alerting and team access" />

      <Card className="flex flex-col gap-3 px-[18px] py-4">
        <div className="text-[13px] font-semibold">Workspace</div>
        <WorkspaceForm
          workspaceName={settings.workspaceName}
          companyName={settings.companyName}
          defaultTrialDays={settings.defaultTrialDays}
        />
        <div className="flex items-center justify-between border-t border-white/4 pt-3 text-[12.5px]">
          <span className="text-muted">Region</span>
          <span>{settings.region}</span>
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-muted">Plans</span>
          <span>{planLine || "—"}</span>
        </div>
        <div className="text-[11px] leading-[1.5] text-faint">
          Plan prices live in <span className="font-mono">workspace_settings.plan_prices</span>;
          the workspace name here overrides the built-in default everywhere it renders.
        </div>
      </Card>

      <Card className="px-[18px] py-4">
        <div className="mb-2 text-[13px] font-semibold">Alerts</div>
        {ALERT_DEFS.map((a) => (
          <AlertToggle
            key={a.id}
            id={a.id}
            name={a.name}
            desc={a.desc}
            initialOn={settings.alerts[a.id] ?? false}
          />
        ))}
        <div className="pt-2 text-[11px] leading-[1.5] text-faint">
          Toggles persist to the workspace; alert delivery (email/Slack) is a later milestone.
        </div>
      </Card>

      <Card className="px-[18px] py-4">
        <div className="mb-[10px] flex items-center justify-between">
          <span className="text-[13px] font-semibold">Team</span>
          <InviteMemberButton />
        </div>
        {team.length === 0 && (
          <div className="py-4 text-center text-[12px] text-faint">
            No operators yet — run <span className="font-mono">scripts/seed-operator.mjs</span> to
            add the first one.
          </div>
        )}
        {team.map((member) => {
          const pending = !member.joined_at;
          return (
            <div key={member.user_id} className="flex items-center gap-[10px] py-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
                  pending ? "bg-white/10 text-faint" : "bg-gradient-to-br from-accent to-accent-deep"
                }`}
              >
                {initials(member.display_name ?? member.email ?? "?")}
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] font-medium">
                  {member.user_id === me.userId ? (
                    <EditableSelfName
                      initialName={member.display_name ?? member.email ?? member.user_id}
                    />
                  ) : (
                    (member.display_name ?? member.email ?? member.user_id)
                  )}
                  {member.user_id === me.userId && (
                    <span className="ml-2 text-[10.5px] text-faint">you</span>
                  )}
                </div>
                <div className="text-[11px] text-muted">{member.email ?? "—"}</div>
              </div>
              {pending && <Badge tone="amber">Pending</Badge>}
              <Badge tone={member.role === "owner" ? "purple" : "neutral"}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
