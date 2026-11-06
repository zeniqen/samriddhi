// While a listing is being filled, the AI's question must ask for the next missing field.
// The number fact-check can't catch a wrong *question* ("which other crop?" when we need kilos),
// so an off-track reply is dropped and the farmer hears our fixed question instead.
import type { TemplateKey } from "./templates";

/** What a question about each field has to mention. */
const ASKS: Partial<Record<TemplateKey, RegExp>> = {
  askCrop: /\b(crop|crops|produce|vegetables?|fruits?|grains?|sell|selling)\b/,
  askQuantity: /\b(kg|kgs|kilos?|kilograms?|quintals?|quantity|how much|how many)\b/,
  askPrice: /(\b(price|rupees?|rate|cost|per kg|per kilo)\b|₹)/,
  askVillage: /\b(village|where|place|location|pind|gaon)\b/,
  askPickupDate: /\b(pickup|pick up|pick it up|collect|collected|when|date|day)\b/,
};

/** Signs the AI has lost the thread: talking about other listings or things not asked. */
const OFF_TRACK = /\b(another|other|already|scheduled|previous|earlier listing)\b/;

export function replyAsksFor(replyEnglish: string, next: TemplateKey): boolean {
  const s = replyEnglish.toLowerCase();
  if (!s.trim() || OFF_TRACK.test(s)) return false;
  const want = ASKS[next];
  return want ? want.test(s) : true;
}
