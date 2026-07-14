"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BRANDING } from "@/lib/branding";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason");
  const forbidden = reason === "forbidden";
  const migration = reason === "migration";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL / ANON_KEY.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-[9px] border border-white/8 bg-field px-[13px] py-[9px] text-[13px] text-fg placeholder:text-faint focus:border-accent/50";

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

        {forbidden && (
          <div className="mb-4 rounded-[10px] border border-amber/22 bg-amber/8 px-[14px] py-[10px] text-[12.5px] text-amber-soft">
            This account isn&apos;t a Mission Control operator. Ask an owner to add you,
            or sign in with a different account.
          </div>
        )}
        {migration && (
          <div className="mb-4 rounded-[10px] border border-red/25 bg-red/8 px-[14px] py-[10px] text-[12.5px] leading-[1.5] text-red-soft">
            Mission Control&apos;s tables aren&apos;t installed yet. Run{" "}
            <span className="font-mono text-[11px]">
              medlab-engine/src/db/migrations/0006_mission_control.sql
            </span>{" "}
            in the Supabase SQL editor, then{" "}
            <span className="font-mono text-[11px]">node scripts/seed-operator.mjs</span>.
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@agency.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          {error && <div className="text-[12px] text-red">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 cursor-pointer rounded-lg bg-accent px-3 py-[8px] text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(108,92,231,.35)] hover:bg-accent-hi disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-center text-[11.5px] text-faint">
          Operator access only · sessions are cookie-scoped to this console
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
