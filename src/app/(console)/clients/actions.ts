"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { createTenant } from "@/lib/server/clients";

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

export async function createClientAction(input: {
  business: string;
  industry?: string;
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  plan: string;
  status: "trial" | "active";
  trialDays?: number;
}): Promise<ActionResult> {
  const denied = await requireRole("admin");
  if (denied) return denied;
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const result = await createTenant(admin, input);
  if (!result.ok) return result;

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ...result, message: `${input.business.trim()} added` };
}
