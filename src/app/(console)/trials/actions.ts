"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function guard(): Promise<ActionResult | null> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  if (!supabaseAdmin()) return { ok: false, message: "Supabase not configured." };
  return null;
}

export async function extendTrialAction(tenantId: string, days = 7): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const admin = supabaseAdmin()!;

  const { data: tenant } = await admin
    .from("tenants")
    .select("lab_name, trial_ends_at")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant?.trial_ends_at) return { ok: false, message: "No active trial on this client." };

  const base = Math.max(new Date(tenant.trial_ends_at).getTime(), Date.now());
  const next = new Date(base + days * 86_400_000).toISOString();
  const { error } = await admin.from("tenants").update({ trial_ends_at: next }).eq("id", tenantId);
  if (error) return { ok: false, message: `Extend failed: ${error.message}` };

  revalidatePath("/trials");
  revalidatePath("/dashboard");
  return { ok: true, message: `Trial extended ${days} days for ${tenant.lab_name}` };
}

/**
 * Marks the trial finished (trial_ends_at → now). The real subscription is
 * still created out of band (activate-tenant CLI / Stripe) — this action
 * says so rather than pretending to charge.
 */
export async function convertTrialAction(tenantId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const admin = supabaseAdmin()!;

  const { data: tenant } = await admin
    .from("tenants")
    .select("lab_name, trial_ends_at, stripe_subscription_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant?.trial_ends_at) return { ok: false, message: "No active trial on this client." };

  const { error } = await admin
    .from("tenants")
    .update({ trial_ends_at: new Date().toISOString() })
    .eq("id", tenantId);
  if (error) return { ok: false, message: `Convert failed: ${error.message}` };

  revalidatePath("/trials");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: tenant.stripe_subscription_id
      ? `${tenant.lab_name} marked converted — subscription already active`
      : `${tenant.lab_name} marked converted — now create the subscription (activate-tenant / Stripe)`,
  };
}
