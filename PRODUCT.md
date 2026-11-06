# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary users, weighted equally:

- **Farmer.** A smallholder in villages around Ludhiana (Punjab) selling produce, starting with tomatoes. Uses a low-cost Android smartphone, often outdoors. Cannot read English and may not read Hindi or Punjabi text comfortably; speaks Hindi or Punjabi. Job: list a harvest (crop, quantity, asking price per kg, village, pickup date) and know exactly what they will be paid when it sells, without anyone's help.
- **City buyer.** A restaurant, caterer or kirana (grocery) shop in Ludhiana buying produce weekly, on a laptop. Job: find fresh produce, see what the price is made of, and order directly.

Households are deliberately not a target: last-mile delivery of small quantities costs more than the margin.

## Product Purpose

Samriddhi (समृद्धि, "prosperity") closes the farm-to-fork price gap. Today a farmer sells 100 kg of tomatoes at about ₹8/kg while the same tomatoes retail at about ₹40/kg in the city, with three middlemen between. Samriddhi lets the farmer list by voice and sell directly to city buyers, while existing local aggregators keep a paid role in transport.

Success: a farmer completes a listing by voice, unaided; a buyer orders it; the farmer hears a correct confirmation of what they will be paid.

## Positioning

- **Voice-first, no reading required.** The farmer speaks to list and listens to confirm, in Hindi or Punjabi. Text on screen is support, never the only channel.
- **Middlemen become partners, not casualties.** Local aggregators and transporters are paid pickup partners with a disclosed per-kg fee, because they provide real services (transport, storage, credit) that cannot simply be removed.

## Operating Context

- Built for the Arthakram (Product & Consulting Club, Rishihood University) Rapid Prototyping Hackathon, Problem Statement 4, "The Farm-to-Fork Gap". Judged 60% building, 40% pitching; the pitch includes a live demo of about 90 seconds on two devices (farmer on a phone, buyer on a laptop).
- Pilot story: the Ludhiana district corridor, tomatoes only, 10–15 restaurant/kirana buyers, one or two aggregator partners; human operators coordinate matching and settlement early on.
- Farmer flow: speak → AI asks for missing details one at a time → the listing is read back aloud → farmer confirms with ✅ or a spoken "yes" → order confirmations arrive and are played aloud.
- Buyer flow: browse today's listings → see the per-kg price split → place an order.

## Capabilities and Constraints

- Speech-to-text, translation and text-to-speech via Sarvam AI (Hindi `hi-IN`, Punjabi `pa-IN`); conversation and field extraction via Ollama Cloud (`gemma4:31b`), English only; storage in Upstash Redis; Next.js 16 on Vercel at getsamriddhi.vercel.app.
- **Every number the farmer hears is fact-checked** against stored data; on any doubt a fixed Hindi/Punjabi sentence is used instead. Village names and relative dates (कल/परसों, tomorrow / day after tomorrow) come from the farmer's original words, not the AI.
- **Transparent per-kg price split** shown to buyers: farmer's asking price + pickup partner (₹4) + spoilage buffer (₹3) + platform fee (6%, blueprint range 5–8%). Frozen when an order is placed.
- Terminology: listing, pickup partner, spoilage buffer, Samriddhi fee, sale slip (बिक्री पर्ची / ਵਿਕਰੀ ਪਰਚੀ).
- Not built and out of scope for the MVP: login/OTP, real payments, real SMS/WhatsApp, maps/routing, price prediction, household delivery, more than two languages.
- Undecided: final pricing model after interviews; credit/advance replacement for the farmer; legal (APMC) direct-purchase rules per state.

## Brand Commitments

- Name: **Samriddhi**; Hindi समृद्धि; Punjabi ਸਮ੍ਰਿੱਧੀ (spelling pending native proofread).
- Hindi first, Punjabi second. Farmer-facing copy is in the farmer's language; buyer-facing copy is English.
- Claims to make: a voice-first layer that makes farmer supply easier to discover, with existing local partners doing fulfilment. Claims never to make: that middlemen can be removed, that the whole price gap becomes profit, that logistics are solved, or that direct purchase is legal in every state.

## Evidence on Hand

- A working prototype only. All farmers, buyers and listings are fictional (`lib/seed-data.ts`); village names are real places in Ludhiana district.
- All price-split figures are illustrative assumptions owned by the business teammates.
- Supporting documents: the problem statement and rulebook (hackathon PDFs), the team's MVP blueprint, `docs/superpowers/specs/2026-11-06-farm-to-fork-design.md`.
- None exist and none may be fabricated: real users, pilot results, testimonials, partner agreements, customer counts, revenue or market data beyond the brief's ₹8 / ₹40 / three-middlemen figures.

## Product Principles

1. **Hearing is the interface.** If a farmer can't complete it by speaking and listening, it isn't done.
2. **The farmer never hears a wrong number.** Rules and fixed sentences beat a fluent AI whenever money, quantity, place or date is at stake.
3. **Show every rupee.** Price composition is visible to both sides; no hidden margins.
4. **Partner with what works.** Keep the services middlemen provide, change who sets the price.
5. **Claim only what's true.** Prototype figures are labelled as assumptions; nothing is presented as proven.

## Accessibility & Inclusion

- Farmer surfaces must work for users with low or no literacy: voice in and out, icons alongside words, one primary action at a time, large touch targets.
- Legibility outdoors on low-end phones: high contrast, plain letterforms for values (no decorative scripts for numbers or names).
- Devanagari and Gurmukhi must render correctly; numbers stay in Latin digits for consistency with spoken read-backs.
- Respect reduced motion; keep keyboard focus visible on the buyer screen.
