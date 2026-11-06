// Throwaway provider check. Usage:
//   npx tsx --env-file=.env.local scripts/spike-sarvam.ts <audio-file> <hi-IN|pa-IN>
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY = process.env.SARVAM_API_KEY;
const BASE = "https://api.sarvam.ai";
const [file, lang = "hi-IN"] = process.argv.slice(2);
if (!KEY || !file) throw new Error("Need SARVAM_API_KEY and an audio file path");

async function stt(mode: "translate" | "transcribe") {
  const form = new FormData();
  form.append("file", new Blob([await readFile(file)]), path.basename(file));
  form.append("model", "saaras:v4");
  form.append("mode", mode);
  const t0 = Date.now();
  const res = await fetch(`${BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": KEY! },
    body: form,
  });
  const body = await res.json();
  console.log(`STT ${mode}: ${res.status} in ${Date.now() - t0} ms`, body);
  return body.transcript as string;
}

async function translate(input: string) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "api-subscription-key": KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      source_language_code: "en-IN",
      target_language_code: lang,
      model: "sarvam-translate:v1",
    }),
  });
  const body = await res.json();
  console.log(`translate: ${res.status} in ${Date.now() - t0} ms`, body);
  return body.translated_text as string;
}

async function tts(text: string) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/text-to-speech`, {
    method: "POST",
    headers: { "api-subscription-key": KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ text, language_code: lang, model: process.env.SARVAM_TTS_MODEL ?? "bulbul:v4-flash" }),
  });
  const body = await res.json();
  console.log(`tts: ${res.status} in ${Date.now() - t0} ms`, res.ok ? `${body.audios?.length} chunk(s)` : body);
  if (res.ok) await writeFile("out.wav", Buffer.from(body.audios.join(""), "base64"));
}

const [english] = await Promise.all([stt("translate"), stt("transcribe")]);
const local = await translate(`I heard: ${english}. Is that right?`);
await tts(local);
console.log("Done. Play out.wav");
