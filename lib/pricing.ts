import type { PriceSplit } from "./types";

// Every figure here is an illustrative assumption — the business teammates own them.
export const PARTNER_FEE_PER_KG = 4; // re-roled middleman: pickup + aggregation, disclosed
export const BUFFER_PER_KG = 3; // spoilage / handling
export const PLATFORM_RATE = 0.06; // blueprint range 5–8%

const roundHalf = (n: number) => Math.round(n * 2) / 2;

export function computeSplit(askPricePerKg: number): PriceSplit {
  const base = askPricePerKg + PARTNER_FEE_PER_KG + BUFFER_PER_KG;
  const platformPerKg = roundHalf(base * PLATFORM_RATE);
  return {
    farmerPerKg: askPricePerKg,
    partnerPerKg: PARTNER_FEE_PER_KG,
    bufferPerKg: BUFFER_PER_KG,
    platformPerKg,
    buyerPerKg: base + platformPerKg,
  };
}

export function orderTotals(split: PriceSplit, kg: number): { buyerTotal: number; farmerTotal: number } {
  return { buyerTotal: split.buyerPerKg * kg, farmerTotal: split.farmerPerKg * kg };
}
