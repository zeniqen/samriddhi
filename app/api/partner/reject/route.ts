import { rejectPickup } from "@/lib/reject-pickup";
import { getStore } from "@/lib/store";

/** The pickup partner turns down one pickup; it goes to the next partner. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await rejectPickup(String(body.orderId ?? ""), getStore());
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(null, { status: 204 });
}
