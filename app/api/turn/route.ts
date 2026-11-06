import { isComplete, newConversation, runTurn, TAP_TO_FILL_AFTER } from "@/lib/conversation";
import { todayIST } from "@/lib/dates";
import { allowedNumbers, mentionsAll } from "@/lib/factcheck";
import { llmTurn } from "@/lib/llm";
import { localize } from "@/lib/localize";
import { speechToEnglish, translateFromEnglish, translateToEnglish } from "@/lib/sarvam";
import { getStore } from "@/lib/store";
import { findVillageInNative } from "@/lib/validate";
import { cropName, formatDate, t } from "@/lib/templates";
import type { ConversationState, Lang, Listing } from "@/lib/types";

function readBackVars(s: ConversationState) {
  const f = s.fields as Required<ConversationState["fields"]>;
  return {
    kg: f.quantityKg,
    crop: cropName(f.crop, s.lang),
    price: f.askPricePerKg,
    village: f.village,
    date: formatDate(f.pickupDate, s.lang),
  };
}

async function createListing(s: ConversationState): Promise<Listing> {
  const f = s.fields as Required<ConversationState["fields"]>;
  const listing: Listing = {
    ...f,
    id: `l_${Date.now().toString(36)}`,
    farmerId: s.farmerId,
    remainingKg: f.quantityKg,
    status: "live",
    transcriptOriginal: s.transcriptOriginal,
    transcriptEnglish: s.transcriptEnglish,
    createdAt: new Date().toISOString(),
  };
  await getStore().saveListing(listing);
  return listing;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const sessionId = String(form.get("sessionId") ?? "");
  const lang: Lang = form.get("lang") === "pa" ? "pa" : "hi";
  const farmerId = String(form.get("farmerId") ?? "f1");
  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });

  const store = getStore();
  const today = todayIST();
  let state = (await store.getConversation(sessionId)) ?? newConversation(sessionId, lang, farmerId);
  state = { ...state, lang };

  const respond = async (replyLocal: string, replyEnglish: string, extra: { listingId?: string } = {}) => {
    await store.saveConversation(extra.listingId ? newConversation(sessionId, lang, farmerId) : state);
    return Response.json({
      fields: state.fields,
      replyLocal,
      replyEnglish,
      complete: isComplete(state),
      tapToFill: state.turns >= TAP_TO_FILL_AFTER && !isComplete(state),
      ...extra,
    });
  };

  // ✅ tap
  if (form.get("confirm") === "true") {
    if (!isComplete(state)) return respond(t("askAgain", lang), "");
    const listing = await createListing(state);
    return respond(t("listingLive", lang), "", { listingId: listing.id });
  }

  // Speech or typed text → English
  let english = "";
  let original = "";
  try {
    const audio = form.get("audio");
    const text = form.get("text");
    if (audio instanceof Blob && audio.size > 0) {
      ({ english, original } = await speechToEnglish(audio, lang));
    } else if (typeof text === "string" && text.trim()) {
      original = text.trim();
      english = await translateToEnglish(original, lang);
    }
  } catch (e) {
    console.error("[turn] speech/translate failed", e);
  }
  if (!english.trim()) return respond(t("askAgain", lang), "");

  // Read-back already heard? Must be decided before this turn adds anything.
  const wasComplete = isComplete(state);

  // Translation can garble village names ("गाँव दाखा" → "Show it to the village"); the original keeps them.
  const nativeVillage = findVillageInNative(original);
  if (nativeVillage) state = { ...state, fields: { ...state.fields, village: nativeVillage } };

  const r = await runTurn(state, english, { llm: llmTurn, today });
  state = {
    ...r.state,
    fields: nativeVillage ? { ...r.state.fields, village: nativeVillage } : r.state.fields,
    transcriptOriginal: [state.transcriptOriginal, original].filter(Boolean).join(" | "),
  };

  // Spoken "yes" after the read-back
  if (wasComplete && r.intent === "confirm" && r.complete) {
    const listing = await createListing(state);
    return respond(t("listingLive", lang), r.replyEnglish, { listingId: listing.id });
  }

  if (r.complete) {
    const f = state.fields as Required<ConversationState["fields"]>;
    const allowed = allowedNumbers({ quantityKg: f.quantityKg, pricePerKg: f.askPricePerKg, pickupDate: f.pickupDate });
    // A read-back must state kg and price; otherwise use the fixed sentence.
    const reply = mentionsAll(r.replyEnglish, [f.quantityKg, f.askPricePerKg]) ? r.replyEnglish : "";
    const loc = await localize(
      { replyEnglish: reply, lang, allowed, fallback: { key: "readBack", vars: readBackVars(state) } },
      { translate: translateFromEnglish },
    );
    return respond(loc.text, reply);
  }

  const loc = await localize(
    { replyEnglish: r.replyEnglish, lang, allowed: null, fallback: { key: r.fallbackKey ?? "askAgain" } },
    { translate: translateFromEnglish },
  );
  return respond(loc.text, r.replyEnglish);
}
