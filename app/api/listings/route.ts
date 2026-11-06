import { connection } from "next/server";
import { computeSplit } from "@/lib/pricing";
import { getStore } from "@/lib/store";

export async function GET() {
  await connection(); // always read live stock, never prerender
  const store = getStore();
  const [listings, farmers, buyers] = await Promise.all([store.listListings(), store.listFarmers(), store.listBuyers()]);
  const names = new Map(farmers.map((f) => [f.id, f.name]));
  return Response.json({
    listings: listings
      .filter((l) => l.status !== "sold_out" && l.remainingKg > 0)
      .map((l) => ({ ...l, split: computeSplit(l.askPricePerKg), farmerName: names.get(l.farmerId) ?? "Farmer" })),
    buyers,
    farmers,
  });
}
