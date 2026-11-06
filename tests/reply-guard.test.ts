import { expect, test } from "vitest";
import { replyAsksFor } from "@/lib/reply-guard";

test("the reply seen on stage is rejected: it asks for another crop when kilos are missing", () => {
  const r = "You already have a carrot pickup scheduled, so please tell me which other crop you would like to sell.";
  expect(replyAsksFor(r, "askQuantity")).toBe(false);
  expect(replyAsksFor(r, "askCrop")).toBe(false); // "other" / "already": off track even for the crop question
});

test("on-track questions pass, one per field", () => {
  expect(replyAsksFor("Got it, carrots. How many kilos do you have?", "askQuantity")).toBe(true);
  expect(replyAsksFor("What price per kg would you like?", "askPrice")).toBe(true);
  expect(replyAsksFor("Which village are you in?", "askVillage")).toBe(true);
  expect(replyAsksFor("When should we pick it up?", "askPickupDate")).toBe(true);
  expect(replyAsksFor("What would you like to sell today?", "askCrop")).toBe(true);
});

test("a question about the wrong field is rejected", () => {
  expect(replyAsksFor("Which village are you in?", "askQuantity")).toBe(false);
  expect(replyAsksFor("How many kilos do you have?", "askPrice")).toBe(false);
  expect(replyAsksFor("", "askQuantity")).toBe(false);
});

test("the farmer is addressed in the respectful form, not assumed female", async () => {
  const { neutralAddress } = await import("@/lib/localize");
  expect(neutralAddress("आप प्रति किलो कितने रुपये लेना चाहेंगी?")).toBe("आप प्रति किलो कितने रुपये लेना चाहेंगे?");
  expect(neutralAddress("ਤੁਸੀਂ ਕਿੰਨਾ ਭਾਅ ਚਾਹੋਗੀ?")).toBe("ਤੁਸੀਂ ਕਿੰਨਾ ਭਾਅ ਚਾਹੋਗੇ?");
  expect(neutralAddress("कितने किलो हैं?")).toBe("कितने किलो हैं?");
});
