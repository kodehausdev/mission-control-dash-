"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

function slugify(business: string): string {
  const base = business
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "client"}-${suffix}`;
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
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const business = input.business.trim();
  if (!business) return { ok: false, message: "Business name is required." };

  const id = slugify(business);
  const trialEndsAt =
    input.status === "trial"
      ? new Date(Date.now() + Math.max(1, input.trialDays ?? 14) * 86_400_000).toISOString()
      : null;

  const { error } = await admin.from("tenants").insert({
    id,
    lab_name: business,
    industry: input.industry?.trim() || null,
    owner_name: input.ownerName?.trim() || null,
    owner_email: input.ownerEmail?.trim() || null,
    twilio_number: input.phone?.trim() || null,
    plan: input.plan,
    trial_ends_at: trialEndsAt,
    // Hand-provisioned by the agency (not self-serve) — same convention as
    // legacy tenants in schema.sql: starts live_active, numbers/billing get
    // configured out of band. Trial/Active status is purely trial_ends_at.
    onboarding_state: "live_active",
  });
  if (error) return { ok: false, message: `Create failed: ${error.message}` };

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true, message: `${business} added`, id };
}
