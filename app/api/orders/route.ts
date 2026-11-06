import { buyerOrders } from "@/lib/buyer-orders";
import { placeOrder, templateConfirmation } from "@/lib/orders";
import { getStore } from "@/lib/store";

/** A buyer's own orders, newest first. */
export async function GET(req: Request) {
  const buyerId = new URL(req.url).searchParams.get("buyerId");
  if (!buyerId) return Response.json({ error: "buyerId required" }, { status: 400 });
  const store = getStore();
  const [orders, listings, farmers] = await Promise.all([store.listOrders(), store.listListings(), store.listFarmers()]);
  return Response.json({ orders: buyerOrders({ orders, listings, farmers, buyerId }) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await placeOrder(
    { listingId: String(body.listingId ?? ""), buyerId: String(body.buyerId ?? ""), quantityKg: Number(body.quantityKg) },
    // The farmer always hears the fixed sentence: it names the buyer and states what they will be paid.
    { store: getStore(), confirm: async (facts) => templateConfirmation(facts), now: new Date() },
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ order: result.order });
}
