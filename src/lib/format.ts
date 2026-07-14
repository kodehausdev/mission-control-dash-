// Shared display formatting — safe on server and client.

export function money(cents: number | null | undefined, opts?: { compact?: boolean }): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  if (opts?.compact && dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(dollars >= 100_000 ? 0 : 1)}K`;
  }
  return `$${Math.round(dollars).toLocaleString("en-US")}`;
}

export function moneyExact(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** "2m ago" / "3h ago" / "2d ago" — matches the design's compact style. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Compact clock form for feeds: "2m", "1h", "3d". */
export function timeShort(iso: string | null | undefined): string {
  const label = timeAgo(iso);
  return label === "now" ? "now" : label.replace(" ago", "");
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}
