"use client";

import { LoaderCircle, Mic, Square, Volume2 } from "lucide-react";

export type MicState = "idle" | "recording" | "thinking" | "speaking";

const ICON = { idle: Mic, recording: Square, thinking: LoaderCircle, speaking: Volume2 } as const;

export function MicButton({ state, onPress, label }: { state: MicState; onPress: () => void; label: string }) {
  const recording = state === "recording";
  const busy = state === "thinking" || state === "speaking";
  const Icon = ICON[state];
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onPress}
        disabled={busy}
        aria-label={label}
        aria-pressed={recording}
        className={`relative isolate grid h-24 w-24 place-items-center rounded-full border-4 border-ink shadow-[0_8px_18px_-6px_rgb(28_43_107/0.6)] transition-[transform,box-shadow] duration-150 ease-out active:translate-y-0.5 active:shadow-[0_3px_8px_-4px_rgb(28_43_107/0.6)] ${
          recording ? "mic-ring bg-bahi text-paper" : busy ? "bg-paper text-ink" : "bg-sarson text-ink"
        }`}
      >
        <Icon
          aria-hidden
          strokeWidth={2.25}
          className={`${state === "recording" ? "h-9 w-9 fill-current" : "h-11 w-11"} ${state === "thinking" ? "animate-spin motion-reduce:animate-none" : ""}`}
        />
      </button>
      <p className="min-h-6 text-center text-base font-semibold text-ink" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
