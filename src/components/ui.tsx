/*
 * Shared presentational primitives, matched to the design handoff:
 * #15151C cards with 1px white/6 borders, 12px radius, soft shadow.
 */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/6 bg-card shadow-[0_1px_2px_rgba(0,0,0,.35)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  titleClassName = "",
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-4 py-[13px]">
      <span className={`text-[13px] font-semibold ${titleClassName}`}>{title}</span>
      {action}
    </div>
  );
}

/** KPI tile: label / mono value / delta line. */
export function StatCard({
  label,
  value,
  delta,
  deltaClass = "text-muted",
  labelClass = "text-muted",
  valueClass = "",
  children,
}: {
  label: string;
  value?: React.ReactNode;
  delta?: React.ReactNode;
  deltaClass?: string;
  labelClass?: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden px-[14px] py-[13px]">
      <div className={`text-[11px] font-medium ${labelClass}`}>{label}</div>
      {value !== undefined && (
        <div
          className={`mt-[5px] font-mono text-[22px] font-semibold tracking-[-.02em] ${valueClass}`}
        >
          {value}
        </div>
      )}
      {delta !== undefined && <div className={`mt-[3px] text-[11px] ${deltaClass}`}>{delta}</div>}
      {children}
    </Card>
  );
}

export type Tone = "green" | "amber" | "red" | "purple" | "neutral";

const TONE_BADGE: Record<Tone, string> = {
  green: "bg-green/11 text-green",
  amber: "bg-amber/12 text-amber",
  red: "bg-red/12 text-red",
  purple: "bg-accent/16 text-lav",
  neutral: "bg-white/7 text-mono-soft",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-md px-2 py-[2px] text-[11px] font-semibold ${TONE_BADGE[tone]}`}
    >
      {children}
    </span>
  );
}

const TONE_TEXT: Record<Tone, string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
  purple: "text-lav",
  neutral: "text-mono-soft",
};

const TONE_BG: Record<Tone, string> = {
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
  purple: "bg-lav",
  neutral: "bg-mono-soft",
};

export function toneText(tone: Tone) {
  return TONE_TEXT[tone];
}
export function toneBg(tone: Tone) {
  return TONE_BG[tone];
}

/** Colored status dot + label, e.g. AI "Live". */
export function DotLabel({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-[6px] text-xs ${TONE_TEXT[tone]}`}>
      <span className={`h-[6px] w-[6px] rounded-full ${TONE_BG[tone]}`} />
      {children}
    </span>
  );
}

/** Health meter: thin track + tone-colored fill + mono number. */
export function HealthBar({ health, tone }: { health: number; tone: Tone }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block h-1 w-11 overflow-hidden rounded-[3px] bg-white/7">
        <span
          className={`block h-full rounded-[3px] ${TONE_BG[tone]}`}
          style={{ width: `${health}%` }}
        />
      </span>
      <span className={`font-mono text-[11.5px] ${TONE_TEXT[tone]}`}>{health}</span>
    </span>
  );
}

/** Squared monogram tile (client initials). */
export function MonoTile({
  text,
  size = 24,
  className = "",
}: {
  text: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-md bg-white/5 text-[9.5px] font-semibold text-soft ${className}`}
      style={{ width: size, height: size }}
    >
      {text}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="text-[19px] font-semibold tracking-[-.02em]">{title}</div>
        {subtitle && <div className="mt-[2px] text-[12.5px] text-muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/** Health score → tone, per the design's thresholds. */
export function healthTone(health: number): Tone {
  return health >= 80 ? "green" : health >= 60 ? "amber" : "red";
}
