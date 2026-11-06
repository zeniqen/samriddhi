# How we used Claude: Samriddhi

**Team:** Arthakram hackathon, Problem Statement 4 ("The Farm-to-Fork Gap")
**Live prototype:** https://getsamriddhi.vercel.app · **Code:** github.com/zeniqen/samriddhi (branch `feat/mvp`)

We used the provided Claude account through **Claude Code** as our main build partner, from reading the problem statement to the deployed product. One of us wrote the code with Claude. Every decision below was made by us and checked against what Claude produced.

## 1. Understanding the problem
- Claude read the problem statement and rulebook with us and helped us find **the catch**: the farmer cannot read, and middlemen do real work (transport, storage, credit), so cutting them out fails.
- It reviewed our teammate's MVP blueprint against the brief. We kept the "partner with middlemen" idea and the pilot plan, and cut what a demo cannot show.
- We used it to question our own assumptions: ₹40 is a *retail* price, tomatoes spoil, and 100 kg is too small to ship alone. Those points shaped the price split.

## 2. Product and design decisions
- **Brainstorming → design spec → implementation plan:** Claude asked one question at a time (stack, demo region, how speech becomes data). It proposed 2–3 options with trade-offs; we chose.
- Our key choices, made with Claude:
  - **Voice-first, with AI asking for missing details one at a time**, but **the code checks every number before the farmer hears it.** If the AI says a wrong price, a fixed Hindi/Punjabi sentence is used instead.
  - **Translate to English first**, because the AI model we had access to was weak at Punjabi.
  - **Middlemen become paid pickup partners,** with the fee shown openly in every price.

## 3. Building
- Claude wrote the code **test-first**: each rule (pricing, number fact-check, dates in Indian time, village matching, overselling) got a failing test before the code. **99 automated tests** now cover the logic.
- It built a Next.js app with three screens (farmer, buyer, landing) and the server endpoints, and deployed it to Vercel.
- **34 commits** in one day, each small and described.

## 4. Testing, review and debugging
- **Independent code review:** a separate Claude reviewer checked the whole codebase. It found 5 real problems, for example "1,600" was read as ₹6 and a "yes" could confirm a changed price. Each was fixed with a test.
- **Testing with the real AI services caught problems the unit tests couldn't**, such as translation turning दाखा (Dakha) into "Dhaka".
- **Live debugging:** when voice stopped working on phones, Claude read the production server logs and found the cause in minutes (Sarvam rejected Chrome's audio format label). It fixed it with a test and redeployed.
- **Design critiques:** three rounds of scored usability reviews (22 → 24 → 27 out of 40). Each round's findings were fixed, for example the farmer never heard the total before confirming.

## 5. Design
- Claude produced the visual design in rounds, following our feedback: a ledger style first, then **our own palette**, then a **modern redesign** when we found the ledger look dated.
- It integrated the UI components we chose (cube background, mic halo, liquid-glass dock), adapted them to our palette, and told us every change it made from the original.

## What Claude did *not* do
- **The product's own AI is not Claude.** We had no Claude API key, so the app uses **Sarvam AI** (speech and translation) and **Ollama Cloud, model gemma4** (understanding the farmer). Claude helped us choose it by testing six models on our real Hindi sentences, scoring accuracy and speed; three of the six turned out to need a paid plan.
- Business numbers (fees, the price split) are **our assumptions**, labelled as such in the app.
- Claude did not invent users, pilots or testimonials. We have none yet, and the app and pitch say so.

## What we learned
1. **Make the AI talk, and make code guard the facts.** That one rule shaped the whole product.
2. **Test with real inputs.** Our biggest bugs only showed up with real speech, real translation and real browsers.
3. **Decide first, then delegate.** Claude was fastest when we gave it a clear decision; it was most useful when it pushed back on a weak one.
