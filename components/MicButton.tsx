"use client";

import { LoaderCircle, Mic, Square, Volume2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { NoiseBackground } from "@/components/ui/noise-background";

export type MicState = "idle" | "recording" | "thinking" | "speaking";

const ICON = { idle: Mic, recording: Square, thinking: LoaderCircle, speaking: Volume2 } as const;

// Halo colours from the Samriddhi palette (no gold on the mic). Listening shifts the halo to terracotta.
const HALO_IDLE = ["rgb(143, 175, 138)", "rgb(35, 71, 53)", "rgb(228, 235, 221)"];
const HALO_RECORDING = ["rgb(185, 111, 78)", "rgb(154, 82, 54)", "rgb(228, 235, 221)"];

export function MicButton({ state, onPress, label }: { state: MicState; onPress: () => void; label: string }) {
  const recording = state === "recording";
  const busy = state === "thinking" || state === "speaking";
  const reduceMotion = useReducedMotion();
  const Icon = ICON[state];
  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* The pulse ring sits outside the halo, which clips its own overflow. */}
      <div className={`relative isolate rounded-full ${recording ? "mic-ring" : ""}`}>
        <NoiseBackground
          // Samriddhi is light-only: pin the light base (sage) and light shadow even when the phone is in dark mode.
          containerClassName="w-fit p-2 rounded-full mx-auto backdrop-blur-none bg-sage-soft dark:bg-sage-soft dark:shadow-[0px_0.5px_1px_0px_var(--color-neutral-400)_inset,0px_1px_0px_0px_var(--color-neutral-100)]"
          gradientColors={recording ? HALO_RECORDING : HALO_IDLE}
          animating={!reduceMotion && !busy}
        >
          <button
            type="button"
            onClick={onPress}
            disabled={busy}
            aria-label={label}
            aria-pressed={recording}
            className={`grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full shadow-[0_10px_24px_-8px_rgb(35_71_53/0.6)] transition-[transform,background-color] duration-200 ease-out active:scale-95 ${
              recording ? "bg-terracotta text-surface" : busy ? "bg-surface text-forest" : "bg-forest text-surface"
            }`}
          >
            <Icon
              aria-hidden
              strokeWidth={2.25}
              className={`${recording ? "h-8 w-8 fill-current" : "h-10 w-10"} ${state === "thinking" ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </button>
        </NoiseBackground>
      </div>
      <p className="min-h-6 text-center text-base font-medium text-forest" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
