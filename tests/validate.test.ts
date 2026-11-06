import { describe, expect, test } from "vitest";
import { addDays, todayIST } from "@/lib/dates";
import { matchVillage, validateUpdates } from "@/lib/validate";
import { SEED_BUYERS, SEED_FARMERS, SEED_LISTINGS } from "@/lib/seed-data";

describe("dates", () => {
  test("todayIST rolls over at IST midnight", () => {
    expect(todayIST(new Date("2026-11-06T18:45:00Z"))).toBe("2026-11-07"); // 00:15 IST
  });
  test("todayIST is still the same day at 23:30 IST", () => {
    expect(todayIST(new Date("2026-11-06T18:00:00Z"))).toBe("2026-11-06");
  });
  test("addDays crosses month end", () => {
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
  });
});

describe("validateUpdates", () => {
  test("rejects out-of-range fields", () => {
    const r = validateUpdates({ quantityKg: 0, askPricePerKg: 500, pickupDate: "2026-12-06" }, "2026-11-06");
    expect(r.accepted).toEqual({});
    expect([...r.rejected].sort()).toEqual(["askPricePerKg", "pickupDate", "quantityKg"]);
  });

  test("accepts valid fields and normalises village", () => {
    const r = validateUpdates(
      { crop: "tomato", quantityKg: 100, askPricePerKg: 16, village: "dakha village", pickupDate: "2026-11-08" },
      "2026-11-06",
    );
    expect(r.accepted.village).toBe("Dakha");
    expect(r.rejected).toEqual([]);
  });

  test("normalises plural/capitalised crop from the LLM", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateUpdates({ crop: "Tomatoes" as any }, "2026-11-06").accepted.crop).toBe("tomato");
  });

  test("rejects unknown crop and past date", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = validateUpdates({ crop: "mango" as any, pickupDate: "2026-11-05" }, "2026-11-06");
    expect(r.accepted).toEqual({});
  });

  test("matchVillage tolerates small typos, rejects unknown", () => {
    expect(matchVillage("Dhaka")).toBe("Dakha");
    expect(matchVillage("Mumbai")).toBeNull();
  });
});

describe("seed data", () => {
  test("has 5 farmers (3 hi, 2 pa), 3 buyers, 8 tomato listings", () => {
    expect(SEED_FARMERS).toHaveLength(5);
    expect(SEED_FARMERS.filter((f) => f.lang === "hi")).toHaveLength(3);
    expect(SEED_BUYERS).toHaveLength(3);
    expect(SEED_LISTINGS).toHaveLength(8);
    expect(SEED_LISTINGS.every((l) => l.crop === "tomato")).toBe(true);
  });
});
