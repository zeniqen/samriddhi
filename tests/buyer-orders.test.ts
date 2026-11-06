import { expect, test } from "vitest";
import { buyerOrders } from "@/lib/buyer-orders";
import { computeSplit } from "@/lib/pricing";
import type { Farmer, Listing, Order } from "@/lib/types";

const farmers: Farmer[] = [{ id: "f1", name: "Ramesh Kumar", village: "Dakha", lang: "hi", phone: "" }];
const listings: Listing[] = [
  {
    id: "l1", farmerId: "f1", crop: "tomato", quantityKg: 300, remainingKg: 200, askPricePerKg: 14, village: "Dakha",
    pickupDate: "2026-11-08", status: "live", transcriptOriginal: "", transcriptEnglish: "", createdAt: "",
  },
];
const order = (id: string, buyerId: string, kg: number, createdAt: string): Order => ({
  id, listingId: "l1", buyerId, quantityKg: kg, split: computeSplit(14), status: "placed", createdAt,
});

test("only this buyer's orders, newest first, with farmer, crop, pickup and what they paid", () => {
  const orders = [
    order("o1", "b1", 100, "2026-11-06T08:00:00Z"),
    order("o2", "b2", 50, "2026-11-06T09:00:00Z"),
    order("o3", "b1", 20, "2026-11-06T10:00:00Z"),
  ];
  const rows = buyerOrders({ orders, listings, farmers, buyerId: "b1" });
  expect(rows.map((r) => r.id)).toEqual(["o3", "o1"]);
  expect(rows[1]).toMatchObject({
    farmerName: "Ramesh Kumar",
    crop: "tomato",
    village: "Dakha",
    pickupDate: "2026-11-08",
    kg: 100,
    pricePerKg: 22.5, // 14 + 4 + 3 + 1.5 frozen at order time
    total: 2250,
  });
});

test("an order whose listing is gone still shows, without farmer details", () => {
  const rows = buyerOrders({ orders: [{ ...order("o9", "b1", 5, "2026-11-06T08:00:00Z"), listingId: "gone" }], listings, farmers, buyerId: "b1" });
  expect(rows[0]).toMatchObject({ id: "o9", farmerName: "Farmer", kg: 5, total: 112.5 });
});
