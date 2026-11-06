// A farmer takes down a listing they made by mistake. The record stays (status "removed") so orders
// already placed against it keep their crop, village and pickup date for the buyer and pickup partner.
import type { Store } from "./store";

export type RemoveResult = { ok: true } | { ok: false; status: 403 | 404; error: string };

export function removeListing(input: { listingId: string; farmerId: string }, store: Store): Promise<RemoveResult> {
  // Same lock as ordering, so a buyer can't buy from a listing in the moment it's being removed.
  return store.withListingLock(input.listingId, async (): Promise<RemoveResult> => {
    const listing = await store.getListing(input.listingId);
    if (!listing || listing.status === "removed") return { ok: false, status: 404, error: "Listing not found" };
    if (listing.farmerId !== input.farmerId) return { ok: false, status: 403, error: "Not your listing" };
    await store.saveListing({ ...listing, status: "removed" });
    return { ok: true };
  });
}
