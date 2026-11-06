import { expect, test } from "vitest";
import { buyerInScript, readBackVars, villageInScript } from "@/lib/readback";
import { t } from "@/lib/templates";

const fields = { crop: "tomato" as const, quantityKg: 100, askPricePerKg: 16, village: "Dakha", pickupDate: "2026-11-08" };

test("village and buyer names in the farmer's script", () => {
  expect(villageInScript("Dakha", "hi")).toBe("दाखा");
  expect(villageInScript("Dakha", "pa")).toBe("ਦਾਖਾ");
  expect(buyerInScript("b3", "Sharma Kirana Store", "hi")).toBe("शर्मा किराना स्टोर");
  expect(buyerInScript("zz", "Some Shop", "pa")).toBe("Some Shop");
});

test("read-back is fully in the chosen language", () => {
  expect(t("readBack", "pa", readBackVars(fields, "pa"))).toBe(
    "100 ਕਿੱਲੋ ਟਮਾਟਰ, 16 ਰੁਪਏ ਕਿੱਲੋ, ਕੁੱਲ 1600 ਰੁਪਏ, ਪਿੰਡ ਦਾਖਾ, ਪਿਕਅੱਪ 8 ਨਵੰਬਰ। ਠੀਕ ਹੈ?",
  );
});

test("Hindi read-back states the total before asking to confirm", () => {
  expect(t("readBack", "hi", readBackVars(fields, "hi"))).toContain("कुल 1600 रुपये");
});
