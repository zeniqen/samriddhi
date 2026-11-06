import { expect, test } from "vitest";
import { buildPickupRuns } from "@/lib/pickup";
import { computeSplit } from "@/lib/pricing";
import type { Buyer, Farmer, Listing, Order } from "@/lib/types";

const farmers: Farmer[] = [
  { id: "f1", name: "Ramesh Kumar", village: "Dakha", lang: "hi", phone: "" },
  { id: "f2", name: "Sunita Devi", village: "Dakha", lang: "hi", phone: "" },
  { id: "f3", name: "Mohan Lal", village: "Doraha", lang: "hi", phone: "" },
];
const buyers: Buyer[] = [
  { id: "b1", name: "Hotel Sagar Dhaba", type: "restaurant", area: "" },
  { id: "b3", name: "Sharma Kirana Store", type: "kirana", area: "" },
];
const listing = (id: string, farmerId: string, village: string, pickupDate: string, ask = 16): Listing => ({
  id, farmerId, village, pickupDate, crop: "tomato", quantityKg: 300, remainingKg: 0, askPricePerKg: ask,
  status: "live", transcriptOriginal: "", transcriptEnglish: "", createdAt: "",
});
const order = (id: string, listingId: string, buyerId: string, kg: number, ask = 16): Order => ({
  id, listingId, buyerId, quantityKg: kg, split: computeSplit(ask), status: "placed", createdAt: "",
});

const listings = [
  listing("l1", "f1", "Dakha", "2026-11-08"),
  listing("l2", "f2", "Dakha", "2026-11-08"),
  listing("l3", "f3", "Doraha", "2026-11-08"),
  listing("l4", "f1", "Dakha", "2026-11-10"),
];
const orders = [
  order("o1", "l1", "b1", 100),
  order("o2", "l2", "b3", 50),
  order("o3", "l1", "b3", 20),
  order("o4", "l3", "b1", 80),
  order("o5", "l4", "b1", 40),
];

test("groups pickups by date, then village, with stops and the partner's earnings", () => {
  const runs = buildPickupRuns({ orders, listings, farmers, buyers });
  expect(runs.map((r) => r.date)).toEqual(["2026-11-08", "2026-11-10"]);

  const day1 = runs[0];
  expect(day1.villages.map((v) => v.village)).toEqual(["Dakha", "Doraha"]); // nearest to Ludhiana first
  const dakha = day1.villages[0];
  expect(dakha.totalKg).toBe(170);
  expect(dakha.earnings).toBe(680); // 170 kg × ₹4
  expect(dakha.stops).toEqual([
    { orderId: "o1", farmerName: "Ramesh Kumar", buyerName: "Hotel Sagar Dhaba", kg: 100, rejected: false, km: 21, etaMin: 460 },
    { orderId: "o3", farmerName: "Ramesh Kumar", buyerName: "Sharma Kirana Store", kg: 20, rejected: false, km: 0, etaMin: 460 },
    { orderId: "o2", farmerName: "Sunita Devi", buyerName: "Sharma Kirana Store", kg: 50, rejected: false, km: 2, etaMin: 480 },
  ]);
  // 21 km at 2 min/km from 7:00 → 7:40; same farm, same time; next farm 2 km after 15 min loading → 8:00.
  expect(day1.totalKg).toBe(250);
  expect(day1.earnings).toBe(1000);
});

test("uses the partner fee frozen on each order", () => {
  const custom = [{ ...order("o9", "l3", "b1", 10), split: { ...computeSplit(16), partnerPerKg: 5 } }];
  expect(buildPickupRuns({ orders: custom, listings, farmers, buyers })[0].earnings).toBe(50);
});

test("skips orders whose listing is gone; no orders gives no runs", () => {
  expect(buildPickupRuns({ orders: [order("x", "nope", "b1", 10)], listings, farmers, buyers })).toEqual([]);
  expect(buildPickupRuns({ orders: [], listings, farmers, buyers })).toEqual([]);
});

test("next village is timed from the last one; day total km adds up", () => {
  const day1 = buildPickupRuns({ orders, listings, farmers, buyers })[0];
  const doraha = day1.villages[1].stops[0];
  expect(doraha.km).toBe(41); // Dakha → Doraha
  expect(doraha.etaMin).toBe(580); // 9:40 am
  expect(day1.totalKm).toBe(64);
});

test("a rejected pickup leaves the route and the earnings, but stays listed", () => {
  const withReject = orders.map((o) => (o.id === "o2" ? { ...o, partnerStatus: "rejected" as const } : o));
  const dakha = buildPickupRuns({ orders: withReject, listings, farmers, buyers })[0].villages[0];
  const sunita = dakha.stops.find((s) => s.orderId === "o2")!;
  expect(sunita).toMatchObject({ rejected: true, km: null, etaMin: null });
  expect(dakha.totalKg).toBe(120);
  expect(dakha.earnings).toBe(480);
});

test("a place with no known location still gets a time, without a distance", () => {
  const far = [listing("lg", "f1", "Ghaziabad", "2026-11-12")];
  const stop = buildPickupRuns({ orders: [order("og", "lg", "b1", 10)], listings: far, farmers, buyers })[0].villages[0].stops[0];
  expect(stop).toMatchObject({ km: null, etaMin: 450 });
});
