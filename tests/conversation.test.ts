import { describe, expect, test } from "vitest";
import { localize } from "@/lib/localize";
import { newConversation, runTurn, shouldCreateListing } from "@/lib/conversation";
import { LlmError } from "@/lib/llm";
import { t } from "@/lib/templates";
import type { LlmTurn } from "@/lib/types";

const fakeTranslate = async (s: string) => `HI:${s}`;

describe("localize", () => {
  test("restores numbers and passes fact-check", async () => {
    const r = await localize(
      { replyEnglish: "100 kg at ₹16", lang: "hi", allowed: [100, 16], fallback: { key: "readBack" } },
      { translate: fakeTranslate },
    );
    expect(r).toEqual({ text: "HI:100 kg at ₹16", usedTemplate: false });
  });

  test("numbers never reach the translator", async () => {
    let seen = "";
    await localize(
      { replyEnglish: "100 kg at ₹16", lang: "hi", allowed: [100, 16], fallback: { key: "readBack" } },
      { translate: async (s) => ((seen = s), s) },
    );
    expect(seen.replace(/\{\{N\d+\}\}/g, "")).not.toMatch(/\d/);
  });

  test("falls back to template on wrong number", async () => {
    const r = await localize(
      { replyEnglish: "100 kg at ₹18", lang: "hi", allowed: [100, 16], fallback: { key: "askAgain" } },
      { translate: fakeTranslate },
    );
    expect(r).toEqual({ text: t("askAgain", "hi"), usedTemplate: true });
  });

  test("skips number check when allowed is null", async () => {
    const r = await localize(
      { replyEnglish: "Is it 2 or 3 days?", lang: "hi", allowed: null, fallback: { key: "askAgain" } },
      { translate: fakeTranslate },
    );
    expect(r.usedTemplate).toBe(false);
  });

  test("falls back when translate throws", async () => {
    const r = await localize(
      { replyEnglish: "How many kilos?", lang: "pa", allowed: null, fallback: { key: "askQuantity" } },
      { translate: async () => { throw new Error("down"); } },
    );
    expect(r).toEqual({ text: t("askQuantity", "pa"), usedTemplate: true });
  });
});

describe("runTurn", () => {
  test("merges only valid updates and counts turns", async () => {
    const llm = async (): Promise<LlmTurn> => ({ updates: { quantityKg: 100, askPricePerKg: 900 }, replyEnglish: "Price?", intent: "fill" });
    const r = await runTurn(newConversation("s", "hi", "f1"), "100 kg", { llm, today: "2026-11-06" });
    expect(r.state.fields).toEqual({ quantityKg: 100 });
    expect(r.state.turns).toBe(1);
    expect(r.usedFallback).toBe(false);
    expect(r.state.history.at(-1)).toEqual({ role: "assistant", text: "Price?" });
  });

  test("uses fallback parser when llm throws", async () => {
    const llm = async (): Promise<LlmTurn> => {
      throw new LlmError("timeout");
    };
    const r = await runTurn(newConversation("s", "hi", "f1"), "100 kg tomatoes", { llm, today: "2026-11-06" });
    expect(r.usedFallback).toBe(true);
    expect(r.state.fields).toEqual({ crop: "tomato", quantityKg: 100 });
    expect(r.fallbackKey).toBe("askPrice");
  });

  test("complete when all five fields present; keeps last 6 history entries", async () => {
    let state = newConversation("s", "hi", "f1");
    const all = { crop: "tomato" as const, quantityKg: 100, askPricePerKg: 16, village: "Dakha", pickupDate: "2026-11-08" };
    for (let i = 0; i < 4; i++) {
      state = (await runTurn(state, "hi", { llm: async () => ({ updates: {}, replyEnglish: "?", intent: "question" }), today: "2026-11-06" })).state;
    }
    const r = await runTurn(state, "all", { llm: async () => ({ updates: all, replyEnglish: "ok", intent: "fill" }), today: "2026-11-06" });
    expect(r.complete).toBe(true);
    expect(r.state.history).toHaveLength(6);
  });

  test("correction overwrites an earlier field", async () => {
    let state = newConversation("s", "hi", "f1");
    state = (await runTurn(state, "100 kg", { llm: async () => ({ updates: { quantityKg: 100 }, replyEnglish: "ok", intent: "fill" }), today: "2026-11-06" })).state;
    const r = await runTurn(state, "no, 120 kg", { llm: async () => ({ updates: { quantityKg: 120 }, replyEnglish: "ok", intent: "correct" }), today: "2026-11-06" });
    expect(r.state.fields.quantityKg).toBe(120);
    expect(r.intent).toBe("correct");
  });
});

describe("review fixes", () => {
  test("localize rejects digits the translator invented", async () => {
    const r = await localize(
      { replyEnglish: "100 kg at ₹16", lang: "hi", allowed: [100, 16], fallback: { key: "askAgain" } },
      { translate: async (s) => `${s} (5 दिन)` },
    );
    expect(r.usedTemplate).toBe(true);
  });

  test("localize protects spelled-out numbers from the translator", async () => {
    let seen = "";
    const r = await localize(
      { replyEnglish: "One hundred kg at ₹16", lang: "hi", allowed: [100, 16], fallback: { key: "askAgain" } },
      { translate: async (s) => ((seen = s), s) },
    );
    expect(seen).not.toMatch(/hundred/i);
    expect(r.text).toContain("100");
  });

  const full = { crop: "tomato" as const, quantityKg: 100, askPricePerKg: 16, village: "Dakha", pickupDate: "2026-11-08" };
  test("spoken yes creates a listing only if nothing changed this turn", () => {
    expect(shouldCreateListing({ wasComplete: true, intent: "confirm", before: full, after: full })).toBe(true);
    expect(shouldCreateListing({ wasComplete: true, intent: "confirm", before: full, after: { ...full, quantityKg: 200 } })).toBe(false);
    expect(shouldCreateListing({ wasComplete: false, intent: "confirm", before: {}, after: full })).toBe(false);
    expect(shouldCreateListing({ wasComplete: true, intent: "fill", before: full, after: full })).toBe(false);
  });
});

test("localize keeps the village's native spelling (translator said ढाका)", async () => {
  const r = await localize(
    { replyEnglish: "100 kg from Dakha", lang: "hi", allowed: [100], fallback: { key: "askAgain" }, names: { Dakha: "दाखा" } },
    { translate: async (s) => s.replace("Dakha", "ढाका") },
  );
  expect(r.text).toContain("दाखा");
  expect(r.text).not.toContain("ढाका");
});
