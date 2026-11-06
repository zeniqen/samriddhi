import { afterEach, describe, expect, test, vi } from "vitest";
import { isLlmTurn, LlmError, llmTurn } from "@/lib/llm";

describe("isLlmTurn", () => {
  test("accepts a valid turn", () => {
    expect(isLlmTurn({ updates: { quantityKg: 100 }, replyEnglish: "ok", intent: "fill" })).toBe(true);
  });
  test.each([
    [{ updates: {}, replyEnglish: "ok" }],
    [{ updates: {}, replyEnglish: "ok", intent: "buy" }],
    [{ updates: null, replyEnglish: "ok", intent: "fill" }],
    [{ updates: {}, replyEnglish: 5, intent: "fill" }],
    ["not an object"],
  ])("rejects %j", (x) => {
    expect(isLlmTurn(x)).toBe(false);
  });
});

describe("llmTurn", () => {
  afterEach(() => vi.unstubAllGlobals());
  const input = { englishText: "100 kg tomatoes", fields: {}, today: "2026-11-06", history: [] };

  test("rejects with LlmError when the model returns non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: { content: "not json" } })));
    await expect(llmTurn(input)).rejects.toBeInstanceOf(LlmError);
  });

  test("rejects with LlmError on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(llmTurn(input)).rejects.toBeInstanceOf(LlmError);
  });

  test("accepts JSON wrapped in a markdown code fence", async () => {
    const turn = { updates: { quantityKg: 200 }, replyEnglish: "Price?", intent: "fill" };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: { content: "```json\n" + JSON.stringify(turn) + "\n```" } })));
    await expect(llmTurn(input)).resolves.toEqual(turn);
  });

  test("returns parsed turn on valid JSON", async () => {
    const turn = { updates: { crop: "tomato", quantityKg: 100 }, replyEnglish: "What price per kg?", intent: "fill" };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: { content: JSON.stringify(turn) } })));
    await expect(llmTurn(input)).resolves.toEqual(turn);
  });
});
