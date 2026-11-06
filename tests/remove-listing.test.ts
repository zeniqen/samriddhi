import { expect, test } from "vitest";
import { placeOrder, templateConfirmation } from "@/lib/orders";
import { removeListing } from "@/lib/remove-listing";
import { createMemoryStore } from "@/lib/store";

const today = "2026-11-06";

test("farmer removes their own listing; it can't be bought any more", async () => {
  const store = createMemoryStore(today);
  const l = (await store.listListings())[0];
  expect(await removeListing({ listingId: l.id, farmerId: l.farmerId }, store)).toEqual({ ok: true });
  expect((await store.getListing(l.id))?.status).toBe("removed");
  const r = await placeOrder(
    { listingId: l.id, buyerId: "b1", quantityKg: 1 },
    { store, confirm: async (f) => templateConfirmation(f), now: new Date() },
  );
  expect(r.ok).toBe(false);
});

test("another farmer can't remove it, and removing twice is not found", async () => {
  const store = createMemoryStore(today);
  const l = (await store.listListings())[0];
  const other = l.farmerId === "f1" ? "f2" : "f1";
  expect(await removeListing({ listingId: l.id, farmerId: other }, store)).toMatchObject({ ok: false, status: 403 });
  await removeListing({ listingId: l.id, farmerId: l.farmerId }, store);
  expect(await removeListing({ listingId: l.id, farmerId: l.farmerId }, store)).toMatchObject({ ok: false, status: 404 });
});
