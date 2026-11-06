import { demoFields, isComplete, newConversation, runTurn, shouldCreateListing, TAP_TO_FILL_AFTER } from "@/lib/conversation";
import { todayIST } from "@/lib/dates";
import { allowedFromFields, allowedNumbers, mentionsAll } from "@/lib/factcheck";
import { llmTurn } from "@/lib/llm";
import { localize } from "@/lib/localize";
import { speechToEnglish, translateFromEnglish, translateToEnglish } from "@/lib/sarvam";
import { getStore } from "@/lib/store";
import { findVillageInNative } from "@/lib/validate";
import { readBackVars, villageInScript } from "@/lib/readback";
import { findDateInNative } from "@/lib/fallback-parser";
import { t } from "@/lib/templates";
import type { ConversationState, Lang, Listing } from "@/lib/types";

/** English village name → its spelling in the farmer's script, protected during translation. */
function villageNames(village: string, lang: Lang): Record<string, string> {
  const native = villageInScript(village, lang);
  return native === village ? {} : { [village]: native };
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
  const farmer = await store.getFarmer(farmerId);
  if (!farmer) return Response.json({ error: "unknown farmer" }, { status: 400 });
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

  // Demo: pre-fill an empty listing so the screen is never blank in a demo. Read-back is the fixed sentence.
  if (form.get("demo") === "true") {
    if (Object.keys(state.fields).length === 0) state = { ...state, fields: demoFields(farmer, today) };
    return respond(t("readBack", lang, readBackVars(state.fields, lang)), "");
  }

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
  const heardFields = state.fields;

  // Rules beat the LLM where the original words are unambiguous: translation garbles village names
  // ("गाँव दाखा" → "Show it to the village") and the LLM sometimes miscounts परसों (day after tomorrow).
  const overrides: ConversationState["fields"] = {};
  const nativeVillage = findVillageInNative(original);
  const nativeDate = findDateInNative(original, today);
  if (nativeVillage) overrides.village = nativeVillage;
  if (nativeDate) overrides.pickupDate = nativeDate;
  state = { ...state, fields: { ...state.fields, ...overrides } };

  const r = await runTurn(state, english, { llm: llmTurn, today });
  state = {
    ...r.state,
    fields: { ...r.state.fields, ...overrides },
    transcriptOriginal: [state.transcriptOriginal, original].filter(Boolean).join(" | "),
  };
  const complete = isComplete(state);

  // Spoken "yes" after the read-back
  if (shouldCreateListing({ wasComplete, intent: r.intent, before: heardFields, after: state.fields })) {
    const listing = await createListing(state);
    return respond(t("listingLive", lang), r.replyEnglish, { listingId: listing.id });
  }

  if (complete) {
    const f = state.fields as Required<ConversationState["fields"]>;
    const total = f.quantityKg * f.askPricePerKg;
    const allowed = allowedNumbers({ quantityKg: f.quantityKg, pricePerKg: f.askPricePerKg, total, pickupDate: f.pickupDate });
    // A read-back must state kg, price, the total, pickup day and the village; otherwise use the fixed sentence.
    const day = Number(f.pickupDate.slice(8));
    const statesAll =
      mentionsAll(r.replyEnglish, [f.quantityKg, f.askPricePerKg, total, day]) && r.replyEnglish.includes(f.village);
    const reply = statesAll ? r.replyEnglish : "";
    const loc = await localize(
      {
        replyEnglish: reply,
        lang,
        allowed,
        fallback: { key: "readBack", vars: readBackVars(state.fields, lang) },
        names: villageNames(f.village, lang),
      },
      { translate: translateFromEnglish },
    );
    return respond(loc.text, reply);
  }

  const loc = await localize(
    // Questions may only echo numbers the farmer has already given.
    { replyEnglish: r.replyEnglish, lang, allowed: allowedFromFields(state.fields), fallback: { key: r.fallbackKey ?? "askAgain" } },
    { translate: translateFromEnglish },
  );
  return respond(loc.text, r.replyEnglish);
}
