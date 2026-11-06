// The pickup partner's run sheet: sold produce grouped by pickup date, then village, with an
// estimated arrival time and the distance driven to reach each farm.
import { BASE, roadKm, VILLAGE_COORDS } from "./geo";
import type { Buyer, Farmer, Listing, Order } from "./types";

export type PickupStop = {
  orderId: string;
  farmerName: string;
  buyerName: string;
  kg: number;
  /** Turned down by this partner; the job goes to the next partner. */
  rejected: boolean;
  /** Km driven from the previous stop (0 = another order at the same farm). Null if unknown or rejected. */
  km: number | null;
  /** Estimated arrival, minutes after midnight. Null if rejected. */
  etaMin: number | null;
};
export type VillageRun = { village: string; stops: PickupStop[]; totalKg: number; earnings: number };
export type DayRun = { date: string; villages: VillageRun[]; totalKg: number; earnings: number; totalKm: number };

export const START_MIN = 7 * 60; // the truck leaves at 7:00 am
const MIN_PER_KM = 2; // ~30 km/h on village roads
const LOAD_MIN = 15; // weighing and loading at each farm
const IN_VILLAGE_KM = 2; // farm to farm inside one village
const UNKNOWN_TRAVEL_MIN = 30; // a place we have no location for

type Draft = Omit<PickupStop, "km" | "etaMin"> & { farmerId: string; earn: number };

export function buildPickupRuns(input: {
  orders: Order[];
  listings: Listing[];
  farmers: Farmer[];
  buyers: Buyer[];
}): DayRun[] {
  const listingById = new Map(input.listings.map((l) => [l.id, l]));
  const farmerName = new Map(input.farmers.map((f) => [f.id, f.name]));
  const buyerName = new Map(input.buyers.map((b) => [b.id, b.name]));

  const days = new Map<string, Map<string, Draft[]>>();
  for (const o of input.orders) {
    const l = listingById.get(o.listingId);
    if (!l) continue;
    const villages = days.get(l.pickupDate) ?? new Map<string, Draft[]>();
    days.set(l.pickupDate, villages);
    const stops = villages.get(l.village) ?? [];
    villages.set(l.village, stops);
    stops.push({
      orderId: o.id,
      farmerId: l.farmerId,
      farmerName: farmerName.get(l.farmerId) ?? "Farmer",
      buyerName: buyerName.get(o.buyerId) ?? "Buyer",
      kg: o.quantityKg,
      rejected: o.partnerStatus === "rejected",
      earn: o.quantityKg * o.split.partnerPerKg, // fee frozen on the order
    });
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, villages]) => planDay(date, villages));
}

function planDay(date: string, villages: Map<string, Draft[]>): DayRun {
  // Visit order: nearest next village first; places without a location, then fully rejected ones, go last.
  const pending = [...villages.keys()];
  const order: string[] = [];
  let pos = BASE;
  const active = (v: string) => villages.get(v)!.some((s) => !s.rejected);
  while (pending.length) {
    const located = pending.filter((v) => VILLAGE_COORDS[v] && active(v));
    const pick = located.length
      ? located.reduce((best, v) => (roadKm(pos, VILLAGE_COORDS[v]) < roadKm(pos, VILLAGE_COORDS[best]) ? v : best))
      : (pending.find(active) ?? pending[0]);
    order.push(pick);
    pending.splice(pending.indexOf(pick), 1);
    if (VILLAGE_COORDS[pick]) pos = VILLAGE_COORDS[pick];
  }

  let here = BASE;
  let clock = START_MIN;
  let totalKm = 0;
  const runs: VillageRun[] = order.map((village) => {
    // One farm, one stop: keep a farmer's orders together (stable sort keeps their order).
    const drafts = [...villages.get(village)!].sort((a, b) => a.farmerName.localeCompare(b.farmerName));
    const coords = VILLAGE_COORDS[village];
    let lastFarm: string | null = null;
    let farmEta = clock;
    const stops: PickupStop[] = drafts.map(({ orderId, farmerId, farmerName, buyerName, kg, rejected }) => {
      const s = { orderId, farmerName, buyerName, kg, rejected };
      if (s.rejected) return { ...s, km: null, etaMin: null };
      if (farmerId === lastFarm) return { ...s, km: 0, etaMin: farmEta };
      let km: number | null;
      if (lastFarm === null) km = coords ? roadKm(here, coords) : null; // first farm in this village
      else km = IN_VILLAGE_KM;
      clock += km === null ? UNKNOWN_TRAVEL_MIN : km * MIN_PER_KM;
      farmEta = Math.round(clock / 5) * 5;
      clock += LOAD_MIN;
      totalKm += km ?? 0;
      lastFarm = farmerId;
      return { ...s, km, etaMin: farmEta };
    });
    if (coords && lastFarm !== null) here = coords;
    const live = drafts.filter((s) => !s.rejected);
    return {
      village,
      stops,
      totalKg: live.reduce((sum, s) => sum + s.kg, 0),
      earnings: live.reduce((sum, s) => sum + s.earn, 0),
    };
  });

  return {
    date,
    villages: runs,
    totalKg: runs.reduce((sum, r) => sum + r.totalKg, 0),
    earnings: runs.reduce((sum, r) => sum + r.earnings, 0),
    totalKm,
  };
}
