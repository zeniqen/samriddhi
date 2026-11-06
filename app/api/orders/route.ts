import { allowedNumbers, mentionsAll } from "@/lib/factcheck";
import { llmConfirmation } from "@/lib/llm";
import { localize } from "@/lib/localize";
import { placeOrder, templateConfirmation, type ConfirmFn } from "@/lib/orders";
import { orderTotals } from "@/lib/pricing";
import { translateFromEnglish } from "@/lib/sarvam";
import { getStore } from "@/lib/store";

const confirm: ConfirmFn = async (facts) => {
  const { order, listing, buyer, farmer } = facts;
  const { farmerTotal } = orderTotals(order.split, order.quantityKg);
  const english = await llmConfirmation({
    buyerName: buyer.name,
    kg: order.quantityKg,
    crop: listing.crop,
    pricePerKg: order.split.farmerPerKg,
    total: farmerTotal,
    pickupDate: listing.pickupDate,
  });
  // The confirmation must state kg and the farmer's total, and nothing else numeric.
  if (!mentionsAll(english, [order.quantityKg, farmerTotal])) return templateConfirmation(facts);
  const allowed = allowedNumbers({
    quantityKg: order.quantityKg,
    pricePerKg: order.split.farmerPerKg,
    total: farmerTotal,
    pickupDate: listing.pickupDate,
  });
  const loc = await localize(
    { replyEnglish: english, lang: farmer.lang, allowed, fallback: { key: "orderConfirmed" } },
    { translate: translateFromEnglish },
  );
  return loc.usedTemplate ? templateConfirmation(facts) : { textEnglish: english, textLocal: loc.text };
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await placeOrder(
    { listingId: String(body.listingId ?? ""), buyerId: String(body.buyerId ?? ""), quantityKg: Number(body.quantityKg) },
    { store: getStore(), confirm, now: new Date() },
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ order: result.order });
}
