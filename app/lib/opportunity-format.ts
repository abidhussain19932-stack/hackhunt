export const COLUMNS = [
  { id: "scouted", label: "Scouted", hint: "Found by you or the agent" },
  { id: "shortlisted", label: "Shortlisted", hint: "Worth a shot" },
  { id: "building", label: "Building", hint: "In progress" },
  { id: "submitted", label: "Submitted", hint: "Waiting on results" },
  { id: "won", label: "Won", hint: "Paid out or pending" },
  { id: "passed", label: "Passed", hint: "Skipped or missed" },
] as const;

export type Status = (typeof COLUMNS)[number]["id"];

export function timeLeft(deadlineAt: string | null | undefined, now = Date.now()) {
  if (!deadlineAt) return { label: "No deadline", tone: "muted" as const, ms: Infinity };
  const ms = Date.parse(deadlineAt) - now;
  if (Number.isNaN(ms)) return { label: "No deadline", tone: "muted" as const, ms: Infinity };
  if (ms <= 0) return { label: "Closed", tone: "muted" as const, ms };
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const label = d >= 2 ? `${d}d left` : h >= 1 ? `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m left` : `${Math.max(1, Math.floor(ms / 60_000))}m left`;
  const tone = h < 24 ? ("urgent" as const) : h < 72 ? ("soon" as const) : ("ok" as const);
  return { label, tone, ms };
}

export function localDeadline(deadlineAt: string | null | undefined) {
  if (!deadlineAt) return "";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(deadlineAt));
}

export function money(usd: number | null | undefined) {
  if (usd == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(usd);
}

export const TONE_CLASS = {
  urgent: "bg-red-500/15 text-red-600 dark:text-red-400",
  soon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  muted: "bg-muted text-muted-foreground",
} as const;

export function fitClass(score: number | null | undefined) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 75) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (score >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-red-500/15 text-red-600 dark:text-red-400";
}
