"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Pause/resume the AI receptionist for a tenant (tenants.ai_paused). */
export async function toggleAiAction(tenantId: string): Promise<ActionResult> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, lab_name, ai_paused")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return { ok: false, message: "Client not found." };

  const next = !tenant.ai_paused;
  const { error } = await admin.from("tenants").update({ ai_paused: next }).eq("id", tenantId);
  if (error) return { ok: false, message: `Update failed: ${error.message}` };

  revalidatePath(`/clients/${tenantId}`);
  revalidatePath("/clients");
  return {
    ok: true,
    message: next
      ? `AI paused for ${tenant.lab_name} — calls route to voicemail`
      : `AI resumed for ${tenant.lab_name}`,
  };
}
