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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
        <div>
          <h1 className="font-ledger text-6xl leading-none text-forest">
            <SquigglyText>समृद्धि</SquigglyText>
          </h1>
          <p className="mt-2 font-ledger text-2xl text-forest">Samriddhi</p>
          <p className="mt-4 text-lg text-soil">
            Farmers sell by speaking Hindi or Punjabi. City buyers see where
            every rupee of the price goes.
          </p>
        </div>
        <nav
          className="ledger flex flex-col rounded-sm"
          aria-label="Choose who you are"
        >
          <Link
            href="/farmer"
            className="flex items-center gap-4 border-b border-rule py-5 pl-14 pr-5 hover:bg-gold/20"
          >
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-forest bg-forest text-paper"
              aria-hidden
            >
              <Mic className="h-7 w-7" strokeWidth={2.25} />
            </span>
            <span>
              <span className="block text-2xl font-bold text-forest">
                मैं किसान हूँ
              </span>
              <span className="block text-lg text-soil-soft">
                ਮੈਂ ਕਿਸਾਨ ਹਾਂ
              </span>
            </span>
          </Link>
          <Link
            href="/buyer"
            className="flex flex-col py-5 pl-14 pr-5 hover:bg-paper"
          >
            <span className="text-xl font-bold text-forest">
              I’m buying for a restaurant or shop
            </span>
            <span className="text-soil-soft">
              See today’s board and order directly from farmers
            </span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
