import { describe, expect, test } from "vitest";
import { allowedNumbers, checkReply, extractNumbers, maskNumbers, unmaskNumbers } from "@/lib/factcheck";

const allowed = allowedNumbers({ quantityKg: 100, pricePerKg: 16, total: 1600, pickupDate: "2026-11-07" });

describe("extractNumbers", () => {
  test("handles commas, decimals and ₹", () => {
    expect(extractNumbers("₹1,600 for 12.5 kg at ₹16/kg")).toEqual([1600, 12.5, 16]);
  });
});

describe("checkReply", () => {
  test("passes correct reply with derived total and date", () => {
    expect(checkReply("Hotel Sagar bought 100 kg at ₹16/kg. You get ₹1,600. Pickup 7 November 2026.", allowed)).toBe(true);
  });
  test("passes ISO-style date", () => {
    expect(checkReply("Pickup on 2026-11-07", allowed)).toBe(true);
  });
  test("passes reply with no numbers", () => {
    expect(checkReply("Thank you!", allowed)).toBe(true);
  });
  test("fails on wrong price", () => {
    expect(checkReply("100 kg at ₹18 per kg", allowed)).toBe(false);
  });
  test("fails on wrong quantity", () => {
    expect(checkReply("You sold 1000 kg", allowed)).toBe(false);
  });
});

describe("masking", () => {
  test("mask round-trip is lossless", () => {
    const s = "You get ₹1,600 for 100 kg on 7 Nov";
    const m = maskNumbers(s);
    expect(m.masked.replace(/\{\{N\d+\}\}/g, "")).not.toMatch(/\d/);
    expect(unmaskNumbers(m.masked, m.values)).toBe(s);
  });
  test("unmask survives translator reordering placeholders", () => {
    expect(unmaskNumbers("{{N2}} किलो, ₹{{N1}}", ["16", "100"])).toBe("100 किलो, ₹16");
  });
  test("unmask tolerates spaces the translator inserts inside braces", () => {
    expect(unmaskNumbers("{{ N1 }} किलो", ["100"])).toBe("100 किलो");
  });
});
