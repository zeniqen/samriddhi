import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Kisan Awaaz</p>
        <h1 className="text-3xl font-extrabold leading-tight">Speak to sell. Order direct.</h1>
        <p className="mt-2 text-muted">
          Farmers list produce by voice in Hindi or Punjabi. City buyers see every rupee of the price.
        </p>
      </div>
      <Link href="/farmer" className="flex items-center gap-4 rounded-3xl bg-leaf p-5 text-white">
        <span className="text-4xl" aria-hidden>🎤</span>
        <span>
          <span className="block text-2xl font-extrabold">किसान / ਕਿਸਾਨ</span>
          <span className="text-white/80">Farmer · phone</span>
        </span>
      </Link>
      <Link href="/buyer" className="flex items-center gap-4 rounded-3xl border border-line bg-card p-5">
        <span className="text-4xl" aria-hidden>🛒</span>
        <span>
          <span className="block text-2xl font-extrabold">Buyer</span>
          <span className="text-muted">Restaurant or kirana · laptop</span>
        </span>
      </Link>
    </main>
  );
}
