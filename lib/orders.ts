import { computeSplit, orderTotals } from "./pricing";
import type { Store } from "./store";
import { buyerInScript } from "./readback";
import { cropName, formatDate, t } from "./templates";
import type { Buyer, Farmer, Listing, Order } from "./types";

export type ConfirmFn = (facts: {
  order: Order;
  listing: Listing;
  buyer: Buyer;
  farmer: Farmer;
}) => Promise<{ textEnglish: string; textLocal: string }>;

type Result = { ok: true; order: Order } | { ok: false; status: 400 | 404 | 409; error: string };

/** The fixed confirmation sentence: always correct, used when the AI path fails. */
export function templateConfirmation({ order, listing, buyer, farmer }: Parameters<ConfirmFn>[0]) {
  const { farmerTotal } = orderTotals(order.split, order.quantityKg);
  return {
    textEnglish: `${buyer.name} bought ${order.quantityKg} kg ${listing.crop} at ₹${order.split.farmerPerKg}/kg. You receive ₹${farmerTotal}. Pickup ${listing.pickupDate}.`,
    textLocal: t("orderConfirmed", farmer.lang, {
      buyer: buyerInScript(buyer.id, buyer.name, farmer.lang),
      kg: order.quantityKg,
      crop: cropName(listing.crop, farmer.lang),
      price: order.split.farmerPerKg,
      total: farmerTotal,
      date: formatDate(listing.pickupDate, farmer.lang),
    }),
  };
}

export async function placeOrder(
  input: { listingId: string; buyerId: string; quantityKg: number },
  deps: { store: Store; confirm: ConfirmFn; now: Date },
): Promise<Result> {
  const { store } = deps;
  if (!Number.isFinite(input.quantityKg) || input.quantityKg <= 0) {
    return { ok: false, status: 400, error: "Quantity must be more than 0 kg" };
  }
  const buyer = await store.getBuyer(input.buyerId);
  if (!buyer) return { ok: false, status: 404, error: "Unknown buyer" };

  const placed = await store.withListingLock(input.listingId, async (): Promise<Result & { listing?: Listing }> => {
    const listing = await store.getListing(input.listingId);
    if (!listing) return { ok: false, status: 404, error: "Listing not found" };
    if (input.quantityKg > listing.remainingKg) {
      return { ok: false, status: 409, error: `Only ${listing.remainingKg} kg left` };
    }
    const order: Order = {
      id: `o_${deps.now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      listingId: listing.id,
      buyerId: buyer.id,
      quantityKg: input.quantityKg,
      split: computeSplit(listing.askPricePerKg),
      status: "placed",
      createdAt: deps.now.toISOString(),
    };
    const remainingKg = listing.remainingKg - input.quantityKg;
    const updated: Listing = { ...listing, remainingKg, status: remainingKg === 0 ? "sold_out" : listing.status };
    await store.saveOrder(order);
    await store.saveListing(updated);
    return { ok: true, order, listing: updated };
  });
  if (!placed.ok) return placed;

  const { order, listing } = placed;
  const farmer = await store.getFarmer(listing!.farmerId);
  if (!farmer) return { ok: true, order }; // order stands; nobody to notify
  const facts = { order, listing: listing!, buyer, farmer };
  let texts: { textEnglish: string; textLocal: string };
  try {
    texts = await deps.confirm(facts);
  } catch {
    texts = templateConfirmation(facts);
  }
  await store.saveNotification({
    id: `n_${order.id}`,
    farmerId: farmer.id,
    orderId: order.id,
    ...texts,
    farmerTotal: orderTotals(order.split, order.quantityKg).farmerTotal,
    facts: {
      buyerId: buyer.id,
      buyerName: buyer.name,
      crop: listing!.crop,
      kg: order.quantityKg,
      pricePerKg: order.split.farmerPerKg,
      total: orderTotals(order.split, order.quantityKg).farmerTotal,
      pickupDate: listing!.pickupDate,
    },
    heard: false,
    createdAt: deps.now.toISOString(),
  });
  return { ok: true, order };
}
