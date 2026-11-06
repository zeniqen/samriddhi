import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-ledger text-6xl leading-none text-bahi">समृद्धि</h1>
        <p className="mt-2 font-ledger text-2xl text-ink">Samriddhi</p>
        <p className="mt-4 text-lg text-ink">
          Farmers sell by speaking Hindi or Punjabi. City buyers see where every rupee of the price goes.
        </p>
      </div>
      <nav className="ledger flex flex-col rounded-sm" aria-label="Choose who you are">
        <Link href="/farmer" className="flex items-center gap-4 border-b border-rule py-5 pl-14 pr-5 hover:bg-sarson/15">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-ink bg-sarson text-2xl" aria-hidden>
            🎤
          </span>
          <span>
            <span className="block text-2xl font-bold text-ink">मैं किसान हूँ</span>
            <span className="block text-lg text-ink-soft">ਮੈਂ ਕਿਸਾਨ ਹਾਂ</span>
          </span>
        </Link>
        <Link href="/buyer" className="flex flex-col py-5 pl-14 pr-5 hover:bg-paper">
          <span className="text-xl font-bold text-ink">I’m buying for a restaurant or shop</span>
          <span className="text-ink-soft">See today’s board and order directly from farmers</span>
        </Link>
      </nav>
    </main>
  );
}
