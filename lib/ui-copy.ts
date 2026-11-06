// On-screen labels for the farmer screen (kept short; most meaning comes from icons + voice).
import type { Lang } from "./types";

const UI = {
  title: { hi: "अपनी फसल बेचें", pa: "ਆਪਣੀ ਫ਼ਸਲ ਵੇਚੋ" },
  tapToSpeak: { hi: "बोलने के लिए दबाएँ", pa: "ਬੋਲਣ ਲਈ ਦਬਾਓ" },
  recording: { hi: "बोलिए… रोकने के लिए दबाएँ", pa: "ਬੋਲੋ… ਰੋਕਣ ਲਈ ਦਬਾਓ" },
  thinking: { hi: "समझ रहे हैं…", pa: "ਸਮਝ ਰਹੇ ਹਾਂ…" },
  confirm: { hi: "हाँ, सही है", pa: "ਹਾਂ, ਠੀਕ ਹੈ" },
  retry: { hi: "फिर से", pa: "ਫਿਰ ਤੋਂ" },
  type: { hi: "लिखें", pa: "ਲਿਖੋ" },
  send: { hi: "भेजें", pa: "ਭੇਜੋ" },
  listen: { hi: "सुनें", pa: "ਸੁਣੋ" },
  orders: { hi: "आपके ऑर्डर", pa: "ਤੁਹਾਡੇ ਆਰਡਰ" },
  noOrders: { hi: "अभी कोई ऑर्डर नहीं", pa: "ਹਾਲੇ ਕੋਈ ਆਰਡਰ ਨਹੀਂ" },
  listed: { hi: "फसल लिस्ट हो गई ✓", pa: "ਫ਼ਸਲ ਲਿਸਟ ਹੋ ਗਈ ✓" },
  newListing: { hi: "नई फसल", pa: "ਨਵੀਂ ਫ਼ਸਲ" },
  micDenied: { hi: "माइक नहीं चला — लिखकर भेजें", pa: "ਮਾਈਕ ਨਹੀਂ ਚੱਲਿਆ — ਲਿਖ ਕੇ ਭੇਜੋ" },
  tapField: { hi: "खाली खाने पर दबाकर बोलें", pa: "ਖਾਲੀ ਖਾਨੇ ਤੇ ਦਬਾ ਕੇ ਬੋਲੋ" },
  crop: { hi: "फसल", pa: "ਫ਼ਸਲ" },
  quantity: { hi: "मात्रा", pa: "ਮਾਤਰਾ" },
  price: { hi: "दाम", pa: "ਭਾਅ" },
  village: { hi: "गाँव", pa: "ਪਿੰਡ" },
  pickup: { hi: "पिकअप", pa: "ਪਿਕਅੱਪ" },
  kg: { hi: "किलो", pa: "ਕਿੱਲੋ" },
  perKg: { hi: "/किलो", pa: "/ਕਿੱਲੋ" },
  placeholder: { hi: "जैसे: सौ किलो टमाटर, सोलह रुपये किलो", pa: "ਜਿਵੇਂ: ਸੌ ਕਿੱਲੋ ਟਮਾਟਰ, ਸੋਲਾਂ ਰੁਪਏ ਕਿੱਲੋ" },
} satisfies Record<string, Record<Lang, string>>;

export type UiKey = keyof typeof UI;
export const ui = (key: UiKey, lang: Lang) => UI[key][lang];
