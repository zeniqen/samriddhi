// Fixed sentences the farmer hears when the AI reply fails the fact-check
// or a provider is down. Punjabi copy needs a proofread by a native speaker.
import type { Crop, Lang, ListingFields } from "./types";

export const TEMPLATE_KEYS = [
  "askAgain",
  "askCrop",
  "askQuantity",
  "askPrice",
  "askVillage",
  "askPickupDate",
  "readBack",
  "listingLive",
  "orderConfirmed",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

const COPY: Record<TemplateKey, Record<Lang, string>> = {
  askAgain: { hi: "माफ़ कीजिए, फिर से बोलिए।", pa: "ਮਾਫ਼ ਕਰਨਾ, ਫਿਰ ਤੋਂ ਬੋਲੋ।" },
  askCrop: { hi: "कौन सी फसल बेचनी है?", pa: "ਕਿਹੜੀ ਫ਼ਸਲ ਵੇਚਣੀ ਹੈ?" },
  askQuantity: { hi: "कितने किलो हैं?", pa: "ਕਿੰਨੇ ਕਿੱਲੋ ਹਨ?" },
  askPrice: { hi: "एक किलो का कितना दाम चाहिए?", pa: "ਇੱਕ ਕਿੱਲੋ ਦਾ ਕਿੰਨਾ ਭਾਅ ਚਾਹੀਦਾ ਹੈ?" },
  askVillage: { hi: "आपका गाँव कौन सा है?", pa: "ਤੁਹਾਡਾ ਪਿੰਡ ਕਿਹੜਾ ਹੈ?" },
  askPickupDate: { hi: "माल कब उठाना है?", pa: "ਮਾਲ ਕਦੋਂ ਚੁੱਕਣਾ ਹੈ?" },
  readBack: {
    hi: "{kg} किलो {crop}, {price} रुपये किलो, गाँव {village}, पिकअप {date}। सही है?",
    pa: "{kg} ਕਿੱਲੋ {crop}, {price} ਰੁਪਏ ਕਿੱਲੋ, ਪਿੰਡ {village}, ਪਿਕਅੱਪ {date}। ਠੀਕ ਹੈ?",
  },
  listingLive: { hi: "आपकी फसल अब खरीदारों को दिख रही है।", pa: "ਤੁਹਾਡੀ ਫ਼ਸਲ ਹੁਣ ਖਰੀਦਦਾਰਾਂ ਨੂੰ ਦਿਖ ਰਹੀ ਹੈ।" },
  orderConfirmed: {
    hi: "{buyer} ने आपके {kg} किलो {crop} {price} रुपये किलो पर खरीदे। आपको {total} रुपये मिलेंगे। पिकअप {date}।",
    pa: "{buyer} ਨੇ ਤੁਹਾਡੇ {kg} ਕਿੱਲੋ {crop} {price} ਰੁਪਏ ਕਿੱਲੋ ਤੇ ਖਰੀਦੇ। ਤੁਹਾਨੂੰ {total} ਰੁਪਏ ਮਿਲਣਗੇ। ਪਿਕਅੱਪ {date}।",
  },
};

const CROP_NAMES: Record<Crop, Record<Lang, string>> = {
  tomato: { hi: "टमाटर", pa: "ਟਮਾਟਰ" },
  onion: { hi: "प्याज़", pa: "ਪਿਆਜ਼" },
  potato: { hi: "आलू", pa: "ਆਲੂ" },
};

export function t(key: TemplateKey, lang: Lang, vars: Record<string, string | number> = {}): string {
  return COPY[key][lang].replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

export function cropName(crop: Crop, lang: Lang): string {
  return CROP_NAMES[crop][lang];
}

/** "2026-11-08" → "8 नवंबर" / "8 ਨਵੰਬਰ" (Latin digits so numbers stay readable). */
export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(`${lang}-IN-u-nu-latn`, { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

const ORDER: [keyof ListingFields, TemplateKey][] = [
  ["crop", "askCrop"],
  ["quantityKg", "askQuantity"],
  ["askPricePerKg", "askPrice"],
  ["village", "askVillage"],
  ["pickupDate", "askPickupDate"],
];

export function nextQuestionKey(f: ListingFields): TemplateKey | null {
  return ORDER.find(([field]) => f[field] === undefined)?.[1] ?? null;
}
