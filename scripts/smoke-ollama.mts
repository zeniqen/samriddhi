// Compare Ollama models through the app's real llmTurn (same prompt, schema, 8 s timeout).
//   npx tsx --env-file=.env.local scripts/smoke-ollama.mts model-a model-b ...
import { llmTurn } from "../lib/llm";
import { validateUpdates } from "../lib/validate";
import type { ListingFields } from "../lib/types";

const TODAY = "2026-11-06";
const CASES: { text: string; fields: ListingFields; expect: ListingFields }[] = [
  {
    text: "One hundred kilos of tomatoes, sixteen rupees per kilo. Village Dakha. Pickup the day after tomorrow.",
    fields: {},
    expect: { crop: "tomato", quantityKg: 100, askPricePerKg: 16, village: "Dakha", pickupDate: "2026-11-08" },
  },
  { text: "two quintals of onions", fields: {}, expect: { crop: "onion", quantityKg: 200 } },
  { text: "price 1600 per quintal", fields: { crop: "tomato", quantityKg: 100 }, expect: { askPricePerKg: 16 } },
  { text: "pick it up tomorrow", fields: { crop: "tomato", quantityKg: 100, askPricePerKg: 16, village: "Dakha" }, expect: { pickupDate: "2026-11-07" } },
  { text: "I have tomatoes", fields: {}, expect: { crop: "tomato" } },
];

for (const model of process.argv.slice(2)) {
  process.env.OLLAMA_MODEL = model;
  let correct = 0;
  const times: number[] = [];
  const notes: string[] = [];
  for (const c of CASES) {
    const t0 = Date.now();
    try {
      const turn = await llmTurn({ englishText: c.text, fields: c.fields, today: TODAY, history: [] });
      times.push(Date.now() - t0);
      const got = validateUpdates(turn.updates, TODAY).accepted;
      const ok = Object.entries(c.expect).every(([k, v]) => got[k as keyof ListingFields] === v);
      if (ok) correct++;
      else notes.push(`✗ "${c.text}" → ${JSON.stringify(got)}`);
      if (c === CASES[0]) notes.push(`  reply: ${turn.replyEnglish}`);
    } catch (e) {
      times.push(Date.now() - t0);
      notes.push(`✗ "${c.text}" → ${(e as Error).message}`);
    }
  }
  times.sort((a, b) => a - b);
  console.log(`== ${model}: ${correct}/${CASES.length} correct, median ${times[2]} ms, max ${times.at(-1)} ms`);
  notes.forEach((n) => console.log("   " + n.slice(0, 220)));
}
