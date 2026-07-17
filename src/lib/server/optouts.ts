// TCPA/CTIA opt-out visibility. The `optouts` table (engine/us-guardrails
// migration 0005) is engine-only — service-role, RLS-on-zero-policies, same
// posture as everything else Mission Control reads. It stores full phone
// numbers (the engine needs them to suppress sends), but the rest of this
// product only ever shows a 4-digit tail — mask it here too rather than
// leaking more than audit_events already does.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";

export interface OptOutSummary {
  count: number;
  recent: { phoneTail: string; updatedAt: string }[];
}

const EMPTY: OptOutSummary = { count: 0, recent: [] };

export async function getOptOuts(tenantId: string): Promise<OptOutSummary> {
  const admin = supabaseAdmin();
  if (!admin) return EMPTY;

  const { data, count, error } = await admin
    .from("optouts")
    .select("phone_number, updated_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("opted_out", true)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) return EMPTY; // table not migrated yet on this Supabase project

  return {
    count: count ?? 0,
    recent: (data ?? []).map((r) => ({
      phoneTail: String(r.phone_number).slice(-4),
      updatedAt: r.updated_at,
    })),
  };
}
