"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListingCard } from "@/components/ListingCard";
import { MicButton, type MicState } from "@/components/MicButton";
import { playReply, startRecording } from "@/lib/audio-client";
import { todayIST } from "@/lib/dates";
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
  const [today, setToday] = useState<string>();
  // Created on first use, not during prerender (Date.now/random are request-time values).
  const sessionRef = useRef<string | null>(null);
  const [fields, setFields] = useState<ListingFields>({});
  const [reply, setReply] = useState("");
  const [complete, setComplete] = useState(false);
  const [tapToFill, setTapToFill] = useState(false);
  const [mic, setMic] = useState<MicState>("idle");
  const [micError, setMicError] = useState(false);
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
    setToday(todayIST());
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("samriddhi-lang", l);
    } catch {}
  };

  const say = useCallback(
    async (text: string) => {
      setReply(text);
      setMic("speaking");
      await playReply(text, lang);
      setMic("idle");
    },
    [lang],
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
        } else {
          setFields(data.fields);
          setComplete(data.complete);
          setTapToFill(data.tapToFill);
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
      setMicError(false);
      stopRef.current = await startRecording(async () => {
        // Auto-stopped at the time limit: send what we have.
        if (stopRef.current) {
          const blob = await stopRef.current();
          stopRef.current = null;
          await sendTurn({ audio: blob });
        }
      });
      setMic("recording");
    } catch {
      setMicError(true);
      setShowKeyboard(true);
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
    await say(n.textLocal);
    fetch(`/api/notifications/${n.id}/heard`, { method: "POST" }).catch(() => {});
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, heard: true } : x)));
  };

  const micLabel =
    mic === "recording" ? ui("recording", lang) : mic === "thinking" ? ui("thinking", lang) : ui("tapToSpeak", lang);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-48 pt-5">
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
              className={`px-3 py-1.5 ${lang === l ? "bg-ink text-paper" : "text-ink"}`}
            >
              {l === "hi" ? "हिंदी" : "ਪੰਜਾਬੀ"}
            </button>
          ))}
        </div>
      </header>

      {listedId ? (
        <section className="flex flex-col gap-4">
          <p className="border-l-4 border-field bg-field-soft px-4 py-3 text-xl font-semibold text-field">
            {ui("listed", lang)}
          </p>
          <ListingCard fields={fields} lang={lang} today={today} />
          <button
            type="button"
            onClick={startOver}
            className="border-2 border-ink bg-paper py-3 text-lg font-semibold text-ink"
          >
            ＋ {ui("newListing", lang)}
          </button>
        </section>
      ) : (
        <>
          <ListingCard
            fields={fields}
            lang={lang}
            today={today}
            disabled={mic !== "idle"}
            onTapEmpty={Object.keys(fields).length > 0 || tapToFill ? askForField : undefined}
          />
          {tapToFill && <p className="font-semibold text-bahi">{ui("tapField", lang)}</p>}

          {reply && (
            <p className="border-l-4 border-bahi pl-4 text-xl leading-snug text-ink" aria-live="polite">
              {reply}
            </p>
          )}

          {micError && <p className="font-semibold text-bahi">{ui("micDenied", lang)}</p>}

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
              <button type="submit" className="bg-ink px-4 text-lg font-semibold text-paper">
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
          <article
            key={n.id}
            className={`ledger flex items-start gap-3 rounded-sm py-3 pl-12 pr-3 ${n.heard ? "" : "outline-2 outline-field"}`}
          >
            <p className="flex-1 text-lg leading-snug">{n.textLocal}</p>
            <button
              type="button"
              onClick={() => listen(n)}
              disabled={mic !== "idle"}
              className="shrink-0 border-2 border-ink bg-paper px-3 py-2 text-base font-semibold disabled:opacity-60"
            >
              🔊 {ui("listen", lang)}
            </button>
          </article>
        ))}
      </section>

      {/* Fixed in thumb reach: the one action that matters right now. */}
      {!listedId && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-bahi bg-page/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4">
            {complete ? (
              <div className="grid w-full grid-cols-[1.4fr_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => sendTurn({ confirm: true })}
                  disabled={mic !== "idle"}
                  className="bg-field py-4 text-xl font-bold text-paper disabled:opacity-60"
                >
                  ✅ {ui("confirm", lang)}
                </button>
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={mic === "thinking" || mic === "speaking"}
                  className="border-2 border-ink bg-paper py-4 text-xl font-semibold text-ink disabled:opacity-60"
                >
                  🔁 {ui("retry", lang)}
                </button>
              </div>
            ) : (
              <MicButton state={mic} onPress={toggleRecording} label={micLabel} />
            )}
            <button
              type="button"
              onClick={() => setShowKeyboard((s) => !s)}
              aria-pressed={showKeyboard}
              className="text-base text-ink-soft underline underline-offset-4"
            >
              ⌨️ {ui("type", lang)}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
