import { describe, expect, test } from "vitest";
import { CROPS, cropEn, cropInLang, findCropInEnglish, findCropInNative, normaliseCrop } from "@/lib/crops";
import { parseFallback } from "@/lib/fallback-parser";
import { validateUpdates } from "@/lib/validate";

describe("crop catalogue", () => {
  test("every crop has Hindi, Punjabi and English names", () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(45);
    for (const c of CROPS) {
      expect(cropInLang(c, "hi")).toMatch(/[ऀ-ॿ]/); // Devanagari
      expect(cropInLang(c, "pa")).toMatch(/[਀-੿]/); // Gurmukhi
      expect(cropEn(c)).toMatch(/^[A-Z]/);
    }
  });

  test("normalises what the AI or translation says", () => {
    expect(normaliseCrop("Carrots")).toBe("carrot");
    expect(normaliseCrop("radishes")).toBe("radish");
    expect(normaliseCrop("Lady finger")).toBe("okra");
    expect(normaliseCrop("green chillies")).toBe("chilli");
    expect(normaliseCrop("Sweet Potatoes")).toBe("sweet_potato");
    expect(normaliseCrop("bottle gourd")).toBe("bottle_gourd");
    expect(normaliseCrop("rice")).toBe("paddy");
    expect(normaliseCrop("broccoli")).toBeNull();
  });

  test("finds the crop in an English sentence, longest name first", () => {
    expect(findCropInEnglish("I have 200 kg sweet potatoes at 20 rupees")).toBe("sweet_potato");
    expect(findCropInEnglish("100 kilos of carrots tomorrow")).toBe("carrot");
    expect(findCropInEnglish("100 kilos tomorrow")).toBeUndefined();
  });

  test("finds the crop in the farmer's own words, whole words only", () => {
    expect(findCropInNative("सौ किलो गाजर, सोलह रुपये किलो")).toBe("carrot");
    expect(findCropInNative("पचास किलो मूली")).toBe("radish");
    expect(findCropInNative("ਸੌ ਕਿੱਲੋ ਗਾਜਰ")).toBe("carrot");
    expect(findCropInNative("सौ किलो टमाटर")).toBe("tomato"); // not मटर (peas) inside टमाटर
    expect(findCropInNative("सौ किलो शिमला मिर्च")).toBe("capsicum"); // not मिर्च (chilli)
    expect(findCropInNative("ਸੌ ਕਿੱਲੋ ਫੁੱਲ ਗੋਭੀ")).toBe("cauliflower");
    expect(findCropInNative("आम तौर पर सौ किलो")).toBeNull(); // आम here means "usually"
    expect(findCropInNative("गाजर और मूली")).toBeNull(); // two crops: let the AI ask
  });

  test("the fallback parser and validator accept new crops, and crops aren't taken for villages", () => {
    expect(parseFallback("100 kg carrots at 18 rupees", "2026-11-06").crop).toBe("carrot");
    expect(parseFallback("100 kg cauliflower at 18 rupees", "2026-11-06").village).toBeUndefined();
    expect(validateUpdates({ crop: "Kinnow" as never }, "2026-11-06").accepted.crop).toBe("kinnow");
    expect(validateUpdates({ village: "Spinach" }, "2026-11-06").accepted.village).toBeUndefined();
  });
});
