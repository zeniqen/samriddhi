"use client";

import { LoaderCircle, Mic, Square, Volume2 } from "lucide-react";

export type MicState = "idle" | "recording" | "thinking" | "speaking";

const ICON = { idle: Mic, recording: Square, thinking: LoaderCircle, speaking: Volume2 } as const;

export function MicButton({ state, onPress, label }: { state: MicState; onPress: () => void; label: string }) {
  const recording = state === "recording";
  const busy = state === "thinking" || state === "speaking";
  const Icon = ICON[state];
  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={onPress}
        disabled={busy}
        aria-label={label}
        aria-pressed={recording}
        className={`relative isolate grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full shadow-[0_10px_24px_-8px_rgb(35_71_53/0.6)] ring-4 transition-[transform,box-shadow,background-color] duration-200 ease-out active:scale-95 ${
          recording
            ? "mic-ring bg-terracotta text-surface ring-terracotta/25"
            : busy
              ? "bg-surface text-forest ring-line"
              : "bg-forest text-surface ring-sage/45"
        }`}
      >
        <Icon
          aria-hidden
          strokeWidth={2.25}
          className={`${recording ? "h-8 w-8 fill-current" : "h-10 w-10"} ${state === "thinking" ? "animate-spin motion-reduce:animate-none" : ""}`}
        />
      </button>
      <p className="min-h-6 text-center text-base font-medium text-forest" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
