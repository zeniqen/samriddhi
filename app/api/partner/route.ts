import { connection } from "next/server";
import { buildPickupRuns } from "@/lib/pickup";
import { getStore } from "@/lib/store";

export async function GET() {
  await connection(); // live data, never prerendered
  const store = getStore();
  const [orders, listings, farmers, buyers] = await Promise.all([
    store.listOrders(),
    store.listListings(), // includes sold-out listings: their pickups still need collecting
    store.listFarmers(),
    store.listBuyers(),
  ]);
  return Response.json({ runs: buildPickupRuns({ orders, listings, farmers, buyers }) });
}
