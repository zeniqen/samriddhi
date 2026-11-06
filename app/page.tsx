import { Mic } from "lucide-react";
import Link from "next/link";
import { BackgroundCubesGrid } from "@/components/ui/background-cubes-grid";
import { SquigglyText } from "@/components/ui/squiggly-text";

export default function Home() {
  return (
    <div className="relative isolate flex w-full flex-1 overflow-hidden">
      {/* Isometric cube field in the Samriddhi palette: ivory tops, soil-tinted sides, sage glow. */}
      <BackgroundCubesGrid
        className="-z-10"
        topColor="#f6f3e9"
        leftColor="#ebe5d5"
        rightColor="#ded5c0"
        glowColor="#8faf8a"
      />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-5 py-14">
        <div>
          <h1 className="font-display text-7xl font-bold leading-none tracking-tight text-forest">
            <SquigglyText>समृद्धि</SquigglyText>
          </h1>
          <p className="mt-2 font-display text-2xl font-medium tracking-tight text-forest">Samriddhi</p>
          <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-soil">
            Farmers sell by speaking Hindi or Punjabi. City buyers see where every rupee of the price goes.
          </p>
        </div>
        <nav className="flex flex-col gap-3" aria-label="Choose who you are">
          <Link
            href="/farmer"
            className="group flex items-center gap-4 rounded-3xl bg-forest p-5 text-surface shadow-[0_18px_40px_-20px_rgb(35_71_53/0.8)] transition-transform active:scale-[0.99]"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface/12 ring-1 ring-surface/25" aria-hidden>
              <Mic className="h-7 w-7" strokeWidth={2.25} />
            </span>
            <span>
              <span className="block font-display text-2xl font-semibold">मैं किसान हूँ</span>
              <span className="block text-lg text-sage-soft">ਮੈਂ ਕਿਸਾਨ ਹਾਂ</span>
            </span>
          </Link>
          <Link
            href="/buyer"
            className="raised flex flex-col gap-0.5 rounded-3xl p-5 transition-colors hover:bg-sage-soft/60"
          >
            <span className="font-display text-xl font-semibold text-forest">I’m buying for a restaurant or shop</span>
            <span className="text-soil">See today’s board and order directly from farmers</span>
          </Link>
          <Link
            href="/partner"
            className="self-center rounded-full px-4 py-2.5 text-base font-medium text-forest underline-offset-4 hover:underline"
          >
            I’m a pickup partner
          </Link>
        </nav>
      </main>
    </div>
  );
}
