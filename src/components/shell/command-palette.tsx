"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShellUI } from "./shell-ui";
import { IconSearch } from "./icons";

interface Result {
  kind: string;
  label: string;
  meta: string;
  href: string;
}

export function CommandPalette() {
  const { closeCmd } = useShellUI();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loaded, setLoaded] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { results: Result[] };
        setResults(body.results);
        setLoaded(true);
      } catch {
        // leave previous results
      }
    }, 140);
    return () => clearTimeout(debounce.current);
  }, [q]);

  const go = (href: string) => {
    closeCmd();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-70 flex justify-center bg-[rgba(6,6,10,.6)] pt-[14vh]"
      onClick={closeCmd}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-fit w-[560px] overflow-hidden rounded-[14px] border border-white/10 bg-pop shadow-[0_24px_70px_rgba(0,0,0,.6)]"
      >
        <div className="flex items-center gap-[11px] border-b border-white/6 px-[17px] py-[14px] text-faint">
          <IconSearch size={14} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].href);
            }}
            placeholder="Search clients, phone numbers, invoices, leads…"
            className="flex-1 border-none bg-transparent text-sm text-fg placeholder:text-faint"
          />
          <span className="rounded bg-white/6 px-[6px] py-[2px] font-mono text-[10px] text-faint">
            esc
          </span>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-[6px]">
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.label}-${i}`}
              onClick={() => go(r.href)}
              className="flex w-full cursor-pointer items-center gap-[11px] rounded-lg px-[11px] py-2 text-left hover:bg-accent/12"
            >
              <span className="w-14 flex-none text-[10px] font-semibold uppercase tracking-[.05em] text-faint">
                {r.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.label}</span>
              <span className="font-mono text-[11px] text-ghost">{r.meta}</span>
            </button>
          ))}
          {loaded && q !== "" && results.length === 0 && (
            <div className="p-[22px] text-center text-[12.5px] text-faint">
              No results for “{q}”
            </div>
          )}
        </div>

        <div className="flex gap-[14px] border-t border-white/6 px-4 py-[9px] text-[10.5px] text-ghost">
          <span>
            <b className="text-mono-soft">⏎</b> open
          </span>
          <span>
            <b className="text-mono-soft">esc</b> close
          </span>
          <span className="flex-1" />
          <span>⌘K anywhere</span>
        </div>
      </div>
    </div>
  );
}
