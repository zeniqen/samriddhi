import { tts } from "@/lib/sarvam";
import type { Lang } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.slice(0, 1000) : "";
  const lang: Lang = body.lang === "pa" ? "pa" : "hi";
  if (!text) return Response.json({ error: "text required" }, { status: 400 });
  try {
    return Response.json({ audioBase64: await tts(text, lang) });
  } catch (e) {
    console.error("[speak] TTS failed", e);
    // Client falls back to the browser's speechSynthesis.
    return Response.json({ error: "tts unavailable" }, { status: 502 });
  }
}
