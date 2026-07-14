// Analytics aggregates: MRR history (monthly snapshots) and booking volume
// by month from the audit trail.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";

export interface MonthPoint {
  monthIso: string; // yyyy-mm-01
  label: string; // "Jul"
  value: number;
}

export async function mrrSeries(months = 12): Promise<MonthPoint[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("mrr_snapshots")
    .select("month, mrr_cents")
    .order("month", { ascending: false })
    .limit(months);
  return (data ?? [])
    .reverse()
    .map((r) => ({
      monthIso: r.month,
      label: new Date(r.month).toLocaleDateString("en-US", { month: "short" }),
      value: r.mrr_cents,
    }));
}

export async function bookingsByMonth(months = 12): Promise<MonthPoint[]> {
  const admin = supabaseAdmin();
  const now = new Date();
  const buckets: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      monthIso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "narrow" }),
      value: 0,
    });
  }
  if (!admin) return buckets;

  const since = buckets[0].monthIso;
  const { data } = await admin
    .from("audit_events")
    .select("created_at")
    .eq("type", "booking.confirmed")
    .gte("created_at", since)
    .limit(10000);

  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const bucket = buckets.find((b) => b.monthIso === key);
    if (bucket) bucket.value++;
  }
  return buckets;
}

/** SVG polyline points for a series in a W×H box (design-style chart). */
export function linePoints(
  series: number[],
  W = 640,
  H = 190,
  pad = 8
): { line: string; area: string } {
  if (series.length === 0) return { line: "", area: "" };
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = Math.max(1, max - min);
  const step = series.length > 1 ? (W - 20) / (series.length - 1) : 0;
  const pts = series.map((v, i) => {
    const x = i * step + 4;
    const y = H - pad - ((v - min) / span) * (H - pad * 2 - 8);
    return [x, y] as const;
  });
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} ${pts[pts.length - 1][0].toFixed(1)},${H} 4,${H}`;
  return { line, area };
}
