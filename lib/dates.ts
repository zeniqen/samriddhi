const IST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** Today's date in India as YYYY-MM-DD, regardless of the server's timezone. */
export function todayIST(now: Date = new Date()): string {
  return IST.format(now);
}

/** Calendar arithmetic on a YYYY-MM-DD string (UTC-safe, no DST surprises). */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}
