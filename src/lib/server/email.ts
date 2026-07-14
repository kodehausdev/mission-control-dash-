// Transactional email via Resend, sent directly by Mission Control instead
// of relying on Supabase Auth's built-in mailer — that mailer is rate
// limited and unreliable for real invite/reset delivery (see the incident
// notes in lib/server/operator.ts history). Same pattern already proven in
// the optipropose-studio project: a plain POST to the Resend API, no SDK.

import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "Mission Control <mission-control@optipropose.com>";

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

// Interpolating raw values (the Supabase action link especially — its query
// string has unescaped `&` separating token/type/redirect_to) straight into
// HTML broke real invite links on at least one mobile mail client. Escape
// everything that lands in the template.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:32px 16px;background:#0d0d12;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <span style="display:none;font-size:1px;color:#0d0d12;">${preheader}</span>
  <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;">
    <tr><td style="padding-bottom:22px;">
      <span style="display:inline-flex;align-items:center;gap:9px;">
        <span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:#6C5CE7;color:#fff;font-weight:700;font-size:13px;line-height:26px;text-align:center;">M</span>
        <span style="color:#ECECF1;font-weight:600;font-size:14px;">Mission Control</span>
      </span>
    </td></tr>
    <tr><td style="background:#15151C;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:28px 24px;">
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding-top:18px;color:#55555F;font-size:11px;">
      If you weren't expecting this email, you can ignore it.
    </td></tr>
  </table>
</body>
</html>`;
}

export function operatorInviteEmail(actionLink: string, workspaceName: string) {
  const safeLink = escapeHtml(actionLink);
  const safeName = escapeHtml(workspaceName);
  const html = shell(
    `You've been invited to ${safeName}`,
    `<p style="color:#ECECF1;font-size:15px;font-weight:600;margin:0 0 8px;">You're invited to ${safeName}</p>
     <p style="color:#9494A6;font-size:13px;line-height:1.6;margin:0 0 20px;">
       Someone on the team added you as an operator on Mission Control. Click below to set your
       password and get in.
     </p>
     <a href="${safeLink}" style="display:inline-block;background:#6C5CE7;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;">
       Accept invite &amp; set password
     </a>
     <p style="color:#55555F;font-size:11px;margin:20px 0 0;">This link expires soon and can only be used once.</p>`
  );
  const text = `You're invited to ${workspaceName} on Mission Control.\n\nAccept your invite: ${actionLink}\n\nThis link expires soon and can only be used once.`;
  return { html, text };
}

export function operatorAccessLinkEmail(actionLink: string, workspaceName: string) {
  const safeLink = escapeHtml(actionLink);
  const safeName = escapeHtml(workspaceName);
  const html = shell(
    `Set your ${safeName} password`,
    `<p style="color:#ECECF1;font-size:15px;font-weight:600;margin:0 0 8px;">Set your password</p>
     <p style="color:#9494A6;font-size:13px;line-height:1.6;margin:0 0 20px;">
       You have an operator account on ${safeName}'s Mission Control, but no password set yet.
       Click below to choose one and get in.
     </p>
     <a href="${safeLink}" style="display:inline-block;background:#6C5CE7;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;">
       Set password &amp; continue
     </a>
     <p style="color:#55555F;font-size:11px;margin:20px 0 0;">This link expires soon and can only be used once.</p>`
  );
  const text = `Set your password for ${workspaceName} on Mission Control.\n\n${actionLink}\n\nThis link expires soon and can only be used once.`;
  return { html, text };
}
