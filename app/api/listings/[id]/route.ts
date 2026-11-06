import { removeListing } from "@/lib/remove-listing";
import { getStore } from "@/lib/store";

/** The farmer deletes one of their own listings. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const farmerId = new URL(req.url).searchParams.get("farmerId") ?? "";
  const result = await removeListing({ listingId: id, farmerId }, getStore());
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(null, { status: 204 });
}
