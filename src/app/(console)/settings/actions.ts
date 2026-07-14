"use server";

import { revalidatePath } from "next/cache";
import { getOperator } from "@/lib/server/operator";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { invalidateSettingsCache, getWorkspaceSettings } from "@/lib/server/settings";
import { operatorAccessLinkEmail, operatorInviteEmail, sendEmail } from "@/lib/server/email";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function guard(): Promise<ActionResult | null> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  if (!supabaseAdmin()) return { ok: false, message: "Supabase not configured." };
  return null;
}

export async function updateWorkspaceAction(input: {
  workspaceName: string;
  companyName: string;
  defaultTrialDays: number;
}): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const { error } = await supabaseAdmin()!
    .from("workspace_settings")
    .upsert({
      id: true,
      workspace_name: input.workspaceName.trim() || null,
      company_name: input.companyName.trim() || null,
      default_trial_days: Math.max(1, Math.round(input.defaultTrialDays) || 14),
      updated_at: new Date().toISOString(),
    });
  if (error) return { ok: false, message: `Save failed: ${error.message}` };

  invalidateSettingsCache();
  revalidatePath("/settings");
  return { ok: true, message: "Workspace settings saved" };
}

export async function toggleAlertAction(key: string, on: boolean): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const current = await getWorkspaceSettings();
  const alerts = { ...current.alerts, [key]: on };
  const { error } = await supabaseAdmin()!
    .from("workspace_settings")
    .upsert({ id: true, alerts, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: `Save failed: ${error.message}` };

  invalidateSettingsCache();
  revalidatePath("/settings");
  return { ok: true, message: on ? "Alert enabled" : "Alert disabled" };
}

export async function updateMyNameAction(displayName: string): Promise<ActionResult> {
  const op = await getOperator();
  if (op.status !== "ok") return { ok: false, message: "Not authorized." };
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  const name = displayName.trim();
  if (!name) return { ok: false, message: "Name can't be empty." };

  const { error } = await admin
    .from("operators")
    .update({ display_name: name })
    .eq("user_id", op.operator.userId);
  if (error) return { ok: false, message: `Save failed: ${error.message}` };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Name updated" };
}

const ROLES = ["owner", "admin", "operator"] as const;

export async function updateOperatorRoleAction(
  targetUserId: string,
  newRole: string
): Promise<ActionResult> {
  const me = await getOperator();
  if (me.status !== "ok") return { ok: false, message: "Not authorized." };
  if (me.operator.role !== "owner") {
    return { ok: false, message: "Only owners can change roles." };
  }
  if (!ROLES.includes(newRole as (typeof ROLES)[number])) {
    return { ok: false, message: "Unknown role." };
  }
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, message: "Supabase not configured." };

  if (newRole !== "owner") {
    const { data: target } = await admin
      .from("operators")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (target?.role === "owner") {
      const { count } = await admin
        .from("operators")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "owner");
      if ((count ?? 0) <= 1) {
        return { ok: false, message: "Can't demote the last owner." };
      }
    }
  }

  const { error } = await admin
    .from("operators")
    .update({ role: newRole })
    .eq("user_id", targetUserId);
  if (error) return { ok: false, message: `Update failed: ${error.message}` };

  revalidatePath("/settings");
  return { ok: true, message: `Role updated to ${newRole}` };
}

export async function inviteOperatorAction(input: {
  email: string;
  displayName?: string;
  role?: string;
}): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const admin = supabaseAdmin()!;

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, message: "Valid email required." };
  const role = ["owner", "admin", "operator"].includes(input.role ?? "")
    ? input.role!
    : "operator";

  // Mission Control sends its own email via Resend instead of letting
  // Supabase's built-in mailer handle it — that mailer is rate-limited and
  // was unreliable in practice (see the incident notes on operator.ts).
  // generateLink() only ever returns a token; it never sends anything.
  const appUrl = process.env.APP_URL ?? "http://localhost:3002";
  const redirectTo = `${appUrl}/accept-invite`;
  const settings = await getWorkspaceSettings();
  let userId: string | null = null;
  let emailAction: "invited" | "reset-sent" | "already-joined" = "invited";
  let actionLink: string | null = null;

  const { data: inviteLink, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  if (inviteLink?.user) {
    userId = inviteLink.user.id;
    actionLink = inviteLink.properties.action_link;
  } else {
    // generateLink({type:'invite'}) refuses once *any* auth account exists
    // for this email — including a stale, never-completed one (see the
    // joined_at note above). Link the existing account, and if they've
    // never actually finished setting a password, generate a real
    // recovery link instead of silently doing nothing (the original bug).
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (!userId) return { ok: false, message: `Invite failed: ${inviteError?.message}` };

    const { data: existingOp } = await admin
      .from("operators")
      .select("joined_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingOp?.joined_at) {
      emailAction = "already-joined";
    } else {
      const { data: recoveryLink, error: recoveryError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      if (recoveryError || !recoveryLink) {
        return { ok: false, message: `Could not generate access link: ${recoveryError?.message}` };
      }
      actionLink = recoveryLink.properties.action_link;
      emailAction = "reset-sent";
    }
  }

  if (actionLink) {
    const { html, text } =
      emailAction === "invited"
        ? operatorInviteEmail(actionLink, settings.workspaceName)
        : operatorAccessLinkEmail(actionLink, settings.workspaceName);
    const sent = await sendEmail({
      to: email,
      subject:
        emailAction === "invited"
          ? `You're invited to ${settings.workspaceName}`
          : `Set your ${settings.workspaceName} password`,
      html,
      text,
    });
    if (!sent.ok) return { ok: false, message: `Email failed to send: ${sent.error}` };
  }

  const { error } = await admin.from("operators").upsert({
    user_id: userId,
    email,
    display_name: input.displayName?.trim() || null,
    role,
  });
  if (error) return { ok: false, message: `Grant failed: ${error.message}` };

  revalidatePath("/settings");
  const messages = {
    invited: `Invite email sent to ${email}`,
    "reset-sent": `${email} had a stale account — sent a fresh access-link email instead`,
    "already-joined": `${email} already has access — role updated to ${role}`,
  };
  return { ok: true, message: messages[emailAction] };
}
