// Client (tenant) domain queries — the backbone of Dashboard, Clients,
// Client Profile and Trials. Reads tenants + audit_events on the service
// role and computes the derived fields the design shows (status, AI state,
// health score, last-active).

import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { engineHealthy } from "./engine";
import { getWorkspaceSettings } from "./settings";
import type { Tone } from "@/components/ui";

export interface ClientRow {
  id: string;
  name: string;
  industry: string | null;
  plan: string; // slug: starter | growth | scale | standard
  planLabel: string;
  status: "Active" | "Trial" | "Past due" | "Onboarding" | "Canceled";
  statusTone: Tone;
  mrrCents: number | null;
  phone: string | null; // voice line (twilio_number)
  wa: boolean;
  line: boolean; // voice line provisioned
  ai: "Live" | "Paused" | "Onboarding" | "Offline";
  aiTone: Tone;
  health: number;
  reasons: string[]; // why this client needs attention (empty = healthy)
  lastActiveAt: string | null;
  owner: string | null;
  ownerEmail: string | null;
  address: string | null;
  trialEndsAt: string | null;
  calls30d: number;
  bookings30d: number;
  openHour: number | null;
  closeHour: number | null;
  timezone: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

interface TenantRecord {
  id: string;
  lab_name: string;
  industry: string | null;
  owner_name: string | null;
  owner_email: string | null;
  address: string | null;
  twilio_number: string | null;
  whatsapp_number: string | null;
  timezone: string | null;
  open_hour: number | null;
  close_hour: number | null;
  plan: string | null;
  mrr_cents: number | null;
  ai_paused: boolean | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  onboarding_state: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface ActivityIndex {
  lastActive: Map<string, string>;
  calls30d: Map<string, number>;
  bookings30d: Map<string, number>;
}

const TENANT_COLS =
  "id, lab_name, industry, owner_name, owner_email, address, twilio_number, whatsapp_number, timezone, open_hour, close_hour, plan, mrr_cents, ai_paused, trial_ends_at, subscription_status, onboarding_state, stripe_customer_id, stripe_subscription_id, created_at";

// Columns that exist before migrations/0006_mission_control.sql is applied —
// the app stays functional (minus the agency-only fields) either way.
const LEGACY_TENANT_COLS =
  "id, lab_name, twilio_number, whatsapp_number, timezone, open_hour, close_hour, plan, subscription_status, onboarding_state, stripe_customer_id, stripe_subscription_id, created_at";

type SupabaseAdminClient = NonNullable<ReturnType<typeof supabaseAdmin>>;

async function fetchTenants(
  admin: SupabaseAdminClient,
  id?: string
): Promise<TenantRecord[]> {
  for (const cols of [TENANT_COLS, LEGACY_TENANT_COLS]) {
    let q = admin.from("tenants").select(cols);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (!error) return (data ?? []) as unknown as TenantRecord[];
  }
  return [];
}

async function activityIndex(): Promise<ActivityIndex> {
  const empty: ActivityIndex = {
    lastActive: new Map(),
    calls30d: new Map(),
    bookings30d: new Map(),
  };
  const admin = supabaseAdmin();
  if (!admin) return empty;

  // One bounded scan instead of per-tenant aggregates (PostgREST aggregates
  // are disabled on stock Supabase). 2k rows covers 30 days at current volume.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await admin
    .from("audit_events")
    .select("tenant_id, type, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  for (const row of data ?? []) {
    if (!row.tenant_id) continue;
    if (!empty.lastActive.has(row.tenant_id)) empty.lastActive.set(row.tenant_id, row.created_at);
    if (row.type === "call.answered") {
      empty.calls30d.set(row.tenant_id, (empty.calls30d.get(row.tenant_id) ?? 0) + 1);
    } else if (row.type === "booking.confirmed") {
      empty.bookings30d.set(row.tenant_id, (empty.bookings30d.get(row.tenant_id) ?? 0) + 1);
    }
  }
  return empty;
}

function planLabel(slug: string | null): string {
  if (!slug) return "—";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function decorate(
  t: TenantRecord,
  activity: ActivityIndex,
  engineUp: boolean,
  planPrices: Record<string, number>
): ClientRow {
  const now = Date.now();
  const onTrial = !!t.trial_ends_at && new Date(t.trial_ends_at).getTime() > now;
  const provisioned = !!(t.twilio_number || t.whatsapp_number) || t.id === "default";
  const live = t.onboarding_state === "live_active";
  const lastActiveAt = activity.lastActive.get(t.id) ?? null;
  const reasons: string[] = [];

  // status
  let status: ClientRow["status"];
  let statusTone: Tone;
  if (t.subscription_status === "canceled") {
    status = "Canceled";
    statusTone = "neutral";
  } else if (t.subscription_status === "past_due") {
    status = "Past due";
    statusTone = "red";
  } else if (onTrial) {
    status = "Trial";
    statusTone = "purple";
  } else if (!live) {
    status = "Onboarding";
    statusTone = "neutral";
  } else {
    status = "Active";
    statusTone = "green";
  }

  // AI state
  let ai: ClientRow["ai"];
  let aiTone: Tone;
  if (t.ai_paused) {
    ai = "Paused";
    aiTone = "neutral";
  } else if (!live || !provisioned) {
    ai = "Onboarding";
    aiTone = "purple";
  } else if (engineUp) {
    ai = "Live";
    aiTone = "green";
  } else {
    ai = "Offline";
    aiTone = "amber";
  }

  // health — documented heuristic, clamped 5..100
  let health = 100;
  if (t.subscription_status === "past_due") {
    health -= 40;
    reasons.push("Payment failing");
  }
  if (t.subscription_status === "canceled") health -= 60;
  if (t.ai_paused) {
    health -= 30;
    reasons.push("AI paused");
  }
  if (!live) {
    health -= 25;
    reasons.push("Onboarding incomplete");
  }
  if (!t.whatsapp_number) health -= 5;
  if (!t.twilio_number && t.id !== "default") health -= 10;
  if (lastActiveAt) {
    const ageDays = (now - new Date(lastActiveAt).getTime()) / 86_400_000;
    if (ageDays > 7) {
      health -= 15;
      reasons.push("No activity in 7 days");
    }
  } else {
    health -= 20;
    if (live) reasons.push("No activity yet");
  }
  if (onTrial && t.trial_ends_at) {
    const daysLeft = Math.ceil((new Date(t.trial_ends_at).getTime() - now) / 86_400_000);
    if (daysLeft <= 2) reasons.push(daysLeft <= 1 ? "Trial ends tomorrow" : "Trial ends in 2 days");
  }
  health = Math.max(5, Math.min(100, health));

  const plan = t.plan ?? "standard";
  const mrrCents = t.mrr_cents ?? planPrices[plan] ?? null;

  return {
    id: t.id,
    name: t.lab_name,
    industry: t.industry,
    plan,
    planLabel: planLabel(plan),
    status,
    statusTone,
    mrrCents,
    phone: t.twilio_number,
    wa: !!t.whatsapp_number,
    line: !!t.twilio_number,
    ai,
    aiTone,
    health,
    reasons,
    lastActiveAt,
    owner: t.owner_name,
    ownerEmail: t.owner_email,
    address: t.address,
    trialEndsAt: t.trial_ends_at,
    calls30d: activity.calls30d.get(t.id) ?? 0,
    bookings30d: activity.bookings30d.get(t.id) ?? 0,
    openHour: t.open_hour,
    closeHour: t.close_hour,
    timezone: t.timezone,
    stripeCustomerId: t.stripe_customer_id,
    stripeSubscriptionId: t.stripe_subscription_id,
    createdAt: t.created_at,
  };
}

/** All clients, most recently active first. */
export async function listClients(): Promise<ClientRow[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];

  const [tenants, activity, engineUp, settings] = await Promise.all([
    fetchTenants(admin),
    activityIndex(),
    engineHealthy(),
    getWorkspaceSettings(),
  ]);

  const rows = tenants.map((t) => decorate(t, activity, engineUp, settings.planPrices));
  rows.sort((a, b) => {
    const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
    const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
    return tb - ta;
  });
  return rows;
}

/** Single client by tenant id, or null. */
export async function getClient(id: string): Promise<ClientRow | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;

  const [tenants, activity, engineUp, settings] = await Promise.all([
    fetchTenants(admin, id),
    activityIndex(),
    engineHealthy(),
    getWorkspaceSettings(),
  ]);
  if (tenants.length === 0) return null;
  return decorate(tenants[0], activity, engineUp, settings.planPrices);
}
