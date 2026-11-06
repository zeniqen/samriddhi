import { getStore } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const n = await store.getNotification(id);
  if (!n) return Response.json({ error: "not found" }, { status: 404 });
  await store.saveNotification({ ...n, heard: true });
  return new Response(null, { status: 204 });
}
