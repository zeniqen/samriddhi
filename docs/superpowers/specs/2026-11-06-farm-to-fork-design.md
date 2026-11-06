# Farm-to-Fork Voice Marketplace — Design Spec

- **Date:** 2026-11-06
- **Event:** Arthakram Rapid Prototyping Hackathon, Problem Statement 4 ("The Farm-to-Fork Gap")
- **Working title:** Kisan Awaaz (placeholder — rename freely)
- **Team:** 3 members, 1 developer. Build with Claude (Claude Code); runtime AI via Ollama Cloud.
- **Build budget:** plan for 10–14 h (deadline extended to "tomorrow"; exact cutoff unconfirmed).

---

## 1. Goal and success criteria

**Problem (reframed):** A farmer who cannot read English has no way to reach city buyers or see a fair price without depending on a chain that dictates the price. Middlemen provide real services (transport, storage, credit), so they are re-roled as paid pickup partners, not removed.

**Product:** A Hindi-first, voice-first web app. A farmer speaks a produce listing in Hindi or Punjabi, an AI conversation fills any gaps, the farmer hears it read back and confirms. A city buyer (restaurant / kirana) browses listings, sees a transparent per-kg price split, and orders. The farmer hears an order confirmation in their language.

**Success = all of these, live on stage, on two devices:**
1. Farmer completes a Hindi listing by voice with no typing, in under ~60 s.
2. Buyer sees it, sees the per-kg split, and orders.
3. Farmer hears a correct confirmation (correct kg, ₹/kg, total ₹, pickup date) in Hindi.
4. A Punjabi listing works the same way (10-second demo moment).
5. Every number in the price split is labelled as an assumption.

**Scope decisions (fixed):**
- Corridor: Ludhiana-area villages → Ludhiana city buyers.
- Crop: tomatoes (crop field kept generic; seed data tomatoes only).
- Buyers: restaurants and kiranas. Not households.
- Middlemen: partner model — paid pickup partners, fee shown openly.
- No login/OTP, no real payments, no real SMS/WhatsApp, no maps, no price prediction, no native app.

---

## 2. Architecture

One **Next.js (App Router, TypeScript) + Tailwind** app, deployed on **Vercel** (HTTPS needed for mic access).

### Screens
| Route | Device | Purpose |
|---|---|---|
| `/farmer` | Phone | Language pick (हिंदी / ਪੰਜਾਬੀ), mic button, live listing card, ✅ confirm, notifications with 🔊 |
| `/buyer` | Laptop | Listings grid, listing detail with per-kg split, order form |
| `/ops` | Laptop | **Tier 3.** "Verify" tap on new listings |

### API routes (all provider keys server-side only)
| Route | Job |
|---|---|
| `POST /api/turn` | Audio + sessionId + lang → Sarvam speech→English → Ollama conversation step → validated state + local-language reply text |
| `POST /api/speak` | Text + lang → Sarvam TTS → audio |
| `GET/POST /api/listings` | List / create listings |
| `POST /api/orders` | Create order, freeze price split, create farmer notification |
| `GET /api/notifications?farmerId=` | Farmer phone polls every 3 s |

### Modules (`lib/`)
| Module | Responsibility | Depends on |
|---|---|---|
| `sarvam.ts` | Only code that calls Sarvam: speech→English, translate, TTS | Sarvam API |
| `llm.ts` | Ollama Cloud call with JSON output + 8 s timeout; rule-based fallback parser | Ollama API |
| `conversation.ts` | Tracks filled fields, decides next step, merges validated updates | `llm`, `validate` |
| `factcheck.ts` | Number extraction/comparison; number masking for translation | — |
| `templates.ts` | Fixed hi/pa sentences (fallbacks) | — |
| `pricing.ts` | Per-kg split; single source of truth | — |
| `validate.ts` | Field range/list checks, village fuzzy match | seed village list |
| `store.ts` | Read/write records | Upstash Redis |

Swapping Sarvam or Ollama = editing one module.

---

## 3. Data model

Storage: **Upstash Redis** (via Vercel Marketplace; confirm at setup). Each record stored as JSON.

| Record | Fields |
|---|---|
| Farmer | `id, name, village, lang ('hi'|'pa'), phone` (fictional) |
| Listing | `id, farmerId, crop, quantityKg, remainingKg, askPricePerKg, village, pickupDate (ISO), status ('live'|'verified'|'sold_out'), transcriptOriginal, transcriptEnglish, createdAt` |
| Buyer | `id, name, type ('restaurant'|'kirana'), area` |
| Order | `id, listingId, buyerId, quantityKg, split (frozen PriceSplit), status ('placed'), createdAt` |
| Notification | `id, farmerId, orderId, textEnglish, textLocal, heard, createdAt` |
| Conversation | `sessionId, lang, fields (partial listing), history (last 6 turns)` |

### Price split (`pricing.ts`) — all figures are assumptions owned by the business teammates
```
farmer ask            ₹16.00 /kg   (set by farmer)
+ pickup partner      ₹ 4.00 /kg   (re-roled middleman, disclosed)
+ spoilage buffer     ₹ 3.00 /kg
+ platform fee (6%)   ₹ 1.50 /kg   (blueprint range 5–8%; 6% of base)
= buyer price         ₹24.50 /kg   (vs ~₹30+ via current chain — assumption)
```
Platform fee = 6% of (farmer ask + partner + buffer), rounded to ₹0.50. Split is frozen on the order at creation.

### Seed data (fictional)
- 5 farmers around Ludhiana (3 Hindi-preferring, 2 Punjabi-preferring)
- 8 tomato listings
- 3 buyers: 2 restaurants, 1 kirana

---

## 4. Conversation flow (approach B + AI conversation)

Ollama works **only in English**. Sarvam translates in both directions.

### One turn
1. Farmer taps 🎤, speaks, taps to stop (MediaRecorder).
2. `/api/turn`: Sarvam speech → English text (original-language transcript also kept when available).
3. Ollama receives: English text, current filled fields, today's date, allowed crops, known villages. Returns JSON:
   `{ updates: {crop?, quantityKg?, askPricePerKg?, village?, pickupDate?}, replyEnglish, intent: 'fill'|'question'|'confirm'|'correct' }`
4. `validate.ts` checks each update: kg 1–10,000; ₹1–200/kg; pickup date today…+14 days; crop in list; village fuzzy-matched to known list. Invalid updates dropped.
5. Card on screen updates.
6. When all fields are filled: Ollama's read-back reply → **fact-check** → translate (numbers masked) → TTS.
7. ✅ tap or "हाँ / ਹਾਂ" with intent `confirm` → listing saved as `live`.

### Fact-check (`factcheck.ts`)
- **Check:** extract all numbers (and dates) from `replyEnglish`; every one must match a stored value. Any mismatch → use the `templates.ts` sentence instead.
- **Protect:** replace numbers with `{{N1}}…` before Sarvam translation; restore after.
- Applies to: read-back, order confirmation. Plain follow-up questions ("how many kilos?") skip the number check.

### Order confirmation
Buyer orders → `/api/orders` freezes split → Ollama writes a warm English confirmation from order facts → fact-check → masked translation → stored as Notification → farmer phone polls, shows card + **🔊 सुनें** button (browsers block audio without a tap).

### Failure handling
| Failure | Behaviour |
|---|---|
| Empty/garbled STT | Template "फिर से बोलिए" / Punjabi equivalent + ⌨️ type-instead |
| Ollama timeout (8 s) / bad JSON | Rule-based parser on English text; template asks for next missing field |
| Translation fails | Template sentence in local language |
| TTS fails | Browser `speechSynthesis`; text always on screen |
| 6 turns without completion | Show card in tap-to-fill mode |

---

## 5. Testing

**Unit tests (Vitest), pure functions only:**
1. `pricing` — split sums; freezing
2. `factcheck` — catches wrong kg / ₹ / date; passes correct reply
3. Number masking — round-trip lossless
4. Fallback parser — 10 English sentences → correct fields
5. `validate` — rejects 0 kg, ₹500/kg, date +30 days

**Setup spikes (~45 min, before building):**
- Sarvam: one Hindi + one Punjabi sentence → check English text and TTS audio; confirm accepted audio format (browser WebM) and free-tier limits.
- Ollama Cloud: same 5 English sentences through 2–3 models → pick the one with valid JSON and lowest latency.

**Manual end-to-end:** deployed URL, real phone (farmer) + laptop (buyer).

---

## 6. Demo plan (~90 s inside the 4-min pitch)
1. Hindi farmer speaks a listing → AI asks one follow-up → answer → read-back → ✅
2. Buyer laptop: listing appears with split → order 100 kg
3. Farmer phone: notification → 🔊 → Hindi confirmation
4. Punjabi: switch language, one sentence, card fills (10 s)

**Fallbacks:** seed data always present; ⌨️ typed input; recorded backup video after final deploy.

---

## 7. Priority tiers and time budget (~12 h)
| Block | Hours | Contents |
|---|---|---|
| Spikes + setup | 1 | Sarvam/Ollama checks, Next.js scaffold, Redis, deploy pipeline |
| **Tier 1** | 6 | Farmer voice flow, AI conversation, fact-check, buyer page, orders, notifications, seed data, Hindi + Punjabi |
| Tier 2 | 2 | Crop pictures, fair-price hint ("आज का भाव ₹12–18", sample data) |
| Ship | 1.5 | Deploy, 2-device test, backup video, rehearsal |
| Buffer / Tier 3 | 1.5 | `/ops` verify screen |

## 8. Out of scope
Login/OTP, payments, real SMS/WhatsApp, maps/routing, price prediction, households, native app, ratings, chat between users, more than two languages.

## 9. Open items (non-blocking)
- Exact submission deadline (assumed 10–14 h).
- Sarvam free-tier limits and audio formats (setup spike).
- Ollama model choice (setup spike).
- Final product name.
- Business teammates to confirm price-split figures and the "current chain ~₹30+" assumption.
