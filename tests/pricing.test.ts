import { expect, test } from "vitest";
import { computeSplit, orderTotals } from "@/lib/pricing";

test("spec example: ask 16 → buyer 24.5", () => {
  expect(computeSplit(16)).toEqual({
    farmerPerKg: 16,
    partnerPerKg: 4,
    bufferPerKg: 3,
    platformPerKg: 1.5,
    buyerPerKg: 24.5,
  });
});

test("parts always sum to buyer price", () => {
  for (const ask of [1, 8, 12.5, 37, 200]) {
    const s = computeSplit(ask);
    expect(s.farmerPerKg + s.partnerPerKg + s.bufferPerKg + s.platformPerKg).toBeCloseTo(s.buyerPerKg);
  }
});

test("platform fee rounds to nearest 0.5", () => {
  // base 8+4+3 = 15 → 6% = 0.9 → 1.0
  expect(computeSplit(8).platformPerKg).toBe(1);
});

test("totals", () => {
  expect(orderTotals(computeSplit(16), 100)).toEqual({ buyerTotal: 2450, farmerTotal: 1600 });
});
