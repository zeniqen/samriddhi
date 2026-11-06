// The only code that talks to Sarvam AI. Endpoints per docs.sarvam.ai (checked 2026-11-06).
import type { Lang } from "./types";

export class SarvamError extends Error {}

const BASE = "https://api.sarvam.ai";
const TIMEOUT_MS = 10_000;
export const LANG_CODE: Record<Lang, string> = { hi: "hi-IN", pa: "pa-IN" };

async function call(path: string, body: FormData | object): Promise<Record<string, unknown>> {
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY ?? "",
        ...(isForm ? {} : { "Content-Type": "application/json" }),
      },
      body: isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new SarvamError(`Sarvam ${path} failed: ${(e as Error).message}`);
  }
  if (!res.ok) throw new SarvamError(`Sarvam ${path} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function stt(audio: Blob, mode: "translate" | "transcribe"): Promise<string> {
  const form = new FormData();
  // Browsers label recordings "audio/webm;codecs=opus"; Sarvam accepts the same bytes only as a bare
  // type ("audio/webm") and rejects anything with parameters (HTTP 400 "Invalid file type").
  const type = audio.type.split(";")[0].trim() || "audio/webm";
  const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"; // iPhone records mp4
  form.append("file", new Blob([await audio.arrayBuffer()], { type }), `speech.${ext}`);
  form.append("model", "saaras:v4");
  form.append("mode", mode);
  const body = await call("/speech-to-text", form);
  return typeof body.transcript === "string" ? body.transcript : "";
}

/** English text for the LLM, plus the original-language transcript when available. */
export async function speechToEnglish(audio: Blob, _lang: Lang): Promise<{ english: string; original: string }> {
  const [english, original] = await Promise.allSettled([stt(audio, "translate"), stt(audio, "transcribe")]);
  if (english.status === "rejected") throw english.reason;
  return { english: english.value, original: original.status === "fulfilled" ? original.value : "" };
}

async function translate(input: string, source: string, target: string): Promise<string> {
  const body = await call("/translate", {
    input,
    source_language_code: source,
    target_language_code: target,
    model: "sarvam-translate:v1",
  });
  if (typeof body.translated_text !== "string") throw new SarvamError("Sarvam translate returned no text");
  return body.translated_text;
}

export const translateFromEnglish = (text: string, lang: Lang) => translate(text, "en-IN", LANG_CODE[lang]);
export const translateToEnglish = (text: string, lang: Lang) => translate(text, LANG_CODE[lang], "en-IN");

/** Returns base64 WAV. */
export async function tts(text: string, lang: Lang): Promise<string> {
  const body = await call("/text-to-speech", {
    text,
    language_code: LANG_CODE[lang],
    model: process.env.SARVAM_TTS_MODEL ?? "bulbul:v4-flash",
    ...(process.env.SARVAM_TTS_SPEAKER && { speaker: process.env.SARVAM_TTS_SPEAKER }),
  });
  const audios = body.audios;
  if (!Array.isArray(audios) || typeof audios[0] !== "string") throw new SarvamError("Sarvam TTS returned no audio");
  return audios[0];
}
