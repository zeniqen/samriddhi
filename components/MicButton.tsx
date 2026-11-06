"use client";

export type MicState = "idle" | "recording" | "thinking" | "speaking";

export function MicButton({ state, onPress, label }: { state: MicState; onPress: () => void; label: string }) {
  const recording = state === "recording";
  const busy = state === "thinking" || state === "speaking";
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onPress}
        disabled={busy}
        aria-label={label}
        aria-pressed={recording}
        className={`relative isolate grid h-28 w-28 place-items-center rounded-full text-5xl text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60 ${
          recording ? "mic-ring bg-tomato" : "bg-leaf"
        }`}
      >
        <span aria-hidden>{state === "thinking" ? "⏳" : state === "speaking" ? "🔊" : recording ? "⏹" : "🎤"}</span>
      </button>
      <p className="min-h-6 text-center text-base font-semibold text-muted" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
