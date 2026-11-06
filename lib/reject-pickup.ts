// A pickup partner turns down a job. The order is kept and flagged; in a full system the job is
// then offered to the next partner nearby.
import type { Store } from "./store";

export type RejectResult = { ok: true } | { ok: false; status: 404; error: string };

export async function rejectPickup(orderId: string, store: Store): Promise<RejectResult> {
  const order = await store.getOrder(orderId);
  if (!order) return { ok: false, status: 404, error: "Order not found" };
  if (order.partnerStatus !== "rejected") await store.saveOrder({ ...order, partnerStatus: "rejected" });
  return { ok: true };
}
