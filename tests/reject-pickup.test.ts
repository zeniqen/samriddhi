import { expect, test } from "vitest";
import { placeOrder, templateConfirmation } from "@/lib/orders";
import { rejectPickup } from "@/lib/reject-pickup";
import { createMemoryStore } from "@/lib/store";

test("partner rejects a pickup: the order is flagged, unknown orders are 404", async () => {
  const store = createMemoryStore("2026-11-06");
  const l = (await store.listListings())[0];
  const r = await placeOrder(
    { listingId: l.id, buyerId: "b1", quantityKg: 1 },
    { store, confirm: async (f) => templateConfirmation(f), now: new Date() },
  );
  if (!r.ok) throw new Error(r.error);
  expect(await rejectPickup(r.order.id, store)).toEqual({ ok: true });
  expect((await store.getOrder(r.order.id))?.partnerStatus).toBe("rejected");
  expect(await rejectPickup("nope", store)).toMatchObject({ ok: false, status: 404 });
});
