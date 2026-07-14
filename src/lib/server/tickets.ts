// Support inbox queries (tickets + ticket_messages).

import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import type { Tone } from "@/components/ui";

export interface TicketSummary {
  id: number;
  ref: string; // TK-<id>
  subject: string;
  tenantId: string | null;
  tenantName: string;
  priority: string;
  priorityTone: Tone;
  status: string; // open | pending | resolved
  channel: string;
  updatedAt: string;
  createdAt: string;
}

export interface TicketMessage {
  id: number;
  author: string;
  isOperator: boolean;
  body: string;
  atIso: string;
}

export interface TicketDetail extends TicketSummary {
  linkedCallId: string | null;
  messages: TicketMessage[];
  tenantPlanLabel: string | null;
}

export function priorityTone(priority: string, status: string): Tone {
  if (status === "resolved") return "green";
  if (priority === "urgent") return "red";
  if (priority === "high") return "amber";
  return "neutral";
}

interface TicketRecord {
  id: number;
  tenant_id: string | null;
  subject: string;
  priority: string;
  status: string;
  channel: string | null;
  linked_call_id: string | null;
  created_at: string;
  updated_at: string;
}

async function tenantInfo(): Promise<Map<string, { name: string; plan: string }>> {
  const admin = supabaseAdmin();
  const map = new Map<string, { name: string; plan: string }>();
  if (!admin) return map;
  const { data } = await admin.from("tenants").select("id, lab_name, plan");
  for (const t of data ?? []) {
    map.set(t.id, { name: t.lab_name, plan: t.plan ?? "standard" });
  }
  return map;
}

function summarize(t: TicketRecord, names: Map<string, { name: string; plan: string }>): TicketSummary {
  return {
    id: t.id,
    ref: `TK-${t.id}`,
    subject: t.subject,
    tenantId: t.tenant_id,
    tenantName: t.tenant_id ? (names.get(t.tenant_id)?.name ?? t.tenant_id) : "—",
    priority: t.priority,
    priorityTone: priorityTone(t.priority, t.status),
    status: t.status,
    channel: t.channel ?? "email",
    updatedAt: t.updated_at,
    createdAt: t.created_at,
  };
}

export async function listTickets(): Promise<TicketSummary[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];
  const [{ data }, names] = await Promise.all([
    admin
      .from("tickets")
      .select("id, tenant_id, subject, priority, status, channel, linked_call_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
    tenantInfo(),
  ]);
  return ((data ?? []) as TicketRecord[]).map((t) => summarize(t, names));
}

export async function getTicket(id: number): Promise<TicketDetail | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const [ticketRes, msgsRes, names] = await Promise.all([
    admin
      .from("tickets")
      .select("id, tenant_id, subject, priority, status, channel, linked_call_id, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("ticket_messages")
      .select("id, author, is_operator, body, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
    tenantInfo(),
  ]);
  if (!ticketRes.data) return null;
  const t = ticketRes.data as TicketRecord;
  const plan = t.tenant_id ? (names.get(t.tenant_id)?.plan ?? null) : null;

  return {
    ...summarize(t, names),
    linkedCallId: t.linked_call_id,
    tenantPlanLabel: plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null,
    messages: (msgsRes.data ?? []).map((m) => ({
      id: m.id,
      author: m.author,
      isOperator: m.is_operator,
      body: m.body,
      atIso: m.created_at,
    })),
  };
}
