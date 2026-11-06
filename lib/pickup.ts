// The pickup partner's run sheet: sold produce grouped by pickup date, then village.
import type { Buyer, Farmer, Listing, Order } from "./types";

export type PickupStop = { orderId: string; farmerName: string; buyerName: string; kg: number };
export type VillageRun = { village: string; stops: PickupStop[]; totalKg: number; earnings: number };
export type DayRun = { date: string; villages: VillageRun[]; totalKg: number; earnings: number };

export function buildPickupRuns(input: {
  orders: Order[];
  listings: Listing[];
  farmers: Farmer[];
  buyers: Buyer[];
}): DayRun[] {
  const listingById = new Map(input.listings.map((l) => [l.id, l]));
  const farmerName = new Map(input.farmers.map((f) => [f.id, f.name]));
  const buyerName = new Map(input.buyers.map((b) => [b.id, b.name]));

  // date → village → stops and the partner fee earned (fee is frozen on each order).
  const days = new Map<string, Map<string, { stops: PickupStop[]; earnings: number }>>();
  for (const o of input.orders) {
    const l = listingById.get(o.listingId);
    if (!l) continue;
    const villages = days.get(l.pickupDate) ?? new Map();
    days.set(l.pickupDate, villages);
    const run = villages.get(l.village) ?? { stops: [], earnings: 0 };
    villages.set(l.village, run);
    run.stops.push({
      orderId: o.id,
      farmerName: farmerName.get(l.farmerId) ?? "Farmer",
      buyerName: buyerName.get(o.buyerId) ?? "Buyer",
      kg: o.quantityKg,
    });
    run.earnings += o.quantityKg * o.split.partnerPerKg;
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, villages]) => {
      const runs: VillageRun[] = [...villages.entries()]
        .map(([village, { stops, earnings }]) => ({
          village,
          // One farm, one stop: keep a farmer's orders together (stable, so order within a farmer is kept).
          stops: [...stops].sort((a, b) => a.farmerName.localeCompare(b.farmerName)),
          totalKg: stops.reduce((sum, s) => sum + s.kg, 0),
          earnings,
        }))
        .sort((a, b) => b.totalKg - a.totalKg);
      return {
        date,
        villages: runs,
        totalKg: runs.reduce((sum, r) => sum + r.totalKg, 0),
        earnings: runs.reduce((sum, r) => sum + r.earnings, 0),
      };
    });
}
