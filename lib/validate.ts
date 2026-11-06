import { daysBetween } from "./dates";
import { CROPS, VILLAGES } from "./seed-data";
import type { Crop, ListingFields } from "./types";

export const LIMITS = { minKg: 1, maxKg: 10_000, minPrice: 1, maxPrice: 200, maxDaysAhead: 14 } as const;

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Map a spoken/translated village name onto the known list, or null. */
export function matchVillage(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(/\b(village|pind|gaon|gram)\b/g, "")
    .replace(/[^a-z]/g, "");
  if (cleaned.length < 3) return null;
  let best: { v: string; d: number } | null = null;
  for (const v of VILLAGES) {
    const d = levenshtein(cleaned, v.toLowerCase());
    if (!best || d < best.d) best = { v, d };
  }
  return best && best.d <= 2 ? best.v : null;
}

function normaliseCrop(raw: string): Crop | null {
  const c = raw.toLowerCase().trim().replace(/(es|s)$/, "");
  return (CROPS as string[]).includes(c) ? (c as Crop) : null;
}

const inRange = (n: unknown, min: number, max: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

export function validateUpdates(
  u: ListingFields,
  today: string,
): { accepted: ListingFields; rejected: (keyof ListingFields)[] } {
  const accepted: ListingFields = {};
  const rejected: (keyof ListingFields)[] = [];

  if (u.crop !== undefined) {
    const crop = normaliseCrop(String(u.crop));
    if (crop) accepted.crop = crop;
    else rejected.push("crop");
  }
  if (u.quantityKg !== undefined) {
    if (inRange(u.quantityKg, LIMITS.minKg, LIMITS.maxKg)) accepted.quantityKg = u.quantityKg;
    else rejected.push("quantityKg");
  }
  if (u.askPricePerKg !== undefined) {
    if (inRange(u.askPricePerKg, LIMITS.minPrice, LIMITS.maxPrice)) accepted.askPricePerKg = u.askPricePerKg;
    else rejected.push("askPricePerKg");
  }
  if (u.village !== undefined) {
    const v = matchVillage(String(u.village));
    if (v) accepted.village = v;
    else rejected.push("village");
  }
  if (u.pickupDate !== undefined) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(u.pickupDate) && inRange(daysBetween(today, u.pickupDate), 0, LIMITS.maxDaysAhead);
    if (ok) accepted.pickupDate = u.pickupDate;
    else rejected.push("pickupDate");
  }
  return { accepted, rejected };
}
