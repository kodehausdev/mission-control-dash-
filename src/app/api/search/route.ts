// ⌘K command palette search: clients, leads, invoices, pages.

import { NextResponse } from "next/server";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { getBillingData } from "@/lib/server/billing";
import { moneyExact } from "@/lib/format";

export interface SearchResult {
  kind: "Client" | "Lead" | "Invoice" | "Page";
  label: string;
  meta: string;
  href: string;
}

const PAGES: SearchResult[] = [
  ["Dashboard", "/dashboard"],
  ["Clients", "/clients"],
  ["Leads", "/leads"],
  ["Trials", "/trials"],
  ["Billing", "/billing"],
  ["Support", "/support"],
  ["Conversations", "/conversations"],
  ["AI Health", "/ai-health"],
  ["Analytics", "/analytics"],
  ["Settings", "/settings"],
].map(([label, href]) => ({ kind: "Page" as const, label, meta: "", href }));

export async function GET(req: Request) {
  const op = await getOperator();
  if (op.status !== "ok") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const admin = supabaseAdmin();
  const results: SearchResult[] = [];

  if (admin) {
    const pattern = `%${q}%`;
    const [tenants, leads] = await Promise.all([
      q === ""
        ? admin.from("tenants").select("id, lab_name, twilio_number").limit(4)
        : admin
            .from("tenants")
            .select("id, lab_name, twilio_number")
            .or(`lab_name.ilike.${pattern},twilio_number.ilike.${pattern},id.ilike.${pattern}`)
            .limit(6),
      q === ""
        ? Promise.resolve({ data: [] })
        : admin
            .from("leads")
            .select("id, business, stage, value_cents")
            .ilike("business", pattern)
            .limit(5),
    ]);

    for (const t of tenants.data ?? []) {
      results.push({
        kind: "Client",
        label: t.lab_name,
        meta: t.twilio_number ?? "",
        href: `/clients/${encodeURIComponent(t.id)}`,
      });
    }
    for (const l of leads.data ?? []) {
      results.push({
        kind: "Lead",
        label: `${l.business} — ${String(l.stage).replace(/_/g, " ")}`,
        meta: l.value_cents ? `${moneyExact(l.value_cents)}/mo` : "",
        href: "/leads",
      });
    }
  }

  if (q !== "") {
    const { invoices } = await getBillingData();
    for (const iv of invoices) {
      if (
        iv.number.toLowerCase().includes(q) ||
        iv.clientName.toLowerCase().includes(q)
      ) {
        results.push({
          kind: "Invoice",
          label: `${iv.number} — ${iv.clientName}`,
          meta: moneyExact(iv.amountCents),
          href: "/billing",
        });
      }
    }
  }

  const pages =
    q === "" ? PAGES.slice(0, 4) : PAGES.filter((p) => p.label.toLowerCase().includes(q));
  results.push(...pages);

  return NextResponse.json({ results: results.slice(0, 9) });
}
