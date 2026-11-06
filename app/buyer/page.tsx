"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PriceSplit } from "@/components/PriceSplit";
import { orderTotals } from "@/lib/pricing";
import type { Buyer, Listing, PriceSplit as Split } from "@/lib/types";

type Row = Listing & { split: Split; farmerName: string };

const CROP_EMOJI = { tomato: "🍅", onion: "🧅", potato: "🥔" } as const;
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function BuyerPage() {
  const [listings, setListings] = useState<Row[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerId, setBuyerId] = useState("b1");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kg, setKg] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/listings");
      const data = await res.json();
      setListings(data.listings ?? []);
      setBuyers(data.buyers ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const selected = useMemo(() => listings.find((l) => l.id === selectedId) ?? null, [listings, selectedId]);
  const qty = Number(kg);
  const totals = selected && qty > 0 ? orderTotals(selected.split, qty) : null;

  const open = (l: Row) => {
    setSelectedId(l.id);
    setKg(String(l.remainingKg));
    setStatus(null);
  };

  const placeOrder = async () => {
    if (!selected) return;
    setPlacing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selected.id, buyerId, quantityKg: qty }),
      });
      const data = await res.json();
      if (!res.ok) setStatus({ kind: "error", text: data.error ?? "Order failed" });
      else {
        setStatus({ kind: "ok", text: `Order placed: ${qty} kg from ${selected.farmerName}. The farmer has been notified.` });
        await load();
      }
    } catch {
      setStatus({ kind: "error", text: "Network error, try again" });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Kisan Awaaz · Buyer</p>
          <h1 className="text-3xl font-extrabold">Fresh from Ludhiana farms</h1>
          <p className="text-muted">Direct from farmers. Every rupee shown.</p>
        </div>
        <label className="flex flex-col text-sm font-semibold">
          Ordering as
          <select
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className="mt-1 rounded-xl border border-line bg-card px-3 py-2 text-base font-normal"
          >
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.type})
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Listings" className="grid content-start gap-3 sm:grid-cols-2">
          {listings.length === 0 && <p className="text-muted">No produce listed right now.</p>}
          {listings.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => open(l)}
              className={`flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left transition-shadow hover:shadow-md ${
                selectedId === l.id ? "border-leaf ring-2 ring-leaf" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold capitalize">
                  {CROP_EMOJI[l.crop]} {l.crop}
                </span>
                <span className="text-lg font-extrabold tabular-nums">{inr(l.split.buyerPerKg)}/kg</span>
              </div>
              <p className="text-sm text-muted">
                {l.farmerName} · {l.village}
              </p>
              <div className="flex gap-2 text-sm">
                <span className="rounded-full bg-leaf-soft px-2 py-0.5 font-semibold">{l.remainingKg} kg left</span>
                <span className="rounded-full bg-turmeric-soft px-2 py-0.5">Pickup {fmtDate(l.pickupDate)}</span>
                {l.status === "verified" && <span className="rounded-full bg-leaf px-2 py-0.5 text-white">✓ Verified</span>}
              </div>
            </button>
          ))}
        </section>

        <aside className="rounded-3xl border border-line bg-card p-5 lg:sticky lg:top-6 lg:self-start">
          {!selected ? (
            <p className="text-muted">Select a listing to see where your money goes and place an order.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold">
                  {CROP_EMOJI[selected.crop]} {selected.crop[0].toUpperCase() + selected.crop.slice(1)} from {selected.village}
                </h2>
                <p className="text-sm text-muted">
                  {selected.farmerName} · {selected.remainingKg} kg left · pickup {fmtDate(selected.pickupDate)}
                </p>
              </div>
              <PriceSplit split={selected.split} />
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  placeOrder();
                }}
              >
                <label className="flex flex-col text-sm font-semibold">
                  Quantity (kg)
                  <input
                    type="number"
                    min={1}
                    max={selected.remainingKg}
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                    className="mt-1 rounded-xl border border-line px-3 py-2 text-base"
                  />
                </label>
                {totals && (
                  <dl className="grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted">You pay</dt>
                    <dd className="text-right font-extrabold tabular-nums">{inr(totals.buyerTotal)}</dd>
                    <dt className="text-muted">Farmer receives</dt>
                    <dd className="text-right font-semibold text-leaf tabular-nums">{inr(totals.farmerTotal)}</dd>
                  </dl>
                )}
                <button
                  type="submit"
                  disabled={placing || !(qty > 0)}
                  className="rounded-2xl bg-leaf py-3 text-lg font-extrabold text-white disabled:opacity-50"
                >
                  {placing ? "Placing…" : "Place order"}
                </button>
                {status && (
                  <p
                    role="status"
                    className={`rounded-xl px-3 py-2 text-sm ${status.kind === "ok" ? "bg-leaf-soft text-leaf" : "bg-tomato-soft text-tomato"}`}
                  >
                    {status.text}
                  </p>
                )}
              </form>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
