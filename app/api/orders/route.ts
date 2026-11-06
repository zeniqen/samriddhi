import { placeOrder, templateConfirmation } from "@/lib/orders";
import { getStore } from "@/lib/store";

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
