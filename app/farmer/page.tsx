"use client";

import { BellRing, Check, Keyboard, Lock, Mic, Plus, RotateCcw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { inr, ListingCard } from "@/components/ListingCard";
import { MicButton, type MicState } from "@/components/MicButton";
import { playReply, startRecording } from "@/lib/audio-client";
import { t, type TemplateKey } from "@/lib/templates";
import { ui } from "@/lib/ui-copy";
import type { Lang, ListingFields, Notification } from "@/lib/types";

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
  const stopRef = useRef<null | (() => Promise<Blob>)>(null);

  useEffect(() => {
    // One-time sync from browser-only sources after hydration (server render can't see them).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(readLang());
    setFarmerId(new URLSearchParams(window.location.search).get("farmer") ?? "f1");
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    setReply(""); // the last reply was spoken in the other language
    try {
      localStorage.setItem("samriddhi-lang", l);
    } catch {}
  };

  /** Play text aloud without replacing the AI's line (order cards, examples, guides). */
  const speak = useCallback(
    async (text: string) => {
      setMic("speaking");
      await playReply(text, lang);
      setMic("idle");
    },
    [lang],
  );

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

  // Poll for order confirmations.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?farmerId=${farmerId}`);
        const data = await res.json();
        if (alive) setNotifications(data.notifications ?? []);
      } catch {}
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [farmerId]);

  const listen = async (n: Notification) => {
    await speak(n.textLocal);
    fetch(`/api/notifications/${n.id}/heard`, { method: "POST" }).catch(() => {});
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, heard: true } : x)));
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-52 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-ledger text-3xl leading-none text-bahi">{ui("brand", lang)}</p>
          <h1 className="mt-1 text-lg font-semibold text-ink">{ui("title", lang)}</h1>
        </div>
        <div className="flex border-2 border-ink text-base font-semibold" role="group" aria-label="भाषा / ਭਾਸ਼ਾ">
          {(["hi", "pa"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLang(l)}
              aria-pressed={lang === l}
              className={`min-h-11 px-3 ${lang === l ? "bg-ink text-paper" : "text-ink"}`}
            >
              {l === "hi" ? "हिंदी" : "ਪੰਜਾਬੀ"}
            </button>
          ))}
        </div>
      </header>

      {listedId ? (
        <section className="flex flex-col gap-4">
          <p className="flex items-center gap-3 bg-field-soft px-4 py-3 text-xl font-semibold text-field">
            <Check aria-hidden className="h-7 w-7 shrink-0" strokeWidth={3} />
            {ui("listed", lang)}
          </p>
          <ListingCard fields={fields} lang={lang} />
          <button
            type="button"
            onClick={startOver}
            className="flex min-h-12 items-center justify-center gap-2 border-2 border-ink bg-paper text-lg font-semibold text-ink"
          >
            <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
            {ui("newListing", lang)}
          </button>
        </section>
      ) : (
        <>
          {isEmpty && !reply && !micBlocked && (
            <section className="flex items-start gap-3" aria-label={ui("exampleTitle", lang)}>
              <button
                type="button"
                onClick={() => speak(ui("example", lang))}
                disabled={busy}
                aria-label={`${ui("exampleTitle", lang)}: ${ui("listen", lang)}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper text-ink disabled:opacity-60"
              >
                <Volume2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <p className="text-lg leading-snug text-ink">
                <span className="block text-base text-ink-soft">{ui("exampleTitle", lang)}</span>“{ui("example", lang)}”
              </p>
            </section>
          )}

          <ListingCard
            fields={fields}
            lang={lang}
            disabled={mic !== "idle"}
            onTapEmpty={!isEmpty || tapToFill ? askForField : undefined}
          />

          {tapToFill && <p className="font-semibold text-bahi">{ui("tapField", lang)}</p>}

          {reply && (
            <section className="flex items-start gap-3" aria-live="polite">
              <button
                type="button"
                onClick={() => speak(reply)}
                disabled={busy}
                aria-label={ui("replay", lang)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-bahi bg-paper text-bahi disabled:opacity-60"
              >
                <Volume2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <p className="pt-1.5 text-xl leading-snug text-ink">{reply}</p>
            </section>
          )}

          {micBlocked && (
            <section className="ledger flex flex-col gap-3 rounded-sm py-4 pl-12 pr-4" role="alert">
              <p className="font-ledger text-xl text-bahi">{ui("micGuideTitle", lang)}</p>
              <div className="flex items-center gap-3 text-ink" aria-hidden>
                <Lock className="h-8 w-8" strokeWidth={2} />
                <span className="text-2xl text-ink-soft">›</span>
                <Mic className="h-8 w-8" strokeWidth={2} />
                <span className="text-2xl text-ink-soft">›</span>
                <Check className="h-8 w-8 text-field" strokeWidth={2.5} />
              </div>
              <p className="text-lg leading-snug">{ui("micGuide", lang)}</p>
            </section>
          )}

          {showKeyboard && (
            <form
              className="flex gap-2"
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
                className="min-w-0 flex-1 border-2 border-ink bg-paper px-3 py-3"
                style={{ fontSize: 18 }}
              />
              <button type="submit" className="min-h-12 bg-ink px-4 text-lg font-semibold text-paper">
                {ui("send", lang)}
              </button>
            </form>
          )}
        </>
      )}

      <section className="mt-3 flex flex-col gap-3" aria-label={ui("orders", lang)}>
        <h2 className="font-ledger text-2xl text-bahi">{ui("orders", lang)}</h2>
        {notifications.length === 0 && <p className="text-ink-soft">{ui("noOrders", lang)}</p>}
        {notifications.map((n) => (
          <article key={n.id} className="ledger flex flex-col gap-3 rounded-sm py-4 pl-12 pr-4">
            <div className="flex items-start justify-between gap-3">
              {n.farmerTotal !== undefined && (
                <p>
                  <span className="block text-base text-ink-soft">{ui("youGet", lang)}</span>
                  <span className="double-rule inline-block pb-0.5 text-[2rem] font-bold leading-tight text-field tabular-nums">
                    {inr(n.farmerTotal)}
                  </span>
                </p>
              )}
              {!n.heard && (
                <span className="flex items-center gap-1 text-base font-semibold text-bahi">
                  <BellRing aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                  {ui("newOrder", lang)}
                </span>
              )}
            </div>
            <p className="text-lg leading-snug">{n.textLocal}</p>
            <button
              type="button"
              onClick={() => listen(n)}
              disabled={busy}
              className="flex min-h-12 items-center justify-center gap-2 bg-ink text-lg font-semibold text-paper disabled:opacity-60"
            >
              <Volume2 aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              {ui("listen", lang)}
            </button>
          </article>
        ))}
      </section>

      {/* Fixed in thumb reach: the one action that matters right now. */}
      {!listedId && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-bahi bg-page/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4">
            {complete ? (
              <>
                {busy && (
                  <p className="text-base font-semibold text-ink" aria-live="polite">
                    {micLabel}
                  </p>
                )}
                <div className="grid w-full grid-cols-[1.5fr_1fr] gap-6">
                  <button
                    type="button"
                    onClick={() => sendTurn({ confirm: true })}
                    disabled={mic !== "idle"}
                    className="flex min-h-14 items-center justify-center gap-2 bg-field text-xl font-bold text-paper disabled:opacity-60"
                  >
                    <Check aria-hidden className="h-6 w-6" strokeWidth={3} />
                    {ui("confirm", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={busy}
                    className="flex min-h-14 items-center justify-center gap-2 border-2 border-ink bg-paper text-lg font-semibold text-ink disabled:opacity-60"
                  >
                    <RotateCcw aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                    {ui("retry", lang)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <MicButton state={mic} onPress={toggleRecording} label={micLabel} />
                <button
                  type="button"
                  onClick={() => setShowKeyboard((s) => !s)}
                  aria-pressed={showKeyboard}
                  className="flex min-h-11 items-center gap-2 px-3 text-base text-ink-soft underline underline-offset-4"
                >
                  <Keyboard aria-hidden className="h-5 w-5" strokeWidth={2} />
                  {ui("type", lang)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
