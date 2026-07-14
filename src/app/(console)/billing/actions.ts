"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { stripe } from "@/lib/server/stripe";
import { getBillingData, invalidateBillingCache } from "@/lib/server/billing";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function retryInvoiceAction(invoiceId: string): Promise<ActionResult> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  const s = stripe();
  if (!s) return { ok: false, message: "Stripe not configured." };

  try {
    const inv = await s.invoices.pay(invoiceId);
    invalidateBillingCache();
    revalidatePath("/billing");
    return inv.status === "paid"
      ? { ok: true, message: `Invoice ${inv.number ?? invoiceId} paid` }
      : { ok: false, message: `Payment attempt did not settle (${inv.status})` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "payment failed";
    invalidateBillingCache();
    revalidatePath("/billing");
    return { ok: false, message: `Retry failed: ${msg}` };
  }
}

export async function retryAllFailedAction(): Promise<ActionResult> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  const s = stripe();
  if (!s) return { ok: false, message: "Stripe not configured." };

  const { failed } = await getBillingData();
  if (failed.length === 0) return { ok: true, message: "No failed payments to retry." };

  let paid = 0;
  for (const f of failed) {
    try {
      const inv = await s.invoices.pay(f.invoiceId);
      if (inv.status === "paid") paid++;
    } catch {
      // counted below as still failing
    }
  }
  invalidateBillingCache();
  revalidatePath("/billing");
  return {
    ok: paid > 0,
    message: `Retried ${failed.length} failed payment${failed.length === 1 ? "" : "s"} — ${paid} recovered`,
  };
}
