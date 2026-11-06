# Farm-to-Fork Voice Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Hindi/Punjabi voice-first web app where a farmer speaks a produce listing, a city buyer orders it with a transparent per-kg split, and the farmer hears a fact-checked confirmation.

**Architecture:** One Next.js App Router app on Vercel. Sarvam converts speech → English and English → Hindi/Punjabi text/audio; Ollama Cloud runs the English-only conversation and returns JSON; pure `lib/` modules (pricing, validate, factcheck, templates, fallback parser) guard every number the farmer hears. Upstash Redis stores JSON records, with an in-memory store for local dev and tests.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Vitest, Upstash Redis (`@upstash/redis`), Sarvam AI REST API, Ollama Cloud REST API, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-06-farm-to-fork-design.md`

## Global Constraints

- Ollama only ever sees and writes **English**; Sarvam handles all Hindi/Punjabi conversion.
- Provider keys are **server-side only** (`SARVAM_API_KEY`, `OLLAMA_API_KEY`); never `NEXT_PUBLIC_`.
- Every number the farmer hears in a read-back or order confirmation passes `checkReply`; on failure the template sentence is used.
- Numbers are masked (`{{N1}}`…) before Sarvam translation and restored after.
- Field limits: kg 1–10,000; ₹1–200 per kg; pickup date today…today+14 (IST); crop ∈ `['tomato','onion','potato']`; village fuzzy-matched to the seed village list.
- Price split: partner ₹4/kg, buffer ₹3/kg, platform 6% of (ask + partner + buffer) rounded to nearest ₹0.50; frozen on the order.
- Ollama timeout 8 s; farmer notification poll every 3 s; tap-to-fill after 6 turns.
- All dates are computed in `Asia/Kolkata`.
- No login, payments, real SMS, maps. All people and places in seed data are fictional.
- Languages: `'hi' | 'pa'` only.

## Review Focus

1. **Number words after translation** ("one hundred kilos", "sixteen rupees") — fallback parser must read them; pinned in Task 5.
2. **Relative dates near midnight / server in UTC** ("day after tomorrow" at 11:30 PM IST) — dates resolve in IST; pinned in Task 2.
3. **Buyer orders more kg than remain** (or two buyers race) — order rejected with 409, `remainingKg` never negative; pinned in Task 8.
4. **Derived numbers in a correct reply** (total ₹1,600 = 100 × 16, "7 November") — fact-check must pass them, not false-reject; pinned in Task 4.
5. **Price stated per quintal** ("1600 per quintal") — converted to ₹16/kg, not rejected as ₹1600/kg; pinned in Task 5.

---

## File Structure

```
lib/types.ts            shared types (Task 1)
lib/dates.ts            IST date helpers (Task 2)
lib/seed-data.ts        villages, farmers, buyers, listings (Task 2)
lib/pricing.ts          price split (Task 3)
lib/validate.ts         field checks + village match (Task 2)
lib/factcheck.ts        number extract/check/mask (Task 4)
lib/fallback-parser.ts  rule-based English parser (Task 5)
lib/templates.ts        fixed hi/pa sentences (Task 5)
lib/sarvam.ts           Sarvam client (Task 6)
lib/llm.ts              Ollama client (Task 6)
lib/localize.ts         factcheck → mask → translate → unmask (Task 7)
lib/conversation.ts     turn logic (Task 7)
lib/store.ts            Store interface, memory + Redis impls (Task 8)
lib/orders.ts           placeOrder service (Task 8)
app/api/*/route.ts      API routes (Task 9)
app/farmer/page.tsx     farmer UI (Task 10)
app/buyer/page.tsx      buyer UI (Task 11)
scripts/spike-*.ts      provider checks (Task 1)
tests/*.test.ts         Vitest
```

---

### Task 1: Scaffold, shared types, provider spikes

**Files:**
- Create: project via `create-next-app`, `vitest.config.ts`, `.env.example`, `lib/types.ts`, `scripts/spike-sarvam.ts`, `scripts/spike-ollama.ts`
- Modify: spec §9 (record spike outcomes)

**Interfaces:**
- Produces (`lib/types.ts`):
```ts
export type Lang = 'hi' | 'pa';
export type Crop = 'tomato' | 'onion' | 'potato';
export type ListingFields = { crop?: Crop; quantityKg?: number; askPricePerKg?: number; village?: string; pickupDate?: string /* YYYY-MM-DD */ };
export type PriceSplit = { farmerPerKg: number; partnerPerKg: number; bufferPerKg: number; platformPerKg: number; buyerPerKg: number };
export type Farmer = { id: string; name: string; village: string; lang: Lang; phone: string };
export type Buyer = { id: string; name: string; type: 'restaurant' | 'kirana'; area: string };
export type Listing = Required<ListingFields> & { id: string; farmerId: string; remainingKg: number; status: 'live' | 'verified' | 'sold_out'; transcriptOriginal: string; transcriptEnglish: string; createdAt: string };
export type Order = { id: string; listingId: string; buyerId: string; quantityKg: number; split: PriceSplit; status: 'placed'; createdAt: string };
export type Notification = { id: string; farmerId: string; orderId: string; textEnglish: string; textLocal: string; heard: boolean; createdAt: string };
export type Intent = 'fill' | 'question' | 'confirm' | 'correct';
export type LlmTurn = { updates: ListingFields; replyEnglish: string; intent: Intent };
export type ConversationState = { sessionId: string; lang: Lang; farmerId: string; fields: ListingFields; history: { role: 'farmer' | 'assistant'; text: string }[]; turns: number; transcriptOriginal: string; transcriptEnglish: string };
```

- [ ] **Step 1: Scaffold**

Run: `npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes && npm i @upstash/redis && npm i -D vitest tsx`
Add `"test": "vitest run"` to `package.json`. `vitest.config.ts` sets `resolve.alias['@']` to the project root.

- [ ] **Step 2: Env + types**

`.env.example`: `SARVAM_API_KEY=`, `OLLAMA_API_KEY=`, `OLLAMA_BASE_URL=https://ollama.com`, `OLLAMA_MODEL=`, `UPSTASH_REDIS_REST_URL=`, `UPSTASH_REDIS_REST_TOKEN=`. Copy to `.env.local` (gitignored). Write `lib/types.ts` as above.

- [ ] **Step 3: Sarvam spike** — `scripts/spike-sarvam.ts <audio-file> <hi-IN|pa-IN>`

Calls speech→English translate, then `translate` English→the language, then TTS; writes `out.wav`. Confirm against docs.sarvam.ai: endpoint paths, header name (`api-subscription-key`), model names, accepted audio formats (does it accept browser **WebM/Opus**, or only WAV?), free-tier limits. Record one Hindi and one Punjabi phone recording of: "सौ किलो टमाटर, सोलह रुपये किलो, गाँव दाखा, परसों पिकअप" / Punjabi equivalent.
Run: `npx tsx --env-file=.env.local scripts/spike-sarvam.ts hi.webm hi-IN`
Expected: English text containing 100, tomato, 16, Dakha, day after tomorrow; playable `out.wav`.

- [ ] **Step 4: Ollama spike** — `scripts/spike-ollama.ts`

POST `${OLLAMA_BASE_URL}/api/chat` with `Authorization: Bearer`, `stream:false`, `format` = JSON schema of `LlmTurn`. Run the same 5 English sentences (incl. one per Review Focus 1, 2, 5) through 2–3 cloud models; print JSON validity + latency.
Expected: pick the model with 5/5 valid JSON and lowest median latency; set `OLLAMA_MODEL`.

- [ ] **Step 5: Record outcomes + commit**

Write results (audio format answer, chosen model, latencies) into spec §9.
```bash
git init && git add -A && git commit -m "chore: scaffold app, shared types, provider spikes"
```

---

### Task 2: Dates, seed data, validation

**Files:** Create `lib/dates.ts`, `lib/seed-data.ts`, `lib/validate.ts`; Test `tests/validate.test.ts`

**Interfaces:**
- Produces: `todayIST(now?: Date): string`; `addDays(isoDate: string, n: number): string`; `VILLAGES: string[]`; `SEED_FARMERS: Farmer[]`; `SEED_BUYERS: Buyer[]`; `SEED_LISTINGS: Listing[]`; `CROPS: Crop[]`; `matchVillage(name: string): string | null`; `validateUpdates(u: ListingFields, today: string): { accepted: ListingFields; rejected: (keyof ListingFields)[] }`

Seed: villages `['Dakha','Mullanpur','Sahnewal','Doraha','Raikot','Jagraon','Machhiwara','Payal']` (real place names in Ludhiana district; people fictional). 5 farmers (3 `hi`, 2 `pa`), 3 buyers (2 restaurant, 1 kirana, Ludhiana areas), 8 tomato listings with ask ₹12–18/kg, 50–300 kg, pickup today+1…+4.

- [ ] **Step 1: Failing tests**
```ts
test('todayIST rolls over at IST midnight', () => {
  expect(todayIST(new Date('2026-11-06T18:45:00Z'))).toBe('2026-11-07'); // 00:15 IST
});
test('rejects out-of-range fields', () => {
  const r = validateUpdates({ quantityKg: 0, askPricePerKg: 500, pickupDate: '2026-12-06' }, '2026-11-06');
  expect(r.accepted).toEqual({});
  expect(r.rejected.sort()).toEqual(['askPricePerKg','pickupDate','quantityKg']);
});
test('accepts valid fields and normalises village', () => {
  const r = validateUpdates({ crop: 'tomato', quantityKg: 100, askPricePerKg: 16, village: 'dakha village', pickupDate: '2026-11-08' }, '2026-11-06');
  expect(r.accepted.village).toBe('Dakha'); expect(r.rejected).toEqual([]);
});
test('matchVillage tolerates one-letter typos, rejects unknown', () => {
  expect(matchVillage('Dhaka')).toBe('Dakha'); expect(matchVillage('Mumbai')).toBeNull();
});
```
- [ ] **Step 2:** `npm test -- validate` → FAIL (modules missing)
- [ ] **Step 3: Implement.** `todayIST` via `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'})`. `matchVillage`: lowercase, strip the words "village"/"pind"/"gaon", then exact or Levenshtein ≤ 2 against `VILLAGES`. Unknown crop strings are rejected.
- [ ] **Step 4:** `npm test -- validate` → PASS
- [ ] **Step 5:** `git commit -am "feat: dates, seed data, field validation"` (add new files first)

---

### Task 3: Pricing

**Files:** Create `lib/pricing.ts`; Test `tests/pricing.test.ts`

**Interfaces:** Produces `PARTNER_FEE_PER_KG = 4`, `BUFFER_PER_KG = 3`, `PLATFORM_RATE = 0.06`; `computeSplit(askPricePerKg: number): PriceSplit`; `orderTotals(split: PriceSplit, kg: number): { buyerTotal: number; farmerTotal: number }`

- [ ] **Step 1: Failing tests**
```ts
test('spec example: ask 16 → buyer 24.5', () => {
  expect(computeSplit(16)).toEqual({ farmerPerKg:16, partnerPerKg:4, bufferPerKg:3, platformPerKg:1.5, buyerPerKg:24.5 });
});
test('parts always sum to buyer price', () => {
  for (const ask of [1, 8, 12.5, 37, 200]) { const s = computeSplit(ask);
    expect(s.farmerPerKg + s.partnerPerKg + s.bufferPerKg + s.platformPerKg).toBeCloseTo(s.buyerPerKg); }
});
test('totals', () => { expect(orderTotals(computeSplit(16), 100)).toEqual({ buyerTotal: 2450, farmerTotal: 1600 }); });
```
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (platform = `Math.round(base*0.06*2)/2`). **Step 4:** run → PASS. **Step 5:** commit `feat: price split`.

---

### Task 4: Fact-check and number masking

**Files:** Create `lib/factcheck.ts`; Test `tests/factcheck.test.ts`

**Interfaces:** Produces `extractNumbers(text: string): number[]` (handles `1,600`, `24.5`, `₹16`); `allowedNumbers(f: { quantityKg: number; pricePerKg: number; total?: number; pickupDate: string }): number[]` (includes day-of-month, month number, year); `checkReply(replyEnglish: string, allowed: number[]): boolean`; `maskNumbers(text: string): { masked: string; values: string[] }`; `unmaskNumbers(masked: string, values: string[]): string`

- [ ] **Step 1: Failing tests**
```ts
const allowed = allowedNumbers({ quantityKg: 100, pricePerKg: 16, total: 1600, pickupDate: '2026-11-07' });
test('passes correct reply with derived total and date', () => {
  expect(checkReply('Hotel Sagar bought 100 kg at ₹16/kg. You get ₹1,600. Pickup 7 November 2026.', allowed)).toBe(true);
});
test('fails on wrong price', () => { expect(checkReply('100 kg at ₹18 per kg', allowed)).toBe(false); });
test('fails on wrong quantity', () => { expect(checkReply('You sold 1000 kg', allowed)).toBe(false); });
test('mask round-trip is lossless', () => {
  const s = 'You get ₹1,600 for 100 kg on 7 Nov'; const m = maskNumbers(s);
  expect(m.masked).not.toMatch(/\d/); expect(unmaskNumbers(m.masked, m.values)).toBe(s);
});
test('unmask survives translator reordering placeholders', () => {
  expect(unmaskNumbers('{{N2}} किलो, ₹{{N1}}', ['16','100'])).toBe('100 किलो, ₹16');
});
```
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (regex `/\d[\d,]*(\.\d+)?/g`, strip commas). **Step 4:** run → PASS. **Step 5:** commit `feat: fact-check and number masking`.

---

### Task 5: Fallback parser and templates

**Files:** Create `lib/fallback-parser.ts`, `lib/templates.ts`; Test `tests/fallback-parser.test.ts`, `tests/templates.test.ts`

**Interfaces:**
- Produces `parseFallback(english: string, today: string): ListingFields`
- Produces `type TemplateKey = 'askAgain'|'askCrop'|'askQuantity'|'askPrice'|'askVillage'|'askPickupDate'|'readBack'|'listingLive'|'orderConfirmed'`; `TEMPLATE_KEYS: TemplateKey[]`; `t(key: TemplateKey, lang: Lang, vars?: Record<string, string|number>): string`; `cropName(crop: Crop, lang: Lang): string`; `nextQuestionKey(f: ListingFields): TemplateKey | null`

- [ ] **Step 1: Failing parser tests** (today = `'2026-11-06'`)
```ts
test.each([
  ['100 kg tomatoes, 16 rupees per kg, village Dakha, pickup day after tomorrow', { crop:'tomato', quantityKg:100, askPricePerKg:16, village:'Dakha', pickupDate:'2026-11-08' }],
  ['one hundred kilos of tomato at sixteen rupees a kilo', { crop:'tomato', quantityKg:100, askPricePerKg:16 }],
  ['two quintals of tomatoes', { crop:'tomato', quantityKg:200 }],
  ['price 1600 per quintal', { askPricePerKg:16 }],
  ['fifty kg', { quantityKg:50 }],
  ['pick it up tomorrow', { pickupDate:'2026-11-07' }],
  ['I am from Sahnewal', { village:'Sahnewal' }],
  ['onions 300 kg', { crop:'onion', quantityKg:300 }],
  ['twelve and a half rupees per kg', { askPricePerKg:12.5 }],
  ['hello how are you', {}],
])('%s', (s, expected) => expect(parseFallback(s, '2026-11-06')).toEqual(expected));
```
- [ ] **Step 2: Failing template tests**
```ts
test('readBack fills vars in Hindi', () => {
  expect(t('readBack','hi',{kg:100,crop:'टमाटर',price:16,village:'दाखा',date:'8 नवंबर'})).toContain('100 किलो टमाटर');
});
test('every key exists in both languages', () => { for (const k of TEMPLATE_KEYS) { expect(t(k,'hi')).toBeTruthy(); expect(t(k,'pa')).toBeTruthy(); } });
test('nextQuestionKey order: crop → quantity → price → village → date → null', () => {
  expect(nextQuestionKey({})).toBe('askCrop');
  expect(nextQuestionKey({ crop:'tomato', quantityKg:1, askPricePerKg:1, village:'Dakha' })).toBe('askPickupDate');
});
```
- [ ] **Step 3: Run** → FAIL
- [ ] **Step 4: Implement.** Parser: number words 1–1000 incl. "and a half"; units kg/kilo(s)/quintal(=100 kg); price "per quintal" ÷ 100; "tomorrow" +1, "day after tomorrow" +2; villages via `matchVillage` on each word. Templates — exact copy (Punjabi teammate to proofread):

| key | hi | pa |
|---|---|---|
| askAgain | माफ़ कीजिए, फिर से बोलिए। | ਮਾਫ਼ ਕਰਨਾ, ਫਿਰ ਤੋਂ ਬੋਲੋ। |
| askCrop | कौन सी फसल बेचनी है? | ਕਿਹੜੀ ਫ਼ਸਲ ਵੇਚਣੀ ਹੈ? |
| askQuantity | कितने किलो हैं? | ਕਿੰਨੇ ਕਿੱਲੋ ਹਨ? |
| askPrice | एक किलो का कितना दाम चाहिए? | ਇੱਕ ਕਿੱਲੋ ਦਾ ਕਿੰਨਾ ਭਾਅ ਚਾਹੀਦਾ ਹੈ? |
| askVillage | आपका गाँव कौन सा है? | ਤੁਹਾਡਾ ਪਿੰਡ ਕਿਹੜਾ ਹੈ? |
| askPickupDate | माल कब उठाना है? | ਮਾਲ ਕਦੋਂ ਚੁੱਕਣਾ ਹੈ? |
| readBack | {kg} किलो {crop}, {price} रुपये किलो, गाँव {village}, पिकअप {date}। सही है? | {kg} ਕਿੱਲੋ {crop}, {price} ਰੁਪਏ ਕਿੱਲੋ, ਪਿੰਡ {village}, ਪਿਕਅੱਪ {date}। ਠੀਕ ਹੈ? |
| listingLive | आपकी फसल अब खरीदारों को दिख रही है। | ਤੁਹਾਡੀ ਫ਼ਸਲ ਹੁਣ ਖਰੀਦਦਾਰਾਂ ਨੂੰ ਦਿਖ ਰਹੀ ਹੈ। |
| orderConfirmed | {buyer} ने आपके {kg} किलो {crop} {price} रुपये किलो पर खरीदे। आपको {total} रुपये मिलेंगे। पिकअप {date}। | {buyer} ਨੇ ਤੁਹਾਡੇ {kg} ਕਿੱਲੋ {crop} {price} ਰੁਪਏ ਕਿੱਲੋ ਤੇ ਖਰੀਦੇ। ਤੁਹਾਨੂੰ {total} ਰੁਪਏ ਮਿਲਣਗੇ। ਪਿਕਅੱਪ {date}। |

Crops: tomato टमाटर/ਟਮਾਟਰ, onion प्याज़/ਪਿਆਜ਼, potato आलू/ਆਲੂ.
- [ ] **Step 5:** run → PASS. **Step 6:** commit `feat: fallback parser and hi/pa templates`.

---

### Task 6: Provider clients (Sarvam, Ollama)

**Files:** Create `lib/sarvam.ts`, `lib/llm.ts`; Test `tests/llm.test.ts`

**Interfaces:**
- `speechToEnglish(audio: Blob, lang: Lang): Promise<{ english: string; original: string }>` (`original` = `''` if the endpoint does not return it)
- `translateFromEnglish(text: string, lang: Lang): Promise<string>`
- `translateToEnglish(text: string, lang: Lang): Promise<string>` (typed ⌨️ input path)
- `tts(text: string, lang: Lang): Promise<string>` (base64 WAV)
- `llmTurn(input: { englishText: string; fields: ListingFields; today: string; history: ConversationState['history'] }): Promise<LlmTurn>` — throws `LlmError` on timeout (8 s via `AbortSignal.timeout`), non-200, or JSON that fails `isLlmTurn`
- `llmConfirmation(facts: { buyerName: string; kg: number; crop: Crop; pricePerKg: number; total: number; pickupDate: string }): Promise<string>`
- `isLlmTurn(x: unknown): x is LlmTurn`

Endpoints/headers/models exactly as confirmed in Task 1 spike. System prompt for `llmTurn` must say: English only; output only the JSON; per-kg prices (convert per-quintal); dates as YYYY-MM-DD relative to `today`; ask for at most one missing field per reply; never state a number not given by the farmer.

- [ ] **Step 1: Failing test** — `isLlmTurn` accepts `{updates:{quantityKg:100},replyEnglish:'ok',intent:'fill'}`; rejects missing `intent`, `intent:'buy'`, `updates:null`. `llmTurn` with `global.fetch` mocked to resolve `{message:{content:'not json'}}` rejects with `LlmError`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Live check:** `npx tsx --env-file=.env.local -e "import('./lib/llm').then(m=>m.llmTurn({englishText:'100 kg tomatoes',fields:{},today:'2026-11-06',history:[]})).then(console.log)"` → valid `LlmTurn`.
- [ ] **Step 6:** commit `feat: sarvam and ollama clients`.

---

### Task 7: Localize + conversation turn

**Files:** Create `lib/localize.ts`, `lib/conversation.ts`; Test `tests/conversation.test.ts`

**Interfaces:**
- `localize(input: { replyEnglish: string; lang: Lang; allowed: number[] | null; fallback: { key: TemplateKey; vars?: Record<string,string|number> } }, deps: { translate: typeof translateFromEnglish }): Promise<{ text: string; usedTemplate: boolean }>` — `allowed: null` skips the number check (plain questions)
- `newConversation(sessionId: string, lang: Lang, farmerId: string): ConversationState`
- `runTurn(state: ConversationState, english: string, deps: { llm: typeof llmTurn; today: string }): Promise<{ state: ConversationState; replyEnglish: string; intent: Intent; complete: boolean; usedFallback: boolean; fallbackKey: TemplateKey | null }>`

`runTurn`: call `deps.llm`; on `LlmError` use `parseFallback` + `nextQuestionKey` (`usedFallback: true`); merge `validateUpdates(...).accepted`; `turns += 1`; `complete` = all five fields present. Keep last 6 history entries.

- [ ] **Step 1: Failing tests**
```ts
const fakeTranslate = async (s: string) => `HI:${s}`;
test('localize restores numbers and passes fact-check', async () => {
  const r = await localize({ replyEnglish:'100 kg at ₹16', lang:'hi', allowed:[100,16], fallback:{key:'readBack'} }, { translate: fakeTranslate });
  expect(r).toEqual({ text:'HI:100 kg at ₹16', usedTemplate:false });
});
test('localize falls back to template on wrong number', async () => {
  const r = await localize({ replyEnglish:'100 kg at ₹18', lang:'hi', allowed:[100,16], fallback:{key:'askAgain'} }, { translate: fakeTranslate });
  expect(r.usedTemplate).toBe(true); expect(r.text).toBe(t('askAgain','hi'));
});
test('localize falls back when translate throws', async () => { /* translate rejects → usedTemplate true */ });
test('runTurn merges only valid updates', async () => {
  const llm = async () => ({ updates:{ quantityKg:100, askPricePerKg:900 }, replyEnglish:'Price?', intent:'fill' as const });
  const r = await runTurn(newConversation('s','hi','f1'), '100 kg', { llm, today:'2026-11-06' });
  expect(r.state.fields).toEqual({ quantityKg:100 }); expect(r.state.turns).toBe(1);
});
test('runTurn uses fallback parser when llm throws', async () => {
  const llm = async () => { throw new LlmError('timeout'); };
  const r = await runTurn(newConversation('s','hi','f1'), '100 kg tomatoes', { llm, today:'2026-11-06' });
  expect(r.usedFallback).toBe(true); expect(r.state.fields).toEqual({ crop:'tomato', quantityKg:100 }); expect(r.fallbackKey).toBe('askPrice');
});
```
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS. **Step 5:** commit `feat: conversation turn with fact-checked localization`.

---

### Task 8: Store and order service

**Files:** Create `lib/store.ts`, `lib/orders.ts`; Test `tests/orders.test.ts`

**Interfaces:**
- `interface Store { listListings(): Promise<Listing[]>; getListing(id): Promise<Listing|null>; saveListing(l: Listing): Promise<void>; saveOrder(o: Order): Promise<void>; listNotifications(farmerId: string): Promise<Notification[]>; saveNotification(n: Notification): Promise<void>; getConversation(id): Promise<ConversationState|null>; saveConversation(c: ConversationState): Promise<void>; getFarmer(id): Promise<Farmer|null>; getBuyer(id): Promise<Buyer|null> }`
- `getStore(): Store` — Redis if `UPSTASH_REDIS_REST_URL` set, else module-level memory store; both auto-seed from `lib/seed-data.ts` when empty. `createMemoryStore(): Store` exported for tests.
- `placeOrder(input: { listingId: string; buyerId: string; quantityKg: number }, deps: { store: Store; confirm: (facts) => Promise<{ textEnglish: string; textLocal: string }>; now: Date }): Promise<{ ok: true; order: Order } | { ok: false; status: 404 | 409 | 400; error: string }>`

`placeOrder` freezes `computeSplit(listing.askPricePerKg)`, decrements `remainingKg` (status `sold_out` at 0), and saves a Notification. Redis decrement uses a per-listing lock key (`SET lock:<id> 1 NX PX 3000`) to serialise concurrent orders.

- [ ] **Step 1: Failing tests** (memory store, `confirm` stub)
```ts
test('order freezes split and decrements stock', async () => { /* 100 of 300 kg → remainingKg 200; order.split.buyerPerKg 24.5; one notification */ });
test('later price change does not alter placed order', async () => { /* change listing ask to 20 → saved order.split.farmerPerKg still 16 */ });
test('over-ordering returns 409 and leaves stock intact', async () => { /* 400 of 300 kg → {ok:false,status:409}; remainingKg 300 */ });
test('two concurrent orders cannot oversell', async () => { /* Promise.all two 200 kg orders on 300 kg → exactly one ok */ });
test('kg <= 0 returns 400', async () => {});
```
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (memory store: serialise via a per-listing promise chain). **Step 4:** run → PASS. **Step 5:** commit `feat: store and order service`.

---

### Task 9: API routes

**Files:** Create `app/api/turn/route.ts`, `app/api/speak/route.ts`, `app/api/listings/route.ts`, `app/api/orders/route.ts`, `app/api/notifications/route.ts`, `app/api/notifications/[id]/heard/route.ts`

**Interfaces (request → response JSON):**
- `POST /api/turn` multipart `{ audio?: Blob, text?: string, sessionId, lang, farmerId, confirm?: 'true' }` → `{ fields, replyLocal, replyEnglish, complete, listingId?: string, tapToFill: boolean }`. `text` = typed Hindi/Punjabi → `translateToEnglish` first. If the English text is empty/whitespace (or STT throws), skip `runTurn` and reply `t('askAgain', lang)`. `confirm` or intent `confirm` with `complete` → create Listing (`remainingKg = quantityKg`, status `live`) and reply `listingLive`. Read-back reply uses `localize` with `allowedNumbers`; other replies `allowed: null`. `tapToFill = turns >= 6 && !complete`.
- `POST /api/speak` `{ text, lang }` → `{ audioBase64 }`; 502 on Sarvam failure (client then uses `speechSynthesis`).
- `GET /api/listings` → `{ listings: (Listing & { split: PriceSplit; farmerName: string })[] }` live/verified with `remainingKg > 0`, newest first.
- `POST /api/orders` `{ listingId, buyerId, quantityKg }` → `placeOrder` result; `confirm` = `llmConfirmation` → `localize(... allowedNumbers ..., fallback 'orderConfirmed')`.
- `GET /api/notifications?farmerId=` → `{ notifications }` newest first. `POST /api/notifications/:id/heard` → 204.

- [ ] **Step 1:** implement routes (all `export const runtime` default Node; no edge).
- [ ] **Step 2: Verify** with `npm run dev` and:
```bash
curl -s -F text="100 किलो टमाटर 16 रुपये किलो" -F sessionId=t1 -F lang=hi -F farmerId=f1 localhost:3000/api/turn
curl -s localhost:3000/api/listings | head -c 400
```
Expected: `fields.quantityKg = 100`, `replyLocal` in Devanagari; listings JSON includes `split.buyerPerKg`.
- [ ] **Step 3:** commit `feat: api routes`.

---

### Task 10: Farmer screen (`/farmer`)

**Files:** Create `app/farmer/page.tsx`, `components/MicButton.tsx`, `components/ListingCard.tsx`, `lib/audio-client.ts`

**Interfaces:**
- `lib/audio-client.ts`: `startRecording(): Promise<() => Promise<Blob>>` (MediaRecorder; if Task 1 found Sarvam rejects WebM, encode to 16 kHz mono WAV via `AudioContext` here); `playReply(text: string, lang: Lang): Promise<void>` (POST `/api/speak`, else `speechSynthesis` with `hi-IN`/`pa-IN`).
- Farmer id from `?farmer=f1` (default `f1`); language toggle हिंदी / ਪੰਜਾਬੀ stored in `localStorage` (try/catch).

UI (mobile-first, minimal text, large targets): language toggle; one 🎤 button (≥ 96 px) toggling record/stop with a pulsing state; `ListingCard` showing crop picture placeholder, kg, ₹/kg, village, date — empty fields shown as grey ❔ and tappable (tap-to-fill: re-record just that field when `tapToFill` or tapped); ✅ / 🔁 buttons once `complete`; ⌨️ toggle reveals a text input. Notifications panel polls every 3 s; each new notification shows text + **🔊 सुनें / ਸੁਣੋ** button, marking heard on play.

- [ ] **Step 1:** implement.
- [ ] **Step 2: Verify** on `npm run dev` in Chrome: speak Hindi sentence → card fills, reply plays; type in ⌨️ → same; ✅ → "listingLive" spoken; deny mic permission → ⌨️ shown with message, no crash.
- [ ] **Step 3:** commit `feat: farmer voice screen`.

---

### Task 11: Buyer screen (`/buyer`)

**Files:** Create `app/buyer/page.tsx`, `components/PriceSplit.tsx`, `app/page.tsx` (landing with two links: Farmer / Buyer)

UI (laptop, English): buyer picker (seed buyers); listings grid (crop, farmer name, village, kg left, pickup date, buyer ₹/kg); click → detail with `PriceSplit` table (farmer / pickup partner / spoilage buffer / platform = buyer ₹/kg) and caption "All figures are illustrative assumptions"; order form (kg, default = remaining, max = remaining) → shows totals from `orderTotals` → POST → success toast or the 409 message; refresh every 5 s.

- [ ] **Step 1:** implement.
- [ ] **Step 2: Verify:** order 100 kg on a seed listing → kg left drops; `/farmer?farmer=<that farmer>` shows notification within ~3 s with correct ₹ total; ordering more than remaining shows the error.
- [ ] **Step 3:** commit `feat: buyer screen with price split`.

---

### Task 12: Deploy and two-device run-through

- [ ] **Step 1:** Provision Upstash Redis via Vercel Marketplace; `vercel link`; add `SARVAM_API_KEY`, `OLLAMA_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` with `vercel env add`; `vercel --prod`.
- [ ] **Step 2: Run the demo script** (spec §6) on the production URL: phone = `/farmer`, laptop = `/buyer`. Pass = Hindi listing by voice ≤ 60 s, order, correct spoken confirmation; Punjabi sentence fills a card.
- [ ] **Step 3:** Record the backup video. Commit any fixes.

---

### Task 13 (Tier 2): Crop pictures + fair-price hint

**Files:** Create `public/crops/{tomato,onion,potato}.svg`, `lib/fair-price.ts`; Test `tests/fair-price.test.ts`

**Interfaces:** `fairPriceRange(crop: Crop): { min: number; max: number }` from sample data (tomato 12–18, onion 15–22, potato 10–14 — assumptions). `ListingCard` shows the picture; farmer card shows "आज का भाव ₹12–18" / "ਅੱਜ ਦਾ ਭਾਅ ₹12–18" under price; buyer detail shows same range.

- [ ] Test: `fairPriceRange('tomato')` → `{min:12,max:18}`. Run → FAIL → implement → PASS → wire UI → commit `feat: crop pictures and fair-price hint`.

---

### Task 14 (Tier 3): Ops verify screen

**Files:** Create `app/ops/page.tsx`, `app/api/listings/[id]/verify/route.ts`

`POST /api/listings/:id/verify` sets status `verified` (404 if missing). `/ops` lists `live` listings with a Verify button; buyer grid shows a ✓ Verified badge.

- [ ] Implement → verify manually (verify a listing → badge appears on `/buyer`) → commit `feat: ops verify screen`.
