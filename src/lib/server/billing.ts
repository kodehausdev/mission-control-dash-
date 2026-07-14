// Stripe rollups: MRR/ARR, failed payments, upcoming renewals, refunds and
// recent invoices. All reads are server-side; results are cached briefly —
// several screens render these numbers on every navigation.

import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { supabaseAdmin } from "./supabase-admin";

export interface BillingSummary {
  connected: boolean;
  mrrCents: number;
  arrCents: number;
  activeSubs: number;
  netNewMrrCents: number | null; // vs previous month's snapshot
  failedCents: number;
  failedCount: number;
  renewals7dCents: number;
  renewals7dCount: number;
  refundsMtdCents: number;
  refundsMtdCount: number;
}

export interface InvoiceRow {
  id: string;
  number: string;
  clientName: string;
  amountCents: number;
  status: "Paid" | "Open" | "Failed" | "Void";
  dateIso: string;
}

export interface FailedPayment {
  invoiceId: string;
  clientName: string;
  attemptCount: number;
  amountCents: number;
}

export interface BillingData {
  summary: BillingSummary;
  invoices: InvoiceRow[];
  failed: FailedPayment[];
}

const EMPTY: BillingData = {
  summary: {
    connected: false,
    mrrCents: 0,
    arrCents: 0,
    activeSubs: 0,
    netNewMrrCents: null,
    failedCents: 0,
    failedCount: 0,
    renewals7dCents: 0,
    renewals7dCount: 0,
    refundsMtdCents: 0,
    refundsMtdCount: 0,
  },
  invoices: [],
  failed: [],
};

let cache: { value: BillingData; at: number } | null = null;
const TTL_MS = 60_000;

function monthlyCents(sub: Stripe.Subscription): number {
  let total = 0;
  for (const item of sub.items.data) {
    const price = item.price;
    if (!price?.unit_amount || !price.recurring) continue;
    const qty = item.quantity ?? 1;
    const per =
      price.recurring.interval === "year"
        ? price.unit_amount / 12
        : price.recurring.interval === "week"
          ? price.unit_amount * 4.33
          : price.unit_amount; // month
    total += per * qty;
  }
  return Math.round(total);
}

function subPeriodEnd(sub: Stripe.Subscription): number | null {
  let max: number | null = null;
  for (const item of sub.items.data) {
    const end = (item as unknown as { current_period_end?: number }).current_period_end;
    if (typeof end === "number") max = max === null ? end : Math.max(max, end);
  }
  if (max !== null) return max;
  // Older API shapes keep it on the subscription itself.
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof legacy === "number" ? legacy : null;
}

async function tenantNamesByCustomer(): Promise<Map<string, string>> {
  const admin = supabaseAdmin();
  const map = new Map<string, string>();
  if (!admin) return map;
  const { data } = await admin
    .from("tenants")
    .select("lab_name, stripe_customer_id")
    .not("stripe_customer_id", "is", null);
  for (const t of data ?? []) map.set(t.stripe_customer_id as string, t.lab_name as string);
  return map;
}

async function recordSnapshot(mrrCents: number, activeSubs: number) {
  const admin = supabaseAdmin();
  if (!admin) return;
  const month = new Date();
  const monthKey = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-01`;
  await admin
    .from("mrr_snapshots")
    .upsert({ month: monthKey, mrr_cents: mrrCents, active_subscriptions: activeSubs })
    .then(() => {});
}

async function previousSnapshot(): Promise<number | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const d = new Date();
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const key = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await admin
    .from("mrr_snapshots")
    .select("mrr_cents")
    .eq("month", key)
    .maybeSingle();
  return data?.mrr_cents ?? null;
}

export async function getBillingData(): Promise<BillingData> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const s = stripe();
  if (!s) return EMPTY;

  try {
    const [subsActive, subsPastDue, invoicesRes, refundsRes, names, prevMrr] = await Promise.all([
      s.subscriptions.list({ status: "active", limit: 100 }),
      s.subscriptions.list({ status: "past_due", limit: 100 }),
      s.invoices.list({ limit: 25 }),
      s.refunds.list({
        created: {
          gte: Math.floor(
            Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1) / 1000
          ),
        },
        limit: 100,
      }),
      tenantNamesByCustomer(),
      previousSnapshot(),
    ]);

    const subs = [...subsActive.data, ...subsPastDue.data];
    const mrrCents = subs.reduce((a, sub) => a + monthlyCents(sub), 0);
    const activeSubs = subs.length;

    const in7d = Math.floor(Date.now() / 1000) + 7 * 86400;
    let renewals7dCents = 0;
    let renewals7dCount = 0;
    for (const sub of subs) {
      const end = subPeriodEnd(sub);
      if (end !== null && end <= in7d && !sub.cancel_at_period_end) {
        renewals7dCents += monthlyCents(sub);
        renewals7dCount += 1;
      }
    }

    const clientName = (inv: Stripe.Invoice) =>
      (typeof inv.customer === "string" ? names.get(inv.customer) : null) ??
      inv.customer_name ??
      inv.customer_email ??
      "Unknown customer";

    const invoices: InvoiceRow[] = invoicesRes.data.map((inv) => {
      const failed = inv.status === "open" && (inv.attempt_count ?? 0) > 0;
      const status: InvoiceRow["status"] =
        inv.status === "paid"
          ? "Paid"
          : failed
            ? "Failed"
            : inv.status === "open"
              ? "Open"
              : "Void";
      return {
        id: inv.id ?? "",
        number: inv.number ?? inv.id ?? "—",
        clientName: clientName(inv),
        amountCents: inv.amount_due ?? 0,
        status,
        dateIso: new Date((inv.created ?? 0) * 1000).toISOString(),
      };
    });

    const failed: FailedPayment[] = invoicesRes.data
      .filter((inv) => inv.status === "open" && (inv.attempt_count ?? 0) > 0)
      .map((inv) => ({
        invoiceId: inv.id ?? "",
        clientName: clientName(inv),
        attemptCount: inv.attempt_count ?? 1,
        amountCents: inv.amount_due ?? 0,
      }));

    const value: BillingData = {
      summary: {
        connected: true,
        mrrCents,
        arrCents: mrrCents * 12,
        activeSubs,
        netNewMrrCents: prevMrr === null ? null : mrrCents - prevMrr,
        failedCents: failed.reduce((a, f) => a + f.amountCents, 0),
        failedCount: failed.length,
        renewals7dCents,
        renewals7dCount,
        refundsMtdCents: refundsRes.data.reduce((a, r) => a + (r.amount ?? 0), 0),
        refundsMtdCount: refundsRes.data.length,
      },
      invoices,
      failed,
    };

    cache = { value, at: Date.now() };
    void recordSnapshot(mrrCents, activeSubs);
    return value;
  } catch {
    return EMPTY;
  }
}

export function invalidateBillingCache() {
  cache = null;
}

export interface CustomerBilling {
  nextInvoiceIso: string | null;
  paymentMethodLabel: string | null; // "Visa ·· 4242"
  subscriptionStatus: string | null;
}

/** Per-customer billing facts for the client profile card. */
export async function getCustomerBilling(
  customerId: string | null,
  subscriptionId: string | null
): Promise<CustomerBilling> {
  const empty: CustomerBilling = {
    nextInvoiceIso: null,
    paymentMethodLabel: null,
    subscriptionStatus: null,
  };
  const s = stripe();
  if (!s || !customerId) return empty;

  try {
    const [pms, sub] = await Promise.all([
      s.paymentMethods.list({ customer: customerId, type: "card", limit: 1 }),
      subscriptionId ? s.subscriptions.retrieve(subscriptionId) : Promise.resolve(null),
    ]);

    const card = pms.data[0]?.card;
    const paymentMethodLabel = card
      ? `${card.brand.charAt(0).toUpperCase()}${card.brand.slice(1)} ·· ${card.last4}`
      : null;

    let nextInvoiceIso: string | null = null;
    if (sub) {
      const end = subPeriodEnd(sub);
      if (end !== null && !sub.cancel_at_period_end) {
        nextInvoiceIso = new Date(end * 1000).toISOString();
      }
    }

    return {
      nextInvoiceIso,
      paymentMethodLabel,
      subscriptionStatus: sub?.status ?? null,
    };
  } catch {
    return empty;
  }
}
