// Every crop a farmer can list: the English id the AI uses, the names read aloud in Hindi and Punjabi,
// and the other ways the crop shows up in speech (English plurals, Hindi/Punjabi spelling variants).
// A crop not in this list is asked for again rather than guessed, so the farmer never hears a wrong name.
import type { Lang } from "./types";

type CropDef = {
  /** What the buyer sees. */
  en: string;
  hi: string;
  pa: string;
  /** Other English words translation may produce (plurals, local names). */
  aliases?: string[];
  /** Other spellings in the farmer's own script, found in the raw transcript. */
  native?: string[];
  /** The word is too common to trust in the raw transcript (आम also means "common"); rely on the AI instead. */
  ambiguousNative?: boolean;
};

const CATALOGUE = {
  // Vegetables
  tomato: { en: "Tomato", hi: "टमाटर", pa: "ਟਮਾਟਰ", aliases: ["tomatoes"] },
  onion: { en: "Onion", hi: "प्याज़", pa: "ਪਿਆਜ਼", aliases: ["onions"], native: ["प्याज", "ਪਿਆਜ"] },
  potato: { en: "Potato", hi: "आलू", pa: "ਆਲੂ", aliases: ["potatoes"] },
  carrot: { en: "Carrot", hi: "गाजर", pa: "ਗਾਜਰ", aliases: ["carrots"] },
  radish: { en: "Radish", hi: "मूली", pa: "ਮੂਲੀ", aliases: ["radishes", "mooli", "muli"] },
  cauliflower: { en: "Cauliflower", hi: "फूलगोभी", pa: "ਫੁੱਲ ਗੋਭੀ", aliases: ["cauliflowers", "gobhi", "gobi"], native: ["फूल गोभी", "ਫੁੱਲਗੋਭੀ", "ਫੁਲ ਗੋਭੀ"] },
  cabbage: { en: "Cabbage", hi: "पत्तागोभी", pa: "ਬੰਦ ਗੋਭੀ", aliases: ["cabbages"], native: ["पत्ता गोभी", "बंद गोभी", "बंदगोभी", "ਪੱਤਾ ਗੋਭੀ", "ਬੰਦਗੋਭੀ"] },
  spinach: { en: "Spinach", hi: "पालक", pa: "ਪਾਲਕ", aliases: ["palak"] },
  peas: { en: "Green peas", hi: "मटर", pa: "ਮਟਰ", aliases: ["pea", "green peas", "green pea", "matar"] },
  okra: { en: "Okra", hi: "भिंडी", pa: "ਭਿੰਡੀ", aliases: ["lady finger", "lady fingers", "ladyfinger", "ladies finger", "bhindi"] },
  brinjal: { en: "Brinjal", hi: "बैंगन", pa: "ਬੈਂਗਣ", aliases: ["brinjals", "eggplant", "eggplants", "aubergine", "baingan"], native: ["ਬੈਂਗਨ"] },
  capsicum: { en: "Capsicum", hi: "शिमला मिर्च", pa: "ਸ਼ਿਮਲਾ ਮਿਰਚ", aliases: ["capsicums", "bell pepper", "bell peppers", "shimla mirch"] },
  chilli: { en: "Green chilli", hi: "हरी मिर्च", pa: "ਹਰੀ ਮਿਰਚ", aliases: ["chillies", "chili", "chilies", "green chilli", "green chillies", "green chili", "chilly", "mirch"], native: ["मिर्च", "ਮਿਰਚ", "ਮਿਰਚਾਂ"] },
  cucumber: { en: "Cucumber", hi: "खीरा", pa: "ਖੀਰਾ", aliases: ["cucumbers"] },
  bottle_gourd: { en: "Bottle gourd", hi: "लौकी", pa: "ਘੀਆ", aliases: ["bottle gourds", "lauki", "ghiya", "gourd"], native: ["घीया", "ਲੌਕੀ"] },
  bitter_gourd: { en: "Bitter gourd", hi: "करेला", pa: "ਕਰੇਲਾ", aliases: ["bitter gourds", "karela"], native: ["करेले", "ਕਰੇਲੇ"] },
  pumpkin: { en: "Pumpkin", hi: "कद्दू", pa: "ਕੱਦੂ", aliases: ["pumpkins", "kaddu"], native: ["सीताफल", "ਕੱਦੂ"] },
  garlic: { en: "Garlic", hi: "लहसुन", pa: "ਲਸਣ", aliases: ["lehsun"] },
  ginger: { en: "Ginger", hi: "अदरक", pa: "ਅਦਰਕ", aliases: ["adrak"] },
  coriander: { en: "Coriander", hi: "धनिया", pa: "ਧਨੀਆ", aliases: ["cilantro", "dhaniya", "coriander leaves"] },
  fenugreek: { en: "Fenugreek", hi: "मेथी", pa: "ਮੇਥੀ", aliases: ["methi", "fenugreek leaves"] },
  mint: { en: "Mint", hi: "पुदीना", pa: "ਪੁਦੀਨਾ", aliases: ["pudina", "mint leaves"] },
  beans: { en: "Beans", hi: "फलियाँ", pa: "ਫਲੀਆਂ", aliases: ["bean", "french beans", "green beans"], native: ["बीन्स", "फली", "ਬੀਨਜ਼"] },
  beetroot: { en: "Beetroot", hi: "चुकंदर", pa: "ਚੁਕੰਦਰ", aliases: ["beetroots", "beet", "beets"] },
  sweet_potato: { en: "Sweet potato", hi: "शकरकंद", pa: "ਸ਼ਕਰਕੰਦੀ", aliases: ["sweet potatoes"], native: ["शकरकंदी"] },
  turnip: { en: "Turnip", hi: "शलगम", pa: "ਸ਼ਲਗਮ", aliases: ["turnips"], native: ["ਗੋਂਗਲੂ"] },
  mustard_greens: { en: "Mustard greens", hi: "सरसों का साग", pa: "ਸਰ੍ਹੋਂ ਦਾ ਸਾਗ", aliases: ["sarson ka saag", "saag", "mustard leaves"], native: ["सरसों साग", "ਸਰੋਂ ਦਾ ਸਾਗ"] },
  maize: { en: "Maize", hi: "मक्का", pa: "ਮੱਕੀ", aliases: ["corn", "sweet corn", "makki"], native: ["मक्की"] },
  // Fruits
  kinnow: { en: "Kinnow", hi: "किन्नू", pa: "ਕਿੰਨੂ", aliases: ["kinnows", "kinu", "mandarin", "mandarins"] },
  orange: { en: "Orange", hi: "संतरा", pa: "ਸੰਤਰਾ", aliases: ["oranges"] },
  mango: { en: "Mango", hi: "आम", pa: "ਅੰਬ", aliases: ["mangoes", "mangos"], ambiguousNative: true },
  banana: { en: "Banana", hi: "केला", pa: "ਕੇਲਾ", aliases: ["bananas"], native: ["केले", "ਕੇਲੇ"] },
  guava: { en: "Guava", hi: "अमरूद", pa: "ਅਮਰੂਦ", aliases: ["guavas"] },
  apple: { en: "Apple", hi: "सेब", pa: "ਸੇਬ", aliases: ["apples"] },
  watermelon: { en: "Watermelon", hi: "तरबूज़", pa: "ਤਰਬੂਜ਼", aliases: ["watermelons"], native: ["तरबूज", "ਤਰਬੂਜ", "ਹਦਵਾਣਾ"] },
  muskmelon: { en: "Muskmelon", hi: "खरबूज़ा", pa: "ਖਰਬੂਜ਼ਾ", aliases: ["muskmelons", "melon", "melons", "cantaloupe"], native: ["खरबूजा", "ਖਰਬੂਜਾ"] },
  lemon: { en: "Lemon", hi: "नींबू", pa: "ਨਿੰਬੂ", aliases: ["lemons", "lime", "limes"], native: ["निम्बू", "नीबू"] },
  pomegranate: { en: "Pomegranate", hi: "अनार", pa: "ਅਨਾਰ", aliases: ["pomegranates"] },
  grapes: { en: "Grapes", hi: "अंगूर", pa: "ਅੰਗੂਰ", aliases: ["grape"] },
  papaya: { en: "Papaya", hi: "पपीता", pa: "ਪਪੀਤਾ", aliases: ["papayas"] },
  pear: { en: "Pear", hi: "नाशपाती", pa: "ਨਾਸ਼ਪਾਤੀ", aliases: ["pears"] },
  // Grains, pulses and other field crops
  wheat: { en: "Wheat", hi: "गेहूँ", pa: "ਕਣਕ", aliases: ["gehun"], native: ["गेहूं", "गेहू"] },
  paddy: { en: "Paddy", hi: "धान", pa: "ਝੋਨਾ", aliases: ["rice", "basmati", "basmati rice"], native: ["चावल", "बासमती", "ਚੌਲ", "ਬਾਸਮਤੀ"] },
  bajra: { en: "Pearl millet", hi: "बाजरा", pa: "ਬਾਜਰਾ", aliases: ["pearl millet", "millet", "millets"] },
  chickpea: { en: "Chickpea", hi: "चना", pa: "ਛੋਲੇ", aliases: ["chickpeas", "gram", "chana", "bengal gram"], native: ["चने", "ਚਣੇ", "ਛੋਲਿਆਂ"] },
  moong: { en: "Moong dal", hi: "मूंग", pa: "ਮੂੰਗੀ", aliases: ["moong dal", "green gram", "mung", "mung beans"], native: ["मूँग", "ਮੂੰਗ"] },
  mustard: { en: "Mustard seed", hi: "सरसों", pa: "ਸਰ੍ਹੋਂ", aliases: ["mustard seed", "mustard seeds", "sarson"], native: ["ਸਰੋਂ"] },
  sugarcane: { en: "Sugarcane", hi: "गन्ना", pa: "ਗੰਨਾ", aliases: ["sugar cane"], native: ["गन्ने", "ਗੰਨੇ"] },
  cotton: { en: "Cotton", hi: "कपास", pa: "ਨਰਮਾ", aliases: ["narma"], native: ["नरमा", "ਕਪਾਹ"] },
} satisfies Record<string, CropDef>;

export type Crop = keyof typeof CATALOGUE;
export const CROPS = Object.keys(CATALOGUE) as Crop[];

const def = (c: Crop): CropDef => CATALOGUE[c];

export const isCrop = (s: string): s is Crop => Object.hasOwn(CATALOGUE, s);

/** The crop's name read aloud and shown to the farmer. */
export const cropInLang = (crop: Crop, lang: Lang): string => def(crop)[lang];

/** The crop's name for the buyer screens. */
export const cropEn = (crop: Crop): string => def(crop).en;

/** Every English word that names a crop, longest first (so "sweet potato" wins over "potato"). */
const ENGLISH: [string, Crop][] = CROPS.flatMap((c): [string, Crop][] => {
  const words = [c.replace(/_/g, " "), def(c).en.toLowerCase(), ...(def(c).aliases ?? [])];
  return [...new Set(words)].map((w) => [w, c]);
}).sort((a, b) => b[0].length - a[0].length);

/** English crop words, for telling a crop apart from a place name. */
export const CROP_WORDS = new Set(ENGLISH.flatMap(([w]) => w.split(" ")));

/** "Carrots", "green chillies", "Lady finger" → the crop, or null if it isn't one we know. */
export function normaliseCrop(raw: string): Crop | null {
  const s = raw.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (isCrop(s.replace(/ /g, "_"))) return s.replace(/ /g, "_") as Crop;
  return ENGLISH.find(([w]) => w === s)?.[1] ?? null;
}

/** First crop named anywhere in an English sentence. */
export function findCropInEnglish(text: string): Crop | undefined {
  const s = ` ${text.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  let best: { at: number; crop: Crop } | undefined;
  for (const [w, crop] of ENGLISH) {
    const at = s.indexOf(` ${w} `);
    if (at >= 0 && (!best || at < best.at)) best = { at, crop };
  }
  return best?.crop;
}

/** Native spellings, longest first ("शिमला मिर्च" must win over "मिर्च"). */
const NATIVE: [string, Crop][] = CROPS.flatMap((c): [string, Crop][] => {
  const d = def(c);
  if (d.ambiguousNative) return [];
  return [...new Set([d.hi, d.pa, ...(d.native ?? [])])].map((w) => [w, c]);
}).sort((a, b) => b[0].length - a[0].length);

/**
 * The crop the farmer named in their own words, if exactly one is named.
 * Translation sometimes turns a crop into something else; the original word is the truth.
 * Whole words only: मटर (peas) must not match inside टमाटर (tomato).
 */
export function findCropInNative(transcript: string): Crop | null {
  let s = ` ${transcript.replace(/[।,.!?;:"'()\-–—]/g, " ").replace(/\s+/g, " ")} `;
  const found = new Set<Crop>();
  for (const [w, crop] of NATIVE) {
    if (s.includes(` ${w} `)) {
      found.add(crop);
      s = s.replaceAll(` ${w} `, "  "); // consumed, so "मिर्च" isn't found again inside "शिमला मिर्च"
    }
  }
  return found.size === 1 ? [...found][0] : null;
}
