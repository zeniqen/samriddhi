// The only code that talks to Ollama Cloud. Works in English only.
import type { ConversationState, Intent, ListingFields, LlmTurn } from "./types";

export class LlmError extends Error {}

const TIMEOUT_MS = 8_000;
const INTENTS: Intent[] = ["fill", "question", "confirm", "correct"];

const TURN_SCHEMA = {
  type: "object",
  properties: {
    updates: {
      type: "object",
      properties: {
        crop: { type: "string" }, // any crop; checked against the catalogue after the turn
        quantityKg: { type: "number" },
        askPricePerKg: { type: "number" },
        village: { type: "string" },
        pickupDate: { type: "string" },
      },
    },
    replyEnglish: { type: "string" },
    intent: { type: "string", enum: INTENTS },
  },
  required: ["updates", "replyEnglish", "intent"],
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chat(messages: ChatMessage[], format?: object): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL ?? "https://ollama.com";
  let res: Response;
  try {
    res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL, stream: false, messages, ...(format && { format }) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new LlmError(`Ollama request failed: ${(e as Error).message}`);
  }
  if (!res.ok) throw new LlmError(`Ollama HTTP ${res.status}`);
  const body = await res.json().catch(() => null);
  const content = body?.message?.content;
  if (typeof content !== "string") throw new LlmError("Ollama returned no message content");
  return content;
}

export function isLlmTurn(x: unknown): x is LlmTurn {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.updates === "object" &&
    o.updates !== null &&
    typeof o.replyEnglish === "string" &&
    INTENTS.includes(o.intent as Intent)
  );
}

export function buildSystemPrompt(today: string, fields: ListingFields): string {
  return [
    "You help an Indian farmer who cannot read list produce for sale, by voice. Your reply is translated and read aloud.",
    `Today is ${today}. Fields already collected: ${JSON.stringify(fields)}. Never ask again for a collected field.`,
    "Fields: crop (the crop's common English name, singular, e.g. tomato, carrot, radish, cauliflower, kinnow, wheat), quantityKg, askPricePerKg (rupees per kg), village, pickupDate (YYYY-MM-DD).",
    "Convert units: 1 quintal = 100 kg; a price per quintal is divided by 100. Resolve 'tomorrow'/'day after tomorrow' from today.",
    "There is only ONE listing. The farmer may repeat a collected field; that is fine: keep going and put every field they said in updates.",
    "Put only what the farmer actually said in updates. Never invent or guess a number, place or date.",
    "replyEnglish: one short, warm, simple sentence in English. Ask for at most ONE missing field. No emojis.",
    "Write numbers as digits. Say dates as day and month name (e.g. 8 November), never as 2026-11-08.",
    "When all five fields are known, replyEnglish must read them all back, state the total (quantityKg × askPricePerKg rupees), and ask 'Is this correct?'.",
    "intent: 'confirm' only if the farmer says yes after a full read-back; 'correct' if they change a field; 'question' if they ask something; otherwise 'fill'.",
    'Output ONLY this JSON shape, no markdown: {"updates":{"crop":"tomato","quantityKg":100},"replyEnglish":"...","intent":"fill"}',
    "Use exactly these keys; leave out any field the farmer did not mention.",
  ].join("\n");
}

export async function llmTurn(input: {
  englishText: string;
  fields: ListingFields;
  today: string;
  history: ConversationState["history"];
}): Promise<LlmTurn> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(input.today, input.fields) },
    ...input.history.map((h): ChatMessage => ({ role: h.role === "farmer" ? "user" : "assistant", content: h.text })),
    { role: "user", content: input.englishText },
  ];
  const content = await chat(messages, TURN_SCHEMA);
  let parsed: unknown;
  try {
    // Some cloud models ignore `format` and wrap the JSON in a ```json fence or extra text.
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    parsed = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content);
  } catch {
    throw new LlmError("Ollama returned invalid JSON");
  }
  if (!isLlmTurn(parsed)) throw new LlmError("Ollama JSON does not match LlmTurn");
  return parsed;
}
