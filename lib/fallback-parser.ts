// Rule-based extractor used when the LLM is slow, down, or returns junk.
// Input is the English text Sarvam produced from the farmer's speech.
import { addDays } from "./dates";
import { normaliseNumbers } from "./number-words";
import { matchVillage } from "./validate";
import type { Crop, ListingFields } from "./types";

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`(kgs?|kilos?|kilograms?|quintals?)`;
const RUPEE = String.raw`(?:rs\.?|₹|rupees?|rupaye)`;
const PER = String.raw`(?:per|a|/)`;

const isQuintal = (unit?: string) => !!unit && unit.startsWith("quintal");

function findPrice(text: string): number | undefined {
  const patterns = [
    new RegExp(`${NUM}\\s*${RUPEE}\\s*(?:${PER}\\s*${UNIT})?`), // 16 rupees per kg
    new RegExp(`${RUPEE}\\s*${NUM}\\s*(?:${PER}\\s*${UNIT})?`), // Rs. 15/kg
    new RegExp(`${NUM}\\s*${PER}\\s*${UNIT}`), // 1600 per quintal
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const value = Number(m[1]);
      return isQuintal(m[2]) ? value / 100 : value;
    }
  }
  return undefined;
}

function findQuantity(text: string): number | undefined {
  const m = text.match(new RegExp(`${NUM}\\s*${UNIT}\\b`));
  if (!m) return undefined;
  return isQuintal(m[2]) ? Number(m[1]) * 100 : Number(m[1]);
}

function findCrop(text: string): Crop | undefined {
  const m = text.match(/\b(tomato(?:es)?|onions?|potato(?:es)?)\b/);
  if (!m) return undefined;
  return m[1].replace(/(es|s)$/, "") as Crop;
}

function findDate(text: string, today: string): string | undefined {
  if (/\bday after tomorrow\b/.test(text)) return addDays(today, 2);
  if (/\btomorrow\b/.test(text)) return addDays(today, 1);
  if (/\btoday\b/.test(text)) return today;
  return undefined;
}

const NOT_VILLAGES = new Set(["tomato", "tomatoes", "onion", "onions", "potato", "potatoes", "rupees", "kilos", "quintal", "quintals", "tomorrow", "village"]);

function findVillage(text: string): string | undefined {
  for (const word of text.split(/[^a-z]+/)) {
    if (word.length < 5 || NOT_VILLAGES.has(word)) continue;
    const v = matchVillage(word);
    if (v) return v;
  }
  return undefined;
}

export function parseFallback(english: string, today: string): ListingFields {
  const text = normaliseNumbers(english.toLowerCase());
  const out: ListingFields = {};
  const crop = findCrop(text);
  const quantityKg = findQuantity(text);
  const askPricePerKg = findPrice(text);
  const village = findVillage(text);
  const pickupDate = findDate(text, today);
  if (crop) out.crop = crop;
  if (quantityKg !== undefined) out.quantityKg = quantityKg;
  if (askPricePerKg !== undefined) out.askPricePerKg = askPricePerKg;
  if (village) out.village = village;
  if (pickupDate) out.pickupDate = pickupDate;
  return out;
}

// Relative-date words as spoken. Pickup is always in the future, so कल / ਕੱਲ੍ਹ (yesterday OR tomorrow) means tomorrow.
const NATIVE_DATE_WORDS: [string[], number][] = [
  [["परसों", "परसो", "ਪਰਸੋਂ", "ਪਰਸੋ"], 2],
  [["कल", "ਕੱਲ੍ਹ", "ਕੱਲ", "ਕਲ", "ਭਲਕੇ"], 1],
  [["आज", "ਅੱਜ"], 0],
];

/** Pickup date from the original Hindi/Punjabi words — deterministic, so it beats the LLM. */
export function findDateInNative(transcript: string, today: string): string | undefined {
  const words = new Set(transcript.split(/[\s,।.!?]+/).filter(Boolean));
  for (const [spellings, days] of NATIVE_DATE_WORDS) {
    if (spellings.some((s) => words.has(s))) return addDays(today, days);
  }
  return undefined;
}
