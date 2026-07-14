"use server";

import { revalidatePath } from "next/cache";
import { getOperator, requireRole } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { STAGES, type Stage } from "@/lib/server/leads";
import { createTenant } from "@/lib/server/clients";

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

async function guard(): Promise<ActionResult | null> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  if (!supabaseAdmin()) return { ok: false, message: "Supabase not configured." };
  return null;
}

export async function createLeadAction(input: {
  business: string;
  ownerName?: string;
  industry?: string;
  note?: string;
  valueDollars?: number;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const business = input.business.trim();
  if (!business) return { ok: false, message: "Business name is required." };

  const { error } = await supabaseAdmin()!.from("leads").insert({
    business,
    owner_name: input.ownerName?.trim() || null,
    industry: input.industry?.trim() || null,
    note: input.note?.trim() || null,
    value_cents:
      input.valueDollars && input.valueDollars > 0 ? Math.round(input.valueDollars * 100) : null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    stage: "new",
  });
  if (error) return { ok: false, message: `Create failed: ${error.message}` };

  revalidatePath("/leads");
  return { ok: true, message: `Lead added — ${business}` };
}

export async function moveLeadAction(id: number, stage: Stage): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!STAGES.includes(stage)) return { ok: false, message: "Unknown stage." };

  const { data, error } = await supabaseAdmin()!
    .from("leads")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("business")
    .maybeSingle();
  if (error) return { ok: false, message: `Move failed: ${error.message}` };

  revalidatePath("/leads");
  return { ok: true, message: `${data?.business ?? "Lead"} moved` };
}

/**
 * Converts a Won lead into a real client — reuses the same tenant-creation
 * path as the "New client" dialog so the two never drift apart. Leads move
 * through the pipeline manually; self-serve signups already land in
 * `tenants` directly without going through leads at all.
 */
export async function convertLeadToClientAction(id: number): Promise<ActionResult> {
  const denied = await requireRole("admin");
  if (denied) return denied;
  const admin = supabaseAdmin()!;

  const { data: lead, error: fetchError } = await admin
    .from("leads")
    .select("business, owner_name, industry, email, phone, value_cents, stage, tenant_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !lead) return { ok: false, message: "Lead not found." };
  if (lead.stage !== "won") return { ok: false, message: "Only Won leads can convert to a client." };
  if (lead.tenant_id) return { ok: false, message: "This lead is already linked to a client." };

  const result = await createTenant(admin, {
    business: lead.business,
    industry: lead.industry ?? undefined,
    ownerName: lead.owner_name ?? undefined,
    ownerEmail: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    plan: "starter",
    status: "active", // Won means the deal is closed, not a trial
  });
  if (!result.ok) return result;

  const { error: linkError } = await admin
    .from("leads")
    .update({ tenant_id: result.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (linkError) return { ok: false, message: `Client created but linking the lead failed: ${linkError.message}` };

  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true, message: `${lead.business} converted to a client`, id: result.id };
}

export async function deleteLeadAction(id: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const { error } = await supabaseAdmin()!.from("leads").delete().eq("id", id);
  if (error) return { ok: false, message: `Delete failed: ${error.message}` };

  revalidatePath("/leads");
  return { ok: true, message: "Lead deleted" };
}
