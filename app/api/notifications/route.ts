import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const farmerId = new URL(req.url).searchParams.get("farmerId");
  if (!farmerId) return Response.json({ error: "farmerId required" }, { status: 400 });
  return Response.json({ notifications: await getStore().listNotifications(farmerId) });
}
