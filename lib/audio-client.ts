"use client";
// Browser-only audio helpers: record the farmer, play replies.
import type { Lang } from "./types";

const MAX_RECORD_MS = 25_000; // Sarvam's sync API accepts < 30 s

/** Starts recording; returns a function that stops and resolves to the audio Blob. */
export async function startRecording(onAutoStop?: () => void): Promise<() => Promise<Blob>> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
  });
  rec.start();
  const timer = setTimeout(() => {
    if (rec.state === "recording") {
      rec.stop();
      onAutoStop?.();
    }
  }, MAX_RECORD_MS);
  return () => {
    clearTimeout(timer);
    if (rec.state === "recording") rec.stop();
    return stopped;
  };
}

let current: HTMLAudioElement | null = null;

function speakWithBrowser(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "pa" ? "pa-IN" : "hi-IN";
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

/** Sarvam voice via /api/speak; falls back to the browser voice. Resolves when playback ends. */
export async function playReply(text: string, lang: Lang): Promise<void> {
  current?.pause();
  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error(`speak ${res.status}`);
    const { audioBase64 } = await res.json();
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    current = audio;
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.onpause = () => resolve(); // stopReply() ends playback early
    });
  } catch {
    await speakWithBrowser(text, lang);
  }
}

/** Stop whatever is being spoken, so a tap on confirm doesn't have to wait for the read-back. */
export function stopReply(): void {
  current?.pause();
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
}
