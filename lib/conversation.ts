// One step of the farmer conversation: LLM (or fallback parser) → validated fields.
import { parseFallback } from "./fallback-parser";
import { nextQuestionKey, type TemplateKey } from "./templates";
import { validateUpdates } from "./validate";
import type { ConversationState, Intent, Lang, ListingFields, LlmTurn } from "./types";
import type { llmTurn } from "./llm";

const HISTORY_LIMIT = 6;
export const TAP_TO_FILL_AFTER = 6;

export function newConversation(sessionId: string, lang: Lang, farmerId: string): ConversationState {
  return { sessionId, lang, farmerId, fields: {}, history: [], turns: 0, transcriptOriginal: "", transcriptEnglish: "" };
}

export const isComplete = (s: ConversationState) => nextQuestionKey(s.fields) === null;

export async function runTurn(
  state: ConversationState,
  english: string,
  deps: { llm: typeof llmTurn; today: string },
): Promise<{
  state: ConversationState;
  replyEnglish: string;
  intent: Intent;
  complete: boolean;
  usedFallback: boolean;
  fallbackKey: TemplateKey | null;
}> {
  let turn: LlmTurn;
  let usedFallback = false;
  try {
    turn = await deps.llm({ englishText: english, fields: state.fields, today: deps.today, history: state.history });
  } catch {
    usedFallback = true;
    turn = { updates: parseFallback(english, deps.today), replyEnglish: "", intent: "fill" };
  }

  const { accepted } = validateUpdates(turn.updates, deps.today);
  const fields = { ...state.fields, ...accepted };
  const history = [
    ...state.history,
    { role: "farmer" as const, text: english },
    { role: "assistant" as const, text: turn.replyEnglish || "(fixed question)" },
  ].slice(-HISTORY_LIMIT);

  const next: ConversationState = {
    ...state,
    fields,
    history,
    turns: state.turns + 1,
    transcriptEnglish: [state.transcriptEnglish, english].filter(Boolean).join(" | "),
  };
  const complete = isComplete(next);
  return {
    state: next,
    replyEnglish: turn.replyEnglish,
    intent: turn.intent,
    complete,
    usedFallback,
    fallbackKey: complete ? "readBack" : nextQuestionKey(fields),
  };
}

const FIELD_KEYS = ["crop", "quantityKg", "askPricePerKg", "village", "pickupDate"] as const;

/** A spoken "yes" creates the listing only if the farmer already heard exactly these values. */
export function shouldCreateListing(x: {
  wasComplete: boolean;
  intent: Intent;
  before: ListingFields;
  after: ListingFields;
}): boolean {
  return x.wasComplete && x.intent === "confirm" && FIELD_KEYS.every((k) => x.before[k] === x.after[k]);
}
