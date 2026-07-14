// Sales pipeline (leads table) — kanban queries.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";

export const STAGES = [
  "new",
  "demo_scheduled",
  "demo_completed",
  "proposal_sent",
  "won",
  "lost",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_META: Record<Stage, { label: string; color: string }> = {
  new: { label: "New Lead", color: "#8B8B99" },
  demo_scheduled: { label: "Demo Scheduled", color: "#A99DFF" },
  demo_completed: { label: "Demo Completed", color: "#6C5CE7" },
  proposal_sent: { label: "Proposal Sent", color: "#E5A63B" },
  won: { label: "Won", color: "#3DD68C" },
  lost: { label: "Lost", color: "#55555F" },
};

export interface LeadRow {
  id: number;
  business: string;
  ownerName: string | null;
  industry: string | null;
  note: string | null;
  valueCents: number | null;
  stage: Stage;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsBoard {
  columns: { stage: Stage; label: string; color: string; sumCents: number; cards: LeadRow[] }[];
  pipelineCents: number; // active stages only
  demoWinRatePct: number | null; // won / (won + lost)
}

export async function getLeadsBoard(): Promise<LeadsBoard> {
  const admin = supabaseAdmin();
  const rows: LeadRow[] = [];
  if (admin) {
    const { data } = await admin
      .from("leads")
      .select("id, business, owner_name, industry, note, value_cents, stage, phone, email, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(300);
    for (const l of data ?? []) {
      rows.push({
        id: l.id,
        business: l.business,
        ownerName: l.owner_name,
        industry: l.industry,
        note: l.note,
        valueCents: l.value_cents,
        stage: (STAGES as readonly string[]).includes(l.stage) ? (l.stage as Stage) : "new",
        phone: l.phone,
        email: l.email,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      });
    }
  }

  const columns = STAGES.map((stage) => {
    const cards = rows.filter((r) => r.stage === stage);
    return {
      stage,
      label: STAGE_META[stage].label,
      color: STAGE_META[stage].color,
      sumCents: cards.reduce((a, c) => a + (c.valueCents ?? 0), 0),
      cards,
    };
  });

  const active = ["new", "demo_scheduled", "demo_completed", "proposal_sent"] as Stage[];
  const pipelineCents = columns
    .filter((c) => active.includes(c.stage))
    .reduce((a, c) => a + c.sumCents, 0);
  const won = columns.find((c) => c.stage === "won")?.cards.length ?? 0;
  const lost = columns.find((c) => c.stage === "lost")?.cards.length ?? 0;
  const demoWinRatePct = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  return { columns, pipelineCents, demoWinRatePct };
}
