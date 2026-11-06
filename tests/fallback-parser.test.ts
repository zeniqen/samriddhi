import { expect, test } from "vitest";
import { parseFallback } from "@/lib/fallback-parser";

test.each([
  [
    "100 kg tomatoes, 16 rupees per kg, village Dakha, pickup day after tomorrow",
    { crop: "tomato", quantityKg: 100, askPricePerKg: 16, village: "Dakha", pickupDate: "2026-11-08" },
  ],
  ["one hundred kilos of tomato at sixteen rupees a kilo", { crop: "tomato", quantityKg: 100, askPricePerKg: 16 }],
  ["two quintals of tomatoes", { crop: "tomato", quantityKg: 200 }],
  ["price 1600 per quintal", { askPricePerKg: 16 }],
  ["fifty kg", { quantityKg: 50 }],
  ["pick it up tomorrow", { pickupDate: "2026-11-07" }],
  ["I am from Sahnewal", { village: "Sahnewal" }],
  ["onions 300 kg", { crop: "onion", quantityKg: 300 }],
  ["twelve and a half rupees per kg", { askPricePerKg: 12.5 }],
  ["hello how are you", {}],
  ["Rs. 15/kg, 250 kilograms", { quantityKg: 250, askPricePerKg: 15 }],
  ["one hundred and fifty kg", { quantityKg: 150 }],
])("%s", (s, expected) => {
  expect(parseFallback(s, "2026-11-06")).toEqual(expected);
});
