// Real service checks for the AI Health screen. Each probe is measured and
// bounded; a slow or missing dependency renders as degraded/down instead of
// hanging the page.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { stripe } from "./stripe";
import { ENGINE_URL } from "./engine";

export type ServiceState = "operational" | "degraded" | "down" | "unconfigured";

export interface ServiceStatus {
  name: string;
  state: ServiceState;
  label: string;
  latencyMs: number | null;
  note: string;
}

const DEGRADED_MS = 1200;

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; ok: boolean }> {
  const start = Date.now();
  try {
    await fn();
    return { ms: Date.now() - start, ok: true };
  } catch {
    return { ms: Date.now() - start, ok: false };
  }
}

function grade(ok: boolean, ms: number, downNote: string, name: string): ServiceStatus {
  if (!ok) return { name, state: "down", label: "Down", latencyMs: null, note: downNote };
  if (ms > DEGRADED_MS)
    return { name, state: "degraded", label: "Degraded", latencyMs: ms, note: "High latency" };
  return { name, state: "operational", label: "Operational", latencyMs: ms, note: "" };
}

async function checkEngine(): Promise<ServiceStatus> {
  const { ms, ok } = await timed(async () => {
    const res = await fetch(`${ENGINE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("bad status");
  });
  return grade(ok, ms, "Engine unreachable — calls fall back to voicemail", "Receptionist engine");
}

async function checkDatabase(): Promise<ServiceStatus> {
  const admin = supabaseAdmin();
  if (!admin) {
    return {
      name: "Database (Supabase)",
      state: "unconfigured",
      label: "Not configured",
      latencyMs: null,
      note: "Set SUPABASE env vars",
    };
  }
  const { ms, ok } = await timed(async () => {
    const { error } = await admin.from("tenants").select("id", { head: true, count: "exact" });
    if (error) throw error;
  });
  return grade(ok, ms, "Queries failing", "Database (Supabase)");
}

async function checkStripe(): Promise<ServiceStatus> {
  const s = stripe();
  if (!s) {
    return {
      name: "Stripe API",
      state: "unconfigured",
      label: "Not configured",
      latencyMs: null,
      note: "Set STRIPE_SECRET_KEY",
    };
  }
  const { ms, ok } = await timed(() => s.balance.retrieve());
  return grade(ok, ms, "API calls failing", "Stripe API");
}

async function checkTwilioStatus(): Promise<ServiceStatus> {
  // Twilio's public status page (voice + WhatsApp ride on Twilio here).
  try {
    const res = await fetch("https://status.twilio.com/api/v2/status.json", {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 120 },
    });
    if (!res.ok) throw new Error("bad status");
    const body = (await res.json()) as { status?: { indicator?: string; description?: string } };
    const indicator = body.status?.indicator ?? "none";
    const description = body.status?.description ?? "";
    if (indicator === "none") {
      return {
        name: "Twilio (voice + WhatsApp)",
        state: "operational",
        label: "Operational",
        latencyMs: null,
        note: "per status.twilio.com",
      };
    }
    return {
      name: "Twilio (voice + WhatsApp)",
      state: indicator === "minor" ? "degraded" : "down",
      label: indicator === "minor" ? "Degraded" : "Incident",
      latencyMs: null,
      note: description,
    };
  } catch {
    return {
      name: "Twilio (voice + WhatsApp)",
      state: "degraded",
      label: "Unknown",
      latencyMs: null,
      note: "Status page unreachable",
    };
  }
}

export async function checkServices(): Promise<ServiceStatus[]> {
  return Promise.all([checkEngine(), checkDatabase(), checkStripe(), checkTwilioStatus()]);
}

export interface HourBucket {
  hour: number; // 0..23, local
  count: number;
}

/** Guardrail + emergency + cancellation events per hour, last 24h. */
export async function incidentBars24h(): Promise<{ bars: HourBucket[]; total: number }> {
  const admin = supabaseAdmin();
  const bars: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  if (!admin) return { bars, total: 0 };

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data } = await admin
    .from("audit_events")
    .select("type, created_at")
    .gte("created_at", since)
    .in("type", ["guardrail.redacted", "emergency.detected", "booking.cancelled"])
    .limit(5000);

  let total = 0;
  for (const row of data ?? []) {
    const age = Date.now() - new Date(row.created_at).getTime();
    const bucket = 23 - Math.min(23, Math.floor(age / 3600_000));
    bars[bucket].count++;
    total++;
  }
  return { bars, total };
}
