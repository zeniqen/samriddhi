import { expect, test } from "vitest";
import { cropName, formatDate, nextQuestionKey, t, TEMPLATE_KEYS } from "@/lib/templates";

test("readBack fills vars in Hindi", () => {
  expect(t("readBack", "hi", { kg: 100, crop: "टमाटर", price: 16, village: "दाखा", date: "8 नवंबर" })).toContain(
    "100 किलो टमाटर",
  );
});

test("every key exists in both languages", () => {
  for (const k of TEMPLATE_KEYS) {
    expect(t(k, "hi")).toBeTruthy();
    expect(t(k, "pa")).toBeTruthy();
  }
});

test("Punjabi uses Gurmukhi", () => {
  expect(t("askQuantity", "pa")).toMatch(/[਀-੿]/);
});

test("cropName", () => {
  expect(cropName("tomato", "hi")).toBe("टमाटर");
  expect(cropName("tomato", "pa")).toBe("ਟਮਾਟਰ");
});

test("nextQuestionKey order: crop → quantity → price → village → date → null", () => {
  expect(nextQuestionKey({})).toBe("askCrop");
  expect(nextQuestionKey({ crop: "tomato" })).toBe("askQuantity");
  expect(nextQuestionKey({ crop: "tomato", quantityKg: 1, askPricePerKg: 1, village: "Dakha" })).toBe("askPickupDate");
  expect(
    nextQuestionKey({ crop: "tomato", quantityKg: 1, askPricePerKg: 1, village: "Dakha", pickupDate: "2026-11-07" }),
  ).toBeNull();
});

test("formatDate uses our own month names (browser Intl has no Punjabi months)", () => {
  expect(formatDate("2026-11-08", "pa")).toBe("8 ਨਵੰਬਰ");
  expect(formatDate("2026-11-08", "hi")).toBe("8 नवंबर");
  expect(formatDate("2027-02-01", "hi")).toBe("1 फ़रवरी");
});
