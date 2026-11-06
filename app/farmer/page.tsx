"use client";

import { BellRing, Check, Keyboard, Lock, Mic, Phone, Plus, RotateCcw, Trash2, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { inr, ListingCard } from "@/components/ListingCard";
import { MicButton, type MicState } from "@/components/MicButton";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { PICKUP_PARTNER } from "@/lib/seed-data";
import { playReply, startRecording, stopReply } from "@/lib/audio-client";
import { buyerInScript, readBackVars } from "@/lib/readback";
import { cropName, formatDate, t, type TemplateKey } from "@/lib/templates";
import { ui } from "@/lib/ui-copy";
import type { Lang, Listing, ListingFields, Notification } from "@/lib/types";

type TurnResponse = {
  fields: ListingFields;
  replyLocal: string;
  complete: boolean;
  tapToFill: boolean;
  listingId?: string;
};

const FIELD_QUESTION: Record<keyof ListingFields, TemplateKey> = {
  crop: "askCrop",
  quantityKg: "askQuantity",
  askPricePerKg: "askPrice",
  village: "askVillage",
  pickupDate: "askPickupDate",
};

const newSessionId = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function readLang(): Lang {
  try {
    return localStorage.getItem("samriddhi-lang") === "pa" ? "pa" : "hi";
  } catch {
    return "hi";
  }
}

export default function FarmerPage() {
  const [lang, setLang] = useState<Lang>("hi");
  const [farmerId, setFarmerId] = useState("f1");
  // Created on first use, not during prerender (Date.now/random are request-time values).
  const sessionRef = useRef<string | null>(null);
  const [fields, setFields] = useState<ListingFields>({});
  const [reply, setReply] = useState("");
  const [complete, setComplete] = useState(false);
  const [tapToFill, setTapToFill] = useState(false);
  const [mic, setMic] = useState<MicState>("idle");
  const [micBlocked, setMicBlocked] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [typed, setTyped] = useState("");
  const [listedId, setListedId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [ready, setReady] = useState(false);
  const [toDelete, setToDelete] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const stopRef = useRef<null | (() => Promise<Blob>)>(null);

  useEffect(() => {
    // One-time sync from browser-only sources after hydration (server render can't see them).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(readLang());
    setFarmerId(new URLSearchParams(window.location.search).get("farmer") ?? "f1");
    setReady(true);
  }, []);

  /** Play text aloud without replacing the AI's line (order cards, examples, guides). */
  const speakSeq = useRef(0);
  const speak = useCallback(
    async (text: string, inLang: Lang = lang) => {
      const seq = ++speakSeq.current;
      setMic("speaking");
      await playReply(text, inLang);
      // A newer action (e.g. confirm tapped mid-read-back) owns the state now; don't reset it to idle.
      if (seq === speakSeq.current) setMic("idle");
    },
    [lang],
  );

  const switchLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("samriddhi-lang", l);
    } catch {}
    if (complete) {
      // Mid-confirm: read the same slip back in the new language, from our own fixed sentence.
      const text = t("readBack", l, readBackVars(fields, l));
      setReply(text);
      void speak(text, l);
    } else {
      setReply(""); // the last reply was spoken in the other language
    }
  };

  /** The AI's reply: shown as the current line and spoken. */
  const say = useCallback(
    async (text: string) => {
      setReply(text);
      await speak(text);
    },
    [speak],
  );

  const sendTurn = useCallback(
    async (payload: { audio?: Blob; text?: string; confirm?: boolean }) => {
      setMic("thinking");
      const form = new FormData();
      sessionRef.current ??= newSessionId();
      form.append("sessionId", sessionRef.current);
      form.append("lang", lang);
      form.append("farmerId", farmerId);
      if (payload.audio) form.append("audio", payload.audio);
      if (payload.text) form.append("text", payload.text);
      if (payload.confirm) form.append("confirm", "true");
      try {
        const res = await fetch("/api/turn", { method: "POST", body: form });
        const data: TurnResponse = await res.json();
        if (data.listingId) {
          setListedId(data.listingId);
          setFields(data.fields);
          setComplete(false);
          setShowKeyboard(false);
        } else {
          setFields(data.fields);
          setComplete(data.complete);
          setTapToFill(data.tapToFill);
          if (data.complete) setShowKeyboard(false); // one decision at a time: confirm or say again
        }
        await say(data.replyLocal);
      } catch {
        await say(t("askAgain", lang));
      }
    },
    [farmerId, lang, say],
  );

  const toggleRecording = async () => {
    if (mic === "recording" && stopRef.current) {
      const blob = await stopRef.current();
      stopRef.current = null;
      await sendTurn({ audio: blob });
      return;
    }
    try {
      stopRef.current = await startRecording(async () => {
        // Auto-stopped at the time limit: send what we have.
        if (stopRef.current) {
          const blob = await stopRef.current();
          stopRef.current = null;
          await sendTurn({ audio: blob });
        }
      });
      setMicBlocked(false);
      setMic("recording");
    } catch {
      // The farmer may not read the guide, so it is also spoken.
      setMicBlocked(true);
      await speak(`${ui("micGuideTitle", lang)}. ${ui("micGuide", lang)}`);
    }
  };

  const askForField = async (field: keyof ListingFields) => {
    await say(t(FIELD_QUESTION[field], lang));
    await toggleRecording();
  };

  const startOver = () => {
    sessionRef.current = null;
    setFields({});
    setReply("");
    setComplete(false);
    setTapToFill(false);
    setListedId(null);
  };

  // Poll for order confirmations and this farmer's live listings.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const load = async () => {
      try {
        const [nRes, lRes] = await Promise.all([fetch(`/api/notifications?farmerId=${farmerId}`), fetch("/api/listings")]);
        const [nData, lData] = await Promise.all([nRes.json(), lRes.json()]);
        if (!alive) return;
        // Only re-render when something changed: a fresh array every 3 s re-rendered the page mid-scroll.
        const notifs: Notification[] = nData.notifications ?? [];
        const mine: Listing[] = (lData.listings ?? []).filter((l: Listing) => l.farmerId === farmerId);
        setNotifications((prev) => (JSON.stringify(prev) === JSON.stringify(notifs) ? prev : notifs));
        setMyListings((prev) => (JSON.stringify(prev) === JSON.stringify(mine) ? prev : mine));
      } catch {}
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [farmerId, ready]);

  /** The order sentence in whichever language is on screen now (older orders keep their stored text). */
  const orderText = useCallback(
    (n: Notification) =>
      n.facts
        ? t("orderConfirmed", lang, {
            buyer: buyerInScript(n.facts.buyerId, n.facts.buyerName, lang),
            kg: n.facts.kg,
            crop: cropName(n.facts.crop, lang),
            price: n.facts.pricePerKg,
            total: n.facts.total,
            date: formatDate(n.facts.pickupDate, lang),
          })
        : n.textLocal,
    [lang],
  );

  const markHeard = (n: Notification) => {
    fetch(`/api/notifications/${n.id}/heard`, { method: "POST" }).catch(() => {});
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, heard: true } : x)));
  };

  const listen = async (n: Notification) => {
    await speak(orderText(n));
    markHeard(n);
  };

  const askDelete = (l: Listing) => {
    setToDelete(l);
    void speak(ui("deleteAsk", lang)); // the farmer may not read the question
  };

  const deleteListing = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${toDelete.id}?farmerId=${farmerId}`, { method: "DELETE" });
      if (res.ok || res.status === 404) setMyListings((ls) => ls.filter((l) => l.id !== toDelete.id));
    } catch {}
    stopReply();
    setDeleting(false);
    setToDelete(null);
  };

  const keepListing = () => {
    stopReply();
    setToDelete(null);
  };

  /** Confirm and re-record stay live while the read-back plays: a tap stops the voice and acts. */
  const confirmNow = () => {
    speakSeq.current++; // the interrupted read-back must not flip the screen back to idle
    stopReply();
    void sendTurn({ confirm: true });
  };
  const redoAll = () => {
    speakSeq.current++;
    stopReply();
    startOver(); // "say it all again" means a fresh listing, not edits on top of the old one
    void toggleRecording();
  };

  const busy = mic === "thinking" || mic === "speaking";
  const micLabel =
    mic === "recording"
      ? ui("recording", lang)
      : mic === "thinking"
        ? ui("thinking", lang)
        : mic === "speaking"
          ? ui("speaking", lang)
          : ui("tapToSpeak", lang);
  const isEmpty = Object.keys(fields).length === 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-56 pt-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-[1.75rem] font-bold leading-none tracking-tight text-forest">
            {ui("brand", lang)}
          </p>
          <h1 className="mt-1.5 text-base text-soil">{ui("title", lang)}</h1>
        </div>
        <div className="raised flex rounded-full p-1 text-base font-semibold" role="group" aria-label="भाषा / ਭਾਸ਼ਾ">
          {(["hi", "pa"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLang(l)}
              aria-pressed={lang === l}
              lang={l}
              className={`min-h-11 rounded-full px-4 transition-colors ${
                lang === l ? "bg-forest text-surface" : "text-forest hover:bg-sage-soft"
              }`}
            >
              {l === "hi" ? "हिंदी" : "ਪੰਜਾਬੀ"}
            </button>
          ))}
        </div>
      </header>

      {listedId ? (
        <section className="flex flex-col gap-4">
          <p className="flex items-center gap-3 rounded-2xl bg-sage-soft px-4 py-3.5 text-lg font-semibold text-forest">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-surface">
              <Check aria-hidden className="h-5 w-5" strokeWidth={3} />
            </span>
            {ui("listed", lang)}
          </p>
          <ListingCard fields={fields} lang={lang} />
          <button
            type="button"
            onClick={startOver}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest/25 bg-surface text-lg font-semibold text-forest transition-colors hover:bg-sage-soft"
          >
            <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
            {ui("newListing", lang)}
          </button>
        </section>
      ) : (
        <>
          {isEmpty && !reply && !micBlocked && (
            <section className="flex items-center gap-4 rounded-2xl bg-sage-soft/70 p-4" aria-label={ui("exampleTitle", lang)}>
              <button
                type="button"
                onClick={() => speak(ui("example", lang))}
                disabled={busy}
                aria-label={`${ui("exampleTitle", lang)}: ${ui("listen", lang)}`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-forest text-surface transition-transform active:scale-95 disabled:opacity-60"
              >
                <Volume2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <p className="text-lg leading-snug text-forest">
                <span className="block text-sm font-medium text-soil">{ui("exampleTitle", lang)}</span>“{ui("example", lang)}”
              </p>
            </section>
          )}

          <ListingCard
            fields={fields}
            lang={lang}
            disabled={mic !== "idle"}
            onTapField={!isEmpty || tapToFill ? askForField : undefined}
          />

          {tapToFill && <p className="font-semibold text-terracotta-text">{ui("tapField", lang)}</p>}

          {reply && (
            <section className="flex items-start gap-3" aria-live="polite">
              <button
                type="button"
                onClick={() => speak(reply)}
                disabled={busy}
                aria-label={ui("replay", lang)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-forest shadow-[0_0_0_1px_var(--line)] transition-transform active:scale-95 disabled:opacity-60"
              >
                <Volume2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <p className="pt-1.5 text-xl leading-snug text-soil">{reply}</p>
            </section>
          )}

          {micBlocked && (
            <section className="raised flex flex-col gap-4 rounded-3xl p-5" role="alert">
              <p className="font-display text-xl font-semibold text-terracotta-text">{ui("micGuideTitle", lang)}</p>
              <div className="flex items-center gap-3 text-forest" aria-hidden>
                {[Lock, Mic, Check].map((I, idx) => (
                  <span key={idx} className="flex items-center gap-3">
                    {idx > 0 && <span className="h-px w-6 bg-line" />}
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-sage-soft">
                      <I className="h-6 w-6" strokeWidth={2.25} />
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-lg leading-snug text-soil">{ui("micGuide", lang)}</p>
            </section>
          )}

          {showKeyboard && (
            <form
              className="raised flex gap-2 rounded-full p-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) sendTurn({ text: typed.trim() });
                setTyped("");
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={ui("placeholder", lang)}
                aria-label={ui("type", lang)}
                className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-forest outline-none placeholder:text-soil-soft"
                style={{ fontSize: 18 }}
              />
              <button type="submit" className="min-h-11 rounded-full bg-forest px-5 text-base font-semibold text-surface">
                {ui("send", lang)}
              </button>
            </form>
          )}
        </>
      )}

      {myListings.length > 0 && (
        <section className="mt-2 flex flex-col gap-3" aria-label={ui("myListings", lang)}>
          <h2 className="font-display text-xl font-semibold text-forest">{ui("myListings", lang)}</h2>
          <ul className="raised divide-y divide-line overflow-hidden rounded-2xl">
            {myListings.map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-3.5 pl-4 pr-2">
                <div className="flex-1 self-center">
                  <p className="font-display text-lg font-semibold text-forest">
                    {cropName(l.crop, lang)}, {l.remainingKg} {ui("kgLeft", lang)}
                  </p>
                  <p className="text-sm text-soil-soft">
                    {ui("pickup", lang)} {formatDate(l.pickupDate, lang)}
                  </p>
                </div>
                <p className="figure text-xl font-semibold text-forest">
                  ₹{l.askPricePerKg}
                  <span className="text-sm font-normal text-soil-soft">{ui("perKg", lang)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => askDelete(l)}
                  aria-label={`${ui("deleteListing", lang)}: ${cropName(l.crop, lang)}`}
                  className="-mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-red-600 transition-colors hover:bg-red-50 active:scale-95"
                >
                  <Trash2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-2 flex flex-col gap-3" aria-label={ui("orders", lang)}>
        <h2 className="font-display text-xl font-semibold text-forest">{ui("orders", lang)}</h2>
        {notifications.length === 0 && <p className="text-soil-soft">{ui("noOrders", lang)}</p>}
        {notifications.map((n) => (
          <article key={n.id} className="raised flex flex-col gap-3 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              {n.farmerTotal !== undefined ? (
                <p>
                  <span className="block text-sm font-medium text-soil-soft">{ui("youGet", lang)}</span>
                  <span className="figure text-[2rem] font-semibold leading-tight text-forest">{inr(n.farmerTotal)}</span>
                </p>
              ) : (
                <span />
              )}
              {!n.heard && n.facts && (
                <span className="flex items-center gap-1.5 rounded-full bg-terracotta/12 px-3 py-1 text-sm font-semibold text-terracotta-text">
                  <BellRing aria-hidden className="h-4 w-4" strokeWidth={2.25} />
                  {ui("newOrder", lang)}
                </span>
              )}
            </div>
            <p className="text-base leading-snug text-soil">{orderText(n)}</p>
            <button
              type="button"
              onClick={() => listen(n)}
              disabled={busy}
              aria-label={`${ui("listen", lang)}: ${n.farmerTotal !== undefined ? inr(n.farmerTotal) : orderText(n).slice(0, 40)}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-sage-soft text-base font-semibold text-forest transition-colors hover:bg-sage/40 disabled:opacity-60"
            >
              <Volume2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              {ui("listen", lang)}
            </button>
            {/* A plain tel: link: the phone's own dialer places the call, no app or account needed. */}
            <a
              href={`tel:${PICKUP_PARTNER.phone.replace(/\s/g, "")}`}
              aria-label={`${ui("callPickup", lang)}: ${PICKUP_PARTNER.name}, ${PICKUP_PARTNER.phone}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest/25 text-base font-semibold text-forest transition-colors hover:bg-sage-soft active:scale-[0.98]"
            >
              <Phone aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              {ui("callPickup", lang)}
            </a>
          </article>
        ))}
      </section>

      {/* Fixed in thumb reach: the one action that matters right now. */}
      {!listedId && (
        // Floating liquid-glass dock: the cards behind it bend through the rim. Tint is raised from the
        // demo's 0.12 so labels stay readable for the farmer over whatever scrolls underneath.
        <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-md">
          <LiquidGlass
            radius={32}
            scale={48}
            aberration={14}
            bevelDepth={24}
            frost={0.4}
            tint={0.6}
            className="shadow-[0_12px_40px_rgb(35_71_53/0.25),inset_0_1px_0_rgb(255_255_255/0.5)] dark:bg-white/70"
            contentClassName="flex flex-col items-center gap-2 px-4 py-4"
          >
            {complete ? (
              <>
                {busy && (
                  <p className="text-sm font-medium text-soil" aria-live="polite">
                    {micLabel}
                  </p>
                )}
                <div className="grid w-full grid-cols-[1.5fr_1fr] gap-4">
                  <button
                    type="button"
                    onClick={confirmNow}
                    disabled={mic === "thinking" || mic === "recording"}
                    className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-forest text-lg font-bold text-surface shadow-[0_10px_24px_-10px_rgb(35_71_53/0.7)] transition-transform active:scale-[0.98] disabled:opacity-60"
                  >
                    <Check aria-hidden className="h-6 w-6" strokeWidth={3} />
                    {ui("confirm", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={redoAll}
                    disabled={mic === "thinking"}
                    className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-forest/25 text-base font-semibold text-forest transition-colors hover:bg-sage-soft disabled:opacity-60"
                  >
                    <RotateCcw aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                    {ui("retryAll", lang)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <MicButton state={mic} onPress={toggleRecording} label={micLabel} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyboard((s) => !s)}
                    aria-pressed={showKeyboard}
                    className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-medium transition-colors ${
                      showKeyboard ? "bg-sage-soft text-forest" : "text-soil hover:bg-sage-soft"
                    }`}
                  >
                    <Keyboard aria-hidden className="h-5 w-5" strokeWidth={2} />
                    {ui("type", lang)}
                  </button>
                </div>
              </>
            )}
          </LiquidGlass>
        </div>
      )}

      {/* Delete check: the listing is named again so the farmer knows which one goes. */}
      {toDelete && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-forest/40 p-3 sm:items-center" onClick={keepListing}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-ask"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-5 rounded-3xl bg-surface p-6 shadow-[0_20px_60px_rgb(35_71_53/0.35)]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
              <Trash2 aria-hidden className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div>
              <p id="delete-ask" className="font-display text-xl font-semibold leading-snug text-forest">
                {ui("deleteAsk", lang)}
              </p>
              <p className="mt-2 text-lg text-soil">
                {cropName(toDelete.crop, lang)}, {toDelete.remainingKg} {ui("kgLeft", lang)} · ₹{toDelete.askPricePerKg}
                {ui("perKg", lang)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                autoFocus
                onClick={keepListing}
                disabled={deleting}
                className="flex min-h-14 items-center justify-center rounded-full border border-forest/25 text-lg font-semibold text-forest transition-colors hover:bg-sage-soft disabled:opacity-60"
              >
                {ui("deleteNo", lang)}
              </button>
              <button
                type="button"
                onClick={deleteListing}
                disabled={deleting}
                className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-red-600 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <Trash2 aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                {ui("deleteYes", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
