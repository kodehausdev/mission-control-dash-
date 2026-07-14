"use client";

/*
 * Receiving end of the operator invite/reset flow. Supabase's email lands
 * here with session tokens in the URL hash fragment (#access_token=...).
 *
 * This MUST explicitly set the session from those tokens rather than just
 * checking "is any session already present" — if the browser already has
 * an unrelated signed-in session (e.g. an owner testing a teammate's invite
 * link in the same browser), a presence-only check silently reuses that
 * existing session, and the password form below ends up resetting the
 * WRONG account's password. setSession() with the URL's own tokens always
 * overwrites whatever was there, which is the only version of this that's
 * actually safe.
 */

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BRANDING } from "@/lib/branding";

type Phase = "checking" | "ready" | "invalid" | "saving";

const inputCls =
  "w-full rounded-[9px] border border-white/8 bg-field px-[13px] py-[9px] text-[13px] text-fg placeholder:text-faint focus:border-accent/50";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      queueMicrotask(() => setPhase("invalid"));
      return;
    }

    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(rawHash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // No tokens in this URL at all — not a link we generated, or it was
      // already consumed. Do NOT fall back to "is a session already
      // present", since that's exactly what caused the wrong-account bug.
      queueMicrotask(() => setPhase("invalid"));
      return;
    }

    sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(
      ({ data, error }) => {
        if (error || !data.session) {
          setPhase("invalid");
          return;
        }
        // Scrub the tokens from the address bar so a refresh/back-nav
        // can't resubmit them, then reveal the set-password form.
        window.history.replaceState(null, "", window.location.pathname);
        setPhase("ready");
      }
    );
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    const sb = supabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured.");
      return;
    }

    setPhase("saving");
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setPhase("ready");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-5">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex items-center gap-[10px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-[15px] font-bold text-white shadow-[0_2px_8px_rgba(108,92,231,.4)]">
            {BRANDING.mark}
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-[-.01em]">
              {BRANDING.product}
            </span>
            <span className="text-[11px] text-faint">{BRANDING.workspace}</span>
          </div>
        </div>

        {phase === "checking" && (
          <div className="text-[12.5px] text-faint">Confirming your invite…</div>
        )}

        {phase === "invalid" && (
          <div className="rounded-[10px] border border-red/25 bg-red/8 px-[14px] py-[10px] text-[12.5px] leading-[1.5] text-red-soft">
            This invite link is invalid or has expired. Ask an owner to send a fresh one from
            Settings → Team.
          </div>
        )}

        {(phase === "ready" || phase === "saving") && (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="mb-1 text-[13px] font-medium">
              Set a password to finish joining {BRANDING.workspace}.
            </div>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
            {error && <div className="text-[12px] text-red">{error}</div>}
            <button
              type="submit"
              disabled={phase === "saving"}
              className="mt-1 cursor-pointer rounded-lg bg-accent px-3 py-[8px] text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(108,92,231,.35)] hover:bg-accent-hi disabled:opacity-60"
            >
              {phase === "saving" ? "Saving…" : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
