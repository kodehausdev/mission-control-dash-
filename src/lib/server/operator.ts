// The entire Mission Control authorization model: a signed-in Supabase user
// must have a row in `operators`. Tenant console users (profiles table) are
// NOT operators — the two audiences never share screens.

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "./supabase-admin";

export interface Operator {
  userId: string;
  name: string;
  email: string | null;
  role: string; // owner | admin | operator
  roleLabel: string; // "Operator · Admin" style, for the sidebar chip
  joinedAt: string | null;
}

function roleLabel(role: string) {
  const pretty = role.charAt(0).toUpperCase() + role.slice(1);
  return `Operator · ${pretty}`;
}

export type OperatorLookup =
  | { status: "ok"; operator: Operator }
  | { status: "anon" } // not signed in (or Supabase unconfigured)
  | { status: "forbidden" } // signed in, but no operators row
  | { status: "migration" }; // operators table missing — 0006 not applied

/** Resolve the current operator (no redirect). Deduped per request. */
export const getOperator = cache(async (): Promise<OperatorLookup> => {
  const sb = await supabaseServer();
  const admin = supabaseAdmin();
  if (!sb || !admin) return { status: "anon" };

  const { data } = await sb.auth.getUser();
  const user = data?.user;
  if (!user) return { status: "anon" };

  let op: { user_id: string; display_name: string | null; email: string | null; role: string; joined_at?: string | null } | null =
    null;
  let hasJoinedAtCol = true;
  {
    const { data, error } = await admin
      .from("operators")
      .select("user_id, display_name, email, role, joined_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error?.code === "PGRST205") return { status: "migration" };
    if (error) {
      // 0007 (joined_at) not applied yet — fall back to the pre-0007 shape
      // rather than breaking logins mid-rollout.
      hasJoinedAtCol = false;
      const retry = await admin
        .from("operators")
        .select("user_id, display_name, email, role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (retry.error?.code === "PGRST205") return { status: "migration" };
      op = retry.data;
    } else {
      op = data;
    }
  }
  if (!op) return { status: "forbidden" };

  // The only moment we can be certain someone has working credentials is a
  // successful authenticated resolution right here — auth.users timestamps
  // (email_confirmed_at, last_sign_in_at) turned out to flip on any clicked
  // link, invite or broken, whether or not a password was ever set. Stamp
  // it lazily on first real use instead of trusting those fields.
  let joinedAt = hasJoinedAtCol ? (op.joined_at ?? null) : new Date().toISOString();
  if (hasJoinedAtCol && !joinedAt) {
    joinedAt = new Date().toISOString();
    await admin
      .from("operators")
      .update({ joined_at: joinedAt })
      .eq("user_id", op.user_id)
      .is("joined_at", null);
  }

  return {
    status: "ok",
    operator: {
      userId: op.user_id,
      name: op.display_name ?? user.email ?? "Operator",
      email: op.email ?? user.email ?? null,
      role: op.role,
      roleLabel: roleLabel(op.role),
      joinedAt,
    },
  };
});

/** Gate for every console layout/route: redirects to /login when not an operator. */
export async function requireOperator(): Promise<Operator> {
  const res = await getOperator();
  if (res.status === "ok") return res.operator;
  redirect(
    res.status === "forbidden"
      ? "/login?reason=forbidden"
      : res.status === "migration"
        ? "/login?reason=migration"
        : "/login"
  );
}
