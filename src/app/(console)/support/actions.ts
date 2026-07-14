"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function operatorName(): Promise<string | null> {
  const op = await getOperator();
  return op.status === "ok" ? op.operator.name : null;
}

export async function replyToTicketAction(ticketId: number, body: string): Promise<ActionResult> {
  const name = await operatorName();
  if (!name) return { ok: false, message: "Not authorized." };
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const text = body.trim();
  if (!text) return { ok: false, message: "Reply is empty." };

  const { error } = await admin.from("ticket_messages").insert({
    ticket_id: ticketId,
    author: name,
    is_operator: true,
    body: text,
  });
  if (error) return { ok: false, message: `Reply failed: ${error.message}` };

  await admin
    .from("tickets")
    .update({ updated_at: new Date().toISOString(), status: "pending" })
    .eq("id", ticketId)
    .eq("status", "open"); // open → pending once we've replied

  revalidatePath("/support");
  return { ok: true, message: "Reply sent" };
}

export async function resolveTicketAction(ticketId: number): Promise<ActionResult> {
  const name = await operatorName();
  if (!name) return { ok: false, message: "Not authorized." };
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const { error } = await admin
    .from("tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) return { ok: false, message: `Update failed: ${error.message}` };

  revalidatePath("/support");
  return { ok: true, message: `TK-${ticketId} marked resolved` };
}

export async function createTicketAction(input: {
  subject: string;
  tenantId?: string;
  priority?: string;
  channel?: string;
  body?: string;
}): Promise<ActionResult> {
  const name = await operatorName();
  if (!name) return { ok: false, message: "Not authorized." };
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const subject = input.subject.trim();
  if (!subject) return { ok: false, message: "Subject is required." };

  const { data, error } = await admin
    .from("tickets")
    .insert({
      subject,
      tenant_id: input.tenantId || null,
      priority: input.priority ?? "normal",
      channel: input.channel ?? "email",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: `Create failed: ${error?.message}` };

  if (input.body?.trim()) {
    await admin.from("ticket_messages").insert({
      ticket_id: data.id,
      author: name,
      is_operator: true,
      body: input.body.trim(),
    });
  }

  revalidatePath("/support");
  return { ok: true, message: `TK-${data.id} created` };
}
