// Server-only Stripe client. Null when unconfigured so screens can render
// their "Stripe not connected" empty states instead of crashing.

import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key);
  return cached;
}
