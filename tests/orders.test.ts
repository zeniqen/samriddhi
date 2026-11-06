import { beforeEach, describe, expect, test } from "vitest";
import { placeOrder } from "@/lib/orders";
import { createMemoryStore, type Store } from "@/lib/store";

const NOW = new Date("2026-11-06T06:00:00Z");
const confirm = async () => ({ textEnglish: "sold", textLocal: "बिक गया" });

let store: Store;
beforeEach(() => {
  store = createMemoryStore("2026-11-06");
});

describe("placeOrder", () => {
  test("freezes split, decrements stock, creates one notification", async () => {
    // l1: f1, 300 kg @ ₹14
    const r = await placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: 100 }, { store, confirm, now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.split.farmerPerKg).toBe(14);
    expect(r.order.split.buyerPerKg).toBe(22.5); // 14+4+3 = 21, 6% = 1.26 → 1.5
    expect((await store.getListing("l1"))!.remainingKg).toBe(200);
    expect(await store.listNotifications("f1")).toHaveLength(1);
  });

  test("later price change does not alter placed order", async () => {
    const r = await placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: 100 }, { store, confirm, now: NOW });
    const listing = (await store.getListing("l1"))!;
    await store.saveListing({ ...listing, askPricePerKg: 20 });
    expect((await store.getOrder(r.ok ? r.order.id : ""))!.split.farmerPerKg).toBe(14);
  });

  test("over-ordering returns 409 and leaves stock intact", async () => {
    const r = await placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: 400 }, { store, confirm, now: NOW });
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect((await store.getListing("l1"))!.remainingKg).toBe(300);
  });

  test("two concurrent orders cannot oversell", async () => {
    const [a, b] = await Promise.all([
      placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: 200 }, { store, confirm, now: NOW }),
      placeOrder({ listingId: "l1", buyerId: "b2", quantityKg: 200 }, { store, confirm, now: NOW }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect((await store.getListing("l1"))!.remainingKg).toBe(100);
  });

  test("selling the last kg marks listing sold_out", async () => {
    await placeOrder({ listingId: "l8", buyerId: "b3", quantityKg: 50 }, { store, confirm, now: NOW });
    expect((await store.getListing("l8"))!.status).toBe("sold_out");
  });

  test("kg <= 0 or non-integer junk returns 400", async () => {
    expect(await placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: 0 }, { store, confirm, now: NOW })).toMatchObject({ ok: false, status: 400 });
    expect(await placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: Number.NaN }, { store, confirm, now: NOW })).toMatchObject({ ok: false, status: 400 });
  });

  test("unknown listing or buyer returns 404", async () => {
    expect(await placeOrder({ listingId: "nope", buyerId: "b1", quantityKg: 1 }, { store, confirm, now: NOW })).toMatchObject({ ok: false, status: 404 });
    expect(await placeOrder({ listingId: "l1", buyerId: "nope", quantityKg: 1 }, { store, confirm, now: NOW })).toMatchObject({ ok: false, status: 404 });
  });

  test("confirmation failure still places the order", async () => {
    const failing = async () => {
      throw new Error("llm down");
    };
    const r = await placeOrder({ listingId: "l1", buyerId: "b1", quantityKg: 10 }, { store, confirm: failing, now: NOW });
    expect(r.ok).toBe(true);
  });
});

test("listing with an unknown farmer still places the order without crashing", async () => {
  const l = (await store.getListing("l2"))!;
  await store.saveListing({ ...l, farmerId: "ghost" });
  const r = await placeOrder({ listingId: "l2", buyerId: "b1", quantityKg: 10 }, { store, confirm, now: NOW });
  expect(r.ok).toBe(true);
});
