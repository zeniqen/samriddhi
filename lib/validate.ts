import { daysBetween } from "./dates";
import { CROP_WORDS, normaliseCrop } from "./crops";
import { VILLAGE_NATIVE, VILLAGES } from "./seed-data";
import type { ListingFields } from "./types";

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
  // Translation sometimes glues "pind"/"gaon" (village) onto the name: "Pindakha".
  const candidates = [cleaned, cleaned.replace(/^(pind|gaon|gram)/, "")].filter((c) => c.length >= 3);
  let best: { v: string; d: number } | null = null;
  for (const c of candidates) {
    for (const v of VILLAGES) {
      const d = levenshtein(c, v.toLowerCase());
      if (!best || d < best.d) best = { v, d };
    }
  }
  return best && best.d <= 2 ? best.v : null;
}

/** Village named in the original Hindi/Punjabi transcript, which translation can garble. */
export function findVillageInNative(transcript: string): string | null {
  for (const [village, spellings] of Object.entries(VILLAGE_NATIVE)) {
    if (spellings.some((s) => transcript.includes(s))) return village;
  }
  return null;
}

// Words translation produces when it garbles a place name ("गाँव दाखा" → "show it to the village").
const NOT_A_PLACE = new Set([
  "village", "gaon", "pind", "account", "show", "the", "it", "to", "from", "of", "my", "is", "pickup", "pick", "up",
  "today", "tomorrow", "day", "after", "kilo", "kilos", "kg", "rupees", "rupee", "price", "tomato", "tomatoes",
  "onion", "onions", "potato", "potatoes", "yes", "no", "here", "there",
]);

/** A place outside the seed list: 1–3 alphabetic words that aren't filler, title-cased ("ghaziabad" → "Ghaziabad"). */
function plausiblePlace(raw: string): string | null {
  const words = raw.trim().replace(/\b(village|pind|gaon|gram)\b/gi, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return null;
  if (!words.every((w) => /^[A-Za-z][A-Za-z'-]{1,}$/.test(w))) return null;
  if (words.some((w) => NOT_A_PLACE.has(w.toLowerCase()) || CROP_WORDS.has(w.toLowerCase()))) return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
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
    // Known villages first (fixes near-misses like "Dhaka" → "Dakha"), then any real-looking place name.
    const v = matchVillage(String(u.village)) ?? plausiblePlace(String(u.village));
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
