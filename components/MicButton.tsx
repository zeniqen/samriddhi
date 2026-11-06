"use client";

export type MicState = "idle" | "recording" | "thinking" | "speaking";

export function MicButton({ state, onPress, label }: { state: MicState; onPress: () => void; label: string }) {
  const recording = state === "recording";
  const busy = state === "thinking" || state === "speaking";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onPress}
        disabled={busy}
        aria-label={label}
        aria-pressed={recording}
        className={`relative isolate grid h-24 w-24 place-items-center rounded-full border-4 text-4xl shadow-[0_6px_0_var(--ink)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_var(--ink)] disabled:opacity-70 ${
          recording ? "mic-ring border-ink bg-bahi text-paper" : "border-ink bg-sarson text-ink"
        }`}
      >
        <span aria-hidden>{state === "thinking" ? "⏳" : state === "speaking" ? "🔊" : recording ? "■" : "🎤"}</span>
      </button>
      <p className="min-h-6 text-center text-base font-semibold text-ink" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
