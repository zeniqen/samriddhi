// Throwaway model comparison. Usage:
export {};
//   npx tsx --env-file=.env.local scripts/spike-ollama.ts gpt-oss:120b other-model ...
const KEY = process.env.OLLAMA_API_KEY;
const BASE = process.env.OLLAMA_BASE_URL ?? "https://ollama.com";
if (!KEY) throw new Error("Need OLLAMA_API_KEY");

const models = process.argv.slice(2);
if (models.length === 0) {
  const tags = await (await fetch(`${BASE}/api/tags`)).json();
  console.log("Pass model names. Available:", tags.models?.map((m: { name: string }) => m.name));
  process.exit(0);
}

const SENTENCES = [
  "100 kg tomatoes, 16 rupees per kg, village Dakha, pickup day after tomorrow",
  "one hundred kilos of tomato at sixteen rupees a kilo",
  "price 1600 per quintal",
  "pick it up tomorrow",
  "I am from Sahnewal and I have two quintals",
];

const schema = {
  type: "object",
  properties: {
    updates: {
      type: "object",
      properties: {
        crop: { type: "string", enum: ["tomato", "onion", "potato"] },
        quantityKg: { type: "number" },
        askPricePerKg: { type: "number" },
        village: { type: "string" },
        pickupDate: { type: "string" },
      },
    },
    replyEnglish: { type: "string" },
    intent: { type: "string", enum: ["fill", "question", "confirm", "correct"] },
  },
  required: ["updates", "replyEnglish", "intent"],
};

const system =
  "You help a farmer list produce. Today is 2026-11-06. Extract fields from the farmer's English message. " +
  "Prices per kg (convert per-quintal by dividing by 100; 1 quintal = 100 kg). Dates as YYYY-MM-DD. " +
  "Reply in English, ask for at most one missing field. Output only JSON.";

for (const model of models) {
  let valid = 0;
  const times: number[] = [];
  for (const s of SENTENCES) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: schema,
        messages: [{ role: "system", content: system }, { role: "user", content: s }],
      }),
    });
    times.push(Date.now() - t0);
    const body = await res.json();
    try {
      const parsed = JSON.parse(body.message.content);
      valid++;
      console.log(model, "|", s, "→", JSON.stringify(parsed.updates));
    } catch {
      console.log(model, "|", s, "→ INVALID", res.status, JSON.stringify(body).slice(0, 200));
    }
  }
  times.sort((a, b) => a - b);
  console.log(`== ${model}: ${valid}/${SENTENCES.length} valid, median ${times[2]} ms`);
}
