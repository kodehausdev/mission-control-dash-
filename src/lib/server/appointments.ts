// Appointments (the engine's only durable patient data) + per-tenant
// 30-day event stats for the client profile.

import "server-only";
import { supabaseAdmin } from "./supabase-admin";

export interface AppointmentRow {
  id: number;
  patientName: string;
  testType: string;
  date: string; // yyyy-mm-dd
  timeSlot: string; // HH:MM
  channel: string;
  status: string;
}

export async function upcomingAppointments(
  tenantId: string,
  limit = 5
): Promise<AppointmentRow[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("appointments")
    .select("id, patient_name, test_type, date, time_slot, channel, status")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmed")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("time_slot", { ascending: true })
    .limit(limit);
  return (data ?? []).map((a) => ({
    id: a.id,
    patientName: a.patient_name,
    testType: a.test_type,
    date: a.date,
    timeSlot: a.time_slot,
    channel: a.channel,
    status: a.status,
  }));
}

export interface TenantStats {
  calls30d: number;
  bookings30d: number;
  cancellations30d: number;
  guardrails30d: number;
  bookingRatePct: number | null;
}

export async function tenantStats(tenantId: string): Promise<TenantStats> {
  const admin = supabaseAdmin();
  const empty: TenantStats = {
    calls30d: 0,
    bookings30d: 0,
    cancellations30d: 0,
    guardrails30d: 0,
    bookingRatePct: null,
  };
  if (!admin) return empty;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await admin
    .from("audit_events")
    .select("type")
    .eq("tenant_id", tenantId)
    .gte("created_at", since)
    .limit(5000);

  for (const row of data ?? []) {
    if (row.type === "call.answered") empty.calls30d++;
    else if (row.type === "booking.confirmed") empty.bookings30d++;
    else if (row.type === "booking.cancelled") empty.cancellations30d++;
    else if (row.type === "guardrail.redacted" || row.type === "emergency.detected")
      empty.guardrails30d++;
  }
  empty.bookingRatePct =
    empty.calls30d > 0 ? Math.round((empty.bookings30d / empty.calls30d) * 100) : null;
  return empty;
}
