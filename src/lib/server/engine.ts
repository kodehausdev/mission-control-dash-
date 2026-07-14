// Client for the medlab-engine live feed. The engine is optional — every
// caller must handle `null` (engine down / not configured) and degrade to
// the durable Supabase audit trail.

import "server-only";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:3000";

export interface EngineState {
  tenant: { id: string; lab_name: string };
  counters: Record<string, number>;
  recent: EngineEvent[];
}

export interface EngineEvent {
  id: string;
  type: string;
  channel?: string;
  phone_tail?: string;
  data?: Record<string, unknown>;
  ts?: string;
}

async function engineFetch(path: string, timeoutMs = 1500): Promise<Response | null> {
  try {
    const res = await fetch(`${ENGINE_URL}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** true when the engine answers /health. */
export async function engineHealthy(): Promise<boolean> {
  return (await engineFetch("/health")) !== null;
}

/** Live counters + ring buffer, or null when the engine is unreachable. */
export async function engineState(tenantId?: string): Promise<EngineState | null> {
  const qs = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : "";
  const res = await engineFetch(`/api/dashboard/state${qs}`);
  if (!res) return null;
  try {
    return (await res.json()) as EngineState;
  } catch {
    return null;
  }
}
