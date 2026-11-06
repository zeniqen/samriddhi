// What the farmer sees and hears about a listing or sale, in their own script.
import { VILLAGE_NATIVE } from "./seed-data";
import { cropName, formatDate } from "./templates";
import type { Lang, ListingFields } from "./types";

/** Buyer names as a farmer would read them (fictional seed buyers). */
const BUYER_NATIVE: Record<string, Record<Lang, string>> = {
  b1: { hi: "होटल सागर ढाबा", pa: "ਹੋਟਲ ਸਾਗਰ ਢਾਬਾ" },
  b2: { hi: "पंजाब रसोई कैटरर्स", pa: "ਪੰਜਾਬ ਰਸੋਈ ਕੇਟਰਰਜ਼" },
  b3: { hi: "शर्मा किराना स्टोर", pa: "ਸ਼ਰਮਾ ਕਰਿਆਨਾ ਸਟੋਰ" },
};

/** Dakha → दाखा / ਦਾਖਾ (Devanagari first, Gurmukhi last in VILLAGE_NATIVE). */
export function villageInScript(village: string, lang: Lang): string {
  const spellings = VILLAGE_NATIVE[village];
  if (!spellings) return village;
  return lang === "pa" ? spellings[spellings.length - 1] : spellings[0];
}

export function buyerInScript(buyerId: string, fallback: string, lang: Lang): string {
  return BUYER_NATIVE[buyerId]?.[lang] ?? fallback;
}

/** Template variables for the fixed read-back sentence. */
export function readBackVars(fields: ListingFields, lang: Lang) {
  const f = fields as Required<ListingFields>;
  return {
    kg: f.quantityKg,
    crop: cropName(f.crop, lang),
    price: f.askPricePerKg,
    total: f.quantityKg * f.askPricePerKg, // spoken before confirming: the number the farmer actually cares about
    village: villageInScript(f.village, lang),
    date: formatDate(f.pickupDate, lang),
  };
}
