// Round-trip check with no microphone: Sarvam speaks a sentence, then Sarvam hears it back.
//   npx tsx --env-file=.env.local scripts/smoke-sarvam.ts
import { speechToEnglish, translateFromEnglish, tts } from "../lib/sarvam";
import type { Lang } from "../lib/types";

const SENTENCES: Record<Lang, string> = {
  hi: "सौ किलो टमाटर, सोलह रुपये किलो, गाँव दाखा, परसों पिकअप",
  pa: "ਸੌ ਕਿੱਲੋ ਟਮਾਟਰ, ਸੋਲਾਂ ਰੁਪਏ ਕਿੱਲੋ, ਪਿੰਡ ਦਾਖਾ, ਪਰਸੋਂ ਪਿਕਅੱਪ",
};

for (const lang of ["hi", "pa"] as const) {
  try {
    let t0 = Date.now();
    const wav = await tts(SENTENCES[lang], lang);
    console.log(`[${lang}] TTS ok in ${Date.now() - t0} ms (${Math.round((wav.length * 3) / 4 / 1024)} KB)`);
    t0 = Date.now();
    const blob = new Blob([Buffer.from(wav, "base64")], { type: "audio/wav" });
    const heard = await speechToEnglish(blob, lang);
    console.log(`[${lang}] STT ok in ${Date.now() - t0} ms → EN: "${heard.english}" | orig: "${heard.original}"`);
    t0 = Date.now();
    const back = await translateFromEnglish("You have {{N1}} kg of tomatoes. Is this correct?", lang);
    console.log(`[${lang}] translate ok in ${Date.now() - t0} ms → "${back}"`);
  } catch (e) {
    console.log(`[${lang}] FAILED:`, (e as Error).message);
  }
}
