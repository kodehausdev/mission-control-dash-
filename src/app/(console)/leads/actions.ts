"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { STAGES, type Stage } from "@/lib/server/leads";

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

export async function deleteLeadAction(id: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const { error } = await supabaseAdmin()!.from("leads").delete().eq("id", id);
  if (error) return { ok: false, message: `Delete failed: ${error.message}` };

  revalidatePath("/leads");
  return { ok: true, message: "Lead deleted" };
}
