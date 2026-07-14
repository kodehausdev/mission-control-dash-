// Workspace settings: single Supabase row overriding BRANDING defaults.
// Cached briefly in module scope — it changes rarely and renders everywhere.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { BRANDING } from "@/lib/branding";

export interface WorkspaceSettings {
  workspaceName: string;
  companyName: string;
  region: string;
  defaultTrialDays: number;
  planPrices: Record<string, number>; // plan slug -> monthly cents
  alerts: Record<string, boolean>;
}

const DEFAULTS: WorkspaceSettings = {
  workspaceName: BRANDING.workspace,
  companyName: BRANDING.company,
  region: "us-east",
  defaultTrialDays: 14,
  // 'standard' is the legacy $297 medlab plan that predates Mission Control.
  planPrices: { starter: 14900, growth: 29900, scale: 59900, standard: 29700 },
  alerts: { payFail: true, trialEnd: true, aiDeg: true, usage: false, weekly: true },
};

let cache: { value: WorkspaceSettings; at: number } | null = null;
const TTL_MS = 60_000;

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const admin = supabaseAdmin();
  if (!admin) return DEFAULTS;

  const { data } = await admin.from("workspace_settings").select("*").eq("id", true).maybeSingle();
  const value: WorkspaceSettings = !data
    ? DEFAULTS
    : {
        workspaceName: data.workspace_name ?? DEFAULTS.workspaceName,
        companyName: data.company_name ?? DEFAULTS.companyName,
        region: data.region ?? DEFAULTS.region,
        defaultTrialDays: data.default_trial_days ?? DEFAULTS.defaultTrialDays,
        planPrices: { ...DEFAULTS.planPrices, ...(data.plan_prices ?? {}) },
        alerts: { ...DEFAULTS.alerts, ...(data.alerts ?? {}) },
      };

  cache = { value, at: Date.now() };
  return value;
}

export function invalidateSettingsCache() {
  cache = null;
}
