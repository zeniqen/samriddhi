"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListingCard } from "@/components/ListingCard";
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
    return localStorage.getItem("kisan-lang") === "pa" ? "pa" : "hi";
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
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("kisan-lang", l);
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-leaf">{ui("title", lang)}</h1>
        <div className="flex rounded-full border border-line bg-card p-1 text-base font-semibold" role="group">
          {(["hi", "pa"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLang(l)}
              aria-pressed={lang === l}
              className={`rounded-full px-3 py-1.5 ${lang === l ? "bg-leaf text-white" : "text-muted"}`}
            >
              {l === "hi" ? "हिंदी" : "ਪੰਜਾਬੀ"}
            </button>
          ))}
        </div>
      </header>

      {listedId ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-leaf p-5 text-white">
          <p className="text-2xl font-extrabold">{ui("listed", lang)}</p>
          <ListingCard fields={fields} lang={lang} />
          <button type="button" onClick={startOver} className="rounded-2xl bg-white/15 py-3 text-lg font-semibold">
            ＋ {ui("newListing", lang)}
          </button>
        </section>
      ) : (
        <>
          <ListingCard
            fields={fields}
            lang={lang}
            disabled={mic !== "idle"}
            onTapEmpty={Object.keys(fields).length > 0 || tapToFill ? askForField : undefined}
          />
          {tapToFill && <p className="text-center font-semibold text-turmeric">{ui("tapField", lang)}</p>}

          {reply && (
            <p className="rounded-2xl bg-turmeric-soft px-4 py-3 text-lg leading-snug" aria-live="polite">
              {reply}
            </p>
          )}

          {complete ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => sendTurn({ confirm: true })}
                disabled={mic !== "idle"}
                className="rounded-2xl bg-leaf py-4 text-xl font-extrabold text-white disabled:opacity-60"
              >
                ✅ {ui("confirm", lang)}
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={mic === "thinking" || mic === "speaking"}
                className="rounded-2xl border-2 border-line bg-card py-4 text-xl font-semibold disabled:opacity-60"
              >
                🔁 {ui("retry", lang)}
              </button>
            </div>
          ) : (
            <MicButton state={mic} onPress={toggleRecording} label={micLabel} />
          )}

          {micError && <p className="text-center font-semibold text-tomato">{ui("micDenied", lang)}</p>}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowKeyboard((s) => !s)}
              className="self-center rounded-full border border-line bg-card px-4 py-2 text-base text-muted"
            >
              ⌨️ {ui("type", lang)}
            </button>
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
                  className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-lg"
                  style={{ fontSize: 18 }}
                />
                <button type="submit" className="rounded-2xl bg-leaf px-4 text-lg font-semibold text-white">
                  {ui("send", lang)}
                </button>
              </form>
            )}
          </div>
        </>
      )}

      <section className="mt-2 flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">{ui("orders", lang)}</h2>
        {notifications.length === 0 && <p className="text-muted">{ui("noOrders", lang)}</p>}
        {notifications.map((n) => (
          <article
            key={n.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${n.heard ? "border-line bg-card" : "border-leaf bg-leaf-soft"}`}
          >
            <p className="flex-1 text-lg leading-snug">{n.textLocal}</p>
            <button
              type="button"
              onClick={() => listen(n)}
              disabled={mic !== "idle"}
              className="shrink-0 rounded-xl bg-leaf px-3 py-2 text-base font-semibold text-white disabled:opacity-60"
            >
              🔊 {ui("listen", lang)}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
