// audit_events → human-readable activity. The engine's event stream is
// PHI-minimized at the source (phone tails only, no caller content), so
// everything here renders exactly what was durably recorded — no invented
// transcripts.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { channelLabel } from "@/lib/format";
import type { Tone } from "@/components/ui";

export interface AuditEventRow {
  id: number;
  tenant_id: string | null;
  event_id: string | null;
  type: string;
  channel: string | null;
  phone_tail: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface FeedItem {
  id: number;
  tenantId: string | null;
  tenantName: string;
  text: string;
  tone: Tone;
  atIso: string;
}

export interface ConversationRow {
  id: number;
  tenantId: string | null;
  tenantName: string;
  channel: string;
  phoneTail: string | null;
  intent: string; // event-derived label
  summary: string;
  outcome: string;
  outcomeTone: Tone;
  atIso: string;
  data: Record<string, unknown>;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** One-line description per event type — only whitelisted fields. */
export function describeEvent(e: AuditEventRow): { text: string; tone: Tone } {
  const d = e.data ?? {};
  const via = e.channel === "voice" ? "AI call" : channelLabel(e.channel);
  switch (e.type) {
    case "booking.confirmed": {
      const what = str(d.test_type) ?? "appointment";
      const when = [str(d.date), str(d.time_slot)].filter(Boolean).join(" · ");
      return {
        text: `booked ${what}${when ? ` — ${when}` : ""} via ${via}`,
        tone: "green",
      };
    }
    case "booking.cancelled": {
      const what = str(d.test_type) ?? "appointment";
      const when = [str(d.date), str(d.time_slot)].filter(Boolean).join(" · ");
      // Routine business event, not urgent — "red" is reserved for things
      // that actually need attention (emergency redirects, guardrail hits).
      return { text: `cancelled ${what}${when ? ` — ${when}` : ""}`, tone: "amber" };
    }
    case "call.answered": {
      const tail = e.phone_tail ? ` (··${e.phone_tail})` : "";
      const text =
        e.channel === "sms"
          ? `AI answered an SMS text${tail}`
          : e.channel === "whatsapp"
            ? `AI answered a WhatsApp message${tail}`
            : `AI answered a voice call${tail}`;
      return { text, tone: "purple" };
    }
    case "guardrail.redacted":
      return {
        text: `compliance guardrail intercepted a ${str(d.tool) ?? "model"} call`,
        tone: "amber",
      };
    case "emergency.detected":
      return { text: "emergency redirect fired — caller sent to 911 script", tone: "red" };
    case "optout.received":
      return { text: "caller opted out (STOP) — outbound suppressed", tone: "amber" };
    case "optout.restored":
      return { text: "caller opted back in (START)", tone: "green" };
    default:
      return { text: str(d.summary) ?? e.type, tone: "neutral" };
  }
}

function outcomeOf(e: AuditEventRow): { outcome: string; tone: Tone; intent: string } {
  switch (e.type) {
    case "booking.confirmed":
      return { outcome: "Booked", tone: "green", intent: "Booking" };
    case "booking.cancelled":
      return { outcome: "Cancelled", tone: "amber", intent: "Cancellation" };
    case "call.answered":
      return { outcome: "Answered", tone: "purple", intent: "Inbound call" };
    case "guardrail.redacted":
      return { outcome: "Guardrail", tone: "amber", intent: "Compliance intercept" };
    case "emergency.detected":
      return { outcome: "Escalated", tone: "red", intent: "Emergency redirect" };
    case "optout.received":
      return { outcome: "Opt-out", tone: "amber", intent: "STOP keyword" };
    case "optout.restored":
      return { outcome: "Opt-in", tone: "green", intent: "START keyword" };
    default:
      return { outcome: e.type, tone: "neutral", intent: e.type };
  }
}

async function tenantNames(): Promise<Map<string, string>> {
  const admin = supabaseAdmin();
  const map = new Map<string, string>();
  if (!admin) return map;
  const { data } = await admin.from("tenants").select("id, lab_name");
  for (const t of data ?? []) map.set(t.id, t.lab_name);
  return map;
}

async function recentEvents(limit: number, opts?: { tenantId?: string; afterId?: number }) {
  const admin = supabaseAdmin();
  if (!admin) return [] as AuditEventRow[];
  let q = admin
    .from("audit_events")
    .select("id, tenant_id, event_id, type, channel, phone_tail, data, created_at")
    .order("id", { ascending: false })
    .limit(limit);
  if (opts?.tenantId) q = q.eq("tenant_id", opts.tenantId);
  if (opts?.afterId) q = q.gt("id", opts.afterId);
  const { data } = await q;
  return (data ?? []) as AuditEventRow[];
}

export async function listFeed(
  limit = 10,
  opts?: { tenantId?: string; afterId?: number }
): Promise<FeedItem[]> {
  const [events, names] = await Promise.all([recentEvents(limit, opts), tenantNames()]);
  return events.map((e) => {
    const { text, tone } = describeEvent(e);
    return {
      id: e.id,
      tenantId: e.tenant_id,
      tenantName: e.tenant_id ? (names.get(e.tenant_id) ?? e.tenant_id) : "System",
      text,
      tone,
      atIso: e.created_at,
    };
  });
}

export async function listConversations(
  limit = 40,
  opts?: { tenantId?: string }
): Promise<ConversationRow[]> {
  const [events, names] = await Promise.all([recentEvents(limit, opts), tenantNames()]);
  return events.map((e) => {
    const d = e.data ?? {};
    const { outcome, tone, intent } = outcomeOf(e);
    const { text } = describeEvent(e);
    return {
      id: e.id,
      tenantId: e.tenant_id,
      tenantName: e.tenant_id ? (names.get(e.tenant_id) ?? e.tenant_id) : "System",
      channel: e.channel ?? "unknown",
      phoneTail: e.phone_tail,
      intent,
      summary: str(d.summary) ?? text,
      outcome,
      outcomeTone: tone,
      atIso: e.created_at,
      data: d,
    };
  });
}

export interface EmergencyEvent {
  id: number;
  tenantId: string | null;
  tenantName: string;
  phoneTail: string | null;
  summary: string;
  atIso: string;
}

/**
 * Emergency 911/ER redirects — the single most serious thing the engine can
 * do, and the only event type that gets its own dedicated query instead of
 * living inside the generic feed. Used for the Dashboard banner and the AI
 * Health counter.
 */
export async function recentEmergencies(hours = 24): Promise<EmergencyEvent[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const [{ data }, names] = await Promise.all([
    admin
      .from("audit_events")
      .select("id, tenant_id, phone_tail, data, created_at")
      .eq("type", "emergency.detected")
      .gte("created_at", since)
      .order("id", { ascending: false })
      .limit(50),
    tenantNames(),
  ]);
  return (data ?? []).map((e) => ({
    id: e.id,
    tenantId: e.tenant_id,
    tenantName: e.tenant_id ? (names.get(e.tenant_id) ?? e.tenant_id) : "Unknown",
    phoneTail: e.phone_tail,
    summary: str((e.data as Record<string, unknown> | null)?.summary) ?? "Emergency redirect fired.",
    atIso: e.created_at,
  }));
}

export interface TodayCounters {
  calls: number;
  bookings: number;
  answeredPct: number | null;
}

export async function todayCounters(): Promise<TodayCounters> {
  const admin = supabaseAdmin();
  if (!admin) return { calls: 0, bookings: 0, answeredPct: null };
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const { data } = await admin
    .from("audit_events")
    .select("type")
    .gte("created_at", midnight.toISOString())
    .limit(5000);
  let calls = 0;
  let bookings = 0;
  for (const row of data ?? []) {
    if (row.type === "call.answered") calls++;
    else if (row.type === "booking.confirmed") bookings++;
  }
  return { calls, bookings, answeredPct: null };
}

export interface LeaderRow {
  tenantId: string;
  name: string;
  bookings: number;
  deltaPct: number | null; // vs the prior window
}

/** Bookings leaderboard over the trailing `days`, with prior-window delta. */
export async function bookingsLeaderboard(days = 7, top = 5): Promise<LeaderRow[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];
  const now = Date.now();
  const since = new Date(now - days * 86_400_000).toISOString();
  const priorSince = new Date(now - 2 * days * 86_400_000).toISOString();

  const [{ data }, names] = await Promise.all([
    admin
      .from("audit_events")
      .select("tenant_id, created_at")
      .eq("type", "booking.confirmed")
      .gte("created_at", priorSince)
      .limit(5000),
    tenantNames(),
  ]);

  const current = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.tenant_id) continue;
    const bucket = row.created_at >= since ? current : prior;
    bucket.set(row.tenant_id, (bucket.get(row.tenant_id) ?? 0) + 1);
  }

  return [...current.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([tenantId, bookings]) => {
      const before = prior.get(tenantId) ?? 0;
      return {
        tenantId,
        name: names.get(tenantId) ?? tenantId,
        bookings,
        deltaPct: before === 0 ? null : Math.round(((bookings - before) / before) * 100),
      };
    });
}
