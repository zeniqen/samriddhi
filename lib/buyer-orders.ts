// A buyer's own orders, ready to show: who it's from, what, when it's picked up, and what they paid.
import { orderTotals } from "./pricing";
import type { Crop, Farmer, Listing, Order } from "./types";

export type BuyerOrderRow = {
  id: string;
  createdAt: string;
  farmerName: string;
  crop?: Crop;
  village?: string;
  pickupDate?: string;
  kg: number;
  pricePerKg: number;
  total: number;
};

export function buyerOrders(input: {
  orders: Order[];
  listings: Listing[];
  farmers: Farmer[];
  buyerId: string;
}): BuyerOrderRow[] {
  const listingById = new Map(input.listings.map((l) => [l.id, l]));
  const farmerName = new Map(input.farmers.map((f) => [f.id, f.name]));
  return input.orders
    .filter((o) => o.buyerId === input.buyerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => {
      const l = listingById.get(o.listingId);
      return {
        id: o.id,
        createdAt: o.createdAt,
        farmerName: l ? (farmerName.get(l.farmerId) ?? "Farmer") : "Farmer",
        crop: l?.crop,
        village: l?.village,
        pickupDate: l?.pickupDate,
        kg: o.quantityKg,
        pricePerKg: o.split.buyerPerKg, // frozen when the order was placed
        total: orderTotals(o.split, o.quantityKg).buyerTotal,
      };
    });
}
