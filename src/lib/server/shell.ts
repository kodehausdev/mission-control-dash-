// Data for the app shell: sidebar badges + topbar system pill. Everything
// here must survive missing env/config and return calm defaults.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { engineHealthy } from "./engine";
import { getBillingData } from "./billing";
import { listClients } from "./clients";
import { listConversations } from "./activity";
import { daysUntil, moneyExact, timeShort } from "@/lib/format";
import type { SidebarCounts } from "@/components/shell/sidebar";
import type { NotificationItem } from "@/components/shell/notif-drawer";

export interface SystemStatus {
  ok: boolean;
  label: string; // "All systems go" | "Engine unreachable" | ...
}

export async function getShellCounts(): Promise<SidebarCounts> {
  const admin = supabaseAdmin();
  const fallback: SidebarCounts = {
    clients: 0,
    leads: 0,
    trials: 0,
    supportOpen: 0,
    aiDegraded: false,
  };
  if (!admin) return fallback;

  const nowIso = new Date().toISOString();
  const [clients, leads, trials, supportOpen] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("stage", "new"),
    admin
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .gt("trial_ends_at", nowIso),
    admin.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return {
    clients: clients.count ?? 0,
    leads: leads.count ?? 0,
    trials: trials.count ?? 0,
    supportOpen: supportOpen.count ?? 0,
    aiDegraded: !(await engineHealthy()),
  };
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const healthy = await engineHealthy();
  return healthy
    ? { ok: true, label: "All systems go" }
    : { ok: false, label: "Engine unreachable" };
}

/**
 * Notifications derived live from current state — failed payments, trials
 * about to end, engine outage, recent compliance events. No notification
 * store; if it's listed, it's true right now.
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const [billing, clients, convos, engineUp] = await Promise.all([
    getBillingData(),
    listClients(),
    listConversations(25),
    engineHealthy(),
  ]);

  const items: NotificationItem[] = [];

  if (!engineUp) {
    items.push({
      id: "engine-down",
      title: "Receptionist engine unreachable",
      body: "Live probes are failing — inbound calls fall back to voicemail until it recovers.",
      tone: "red",
      atLabel: "now",
      href: "/ai-health",
    });
  }

  for (const f of billing.failed.slice(0, 4)) {
    items.push({
      id: `pay-${f.invoiceId}`,
      title: `Payment failed — ${f.clientName}`,
      body: `${moneyExact(f.amountCents)} invoice · attempt ${f.attemptCount}, dunning active`,
      tone: "red",
      atLabel: "",
      href: "/billing",
    });
  }

  for (const c of clients) {
    const d = daysUntil(c.trialEndsAt);
    if (c.status === "Trial" && d !== null && d <= 3) {
      items.push({
        id: `trial-${c.id}`,
        title: `Trial ${d <= 0 ? "ends today" : d === 1 ? "ends tomorrow" : `ends in ${d} days`} — ${c.name}`,
        body: `${c.calls30d} calls handled in 30d · ${c.calls30d > 150 ? "high" : c.calls30d > 50 ? "medium" : "low"} conversion likelihood`,
        tone: "amber",
        atLabel: "",
        href: "/trials",
      });
    }
  }

  for (const cv of convos.filter((c) => c.outcomeTone === "red" || c.outcome === "Guardrail").slice(0, 3)) {
    items.push({
      id: `evt-${cv.id}`,
      title: `${cv.intent} — ${cv.tenantName}`,
      body: cv.summary,
      tone: cv.outcomeTone,
      atLabel: timeShort(cv.atIso),
      href: "/conversations",
    });
  }

  return items.slice(0, 8);
}
