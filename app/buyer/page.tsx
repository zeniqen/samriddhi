"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PriceSplit, rupees } from "@/components/PriceSplit";
import { orderTotals } from "@/lib/pricing";
import type { Buyer, Listing, PriceSplit as Split } from "@/lib/types";

type Row = Listing & { split: Split; farmerName: string };

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const title = (s: string) => s[0].toUpperCase() + s.slice(1);

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
      if (!res.ok) setStatus({ kind: "error", text: `${data.error ?? "Order not placed"}. Change the quantity and try again.` });
      else {
        setStatus({ kind: "ok", text: `Order placed: ${qty} kg from ${selected.farmerName}. They will hear it on their phone.` });
        await load();
      }
    } catch {
      setStatus({ kind: "error", text: "No connection. Check your internet and place the order again." });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-bahi pb-5">
        <div>
          <p className="font-ledger text-4xl leading-none text-bahi">Samriddhi</p>
          <h1 className="mt-2 text-xl font-semibold text-ink">Tomatoes from Ludhiana farms, priced in the open</h1>
        </div>
        <label className="flex flex-col text-sm text-ink-soft">
          Ordering for
          <select
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className="mt-1 border-2 border-ink bg-paper px-3 py-2 text-base text-ink"
          >
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="board-title">
          <h2 id="board-title" className="mb-3 font-ledger text-2xl text-bahi">
            Today’s board
          </h2>
          {listings.length === 0 ? (
            <p className="text-ink-soft">No produce listed right now. New listings appear here as farmers speak them.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-ink text-left text-sm text-ink-soft">
                  <th className="py-2 font-normal">Farmer</th>
                  <th className="hidden py-2 font-normal sm:table-cell">Crop</th>
                  <th className="py-2 text-right font-normal">Kg left</th>
                  <th className="hidden py-2 text-right font-normal sm:table-cell">Pickup</th>
                  <th className="py-2 text-right font-normal">₹ per kg</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const isSelected = selectedId === l.id;
                  return (
                    <tr
                      key={l.id}
                      className={`border-b border-rule ${isSelected ? "bg-paper shadow-[inset_4px_0_0_var(--bahi)]" : "hover:bg-paper/60"}`}
                    >
                      <td className="py-3 pl-3">
                        <button
                          type="button"
                          onClick={() => open(l)}
                          aria-pressed={isSelected}
                          className="text-left"
                        >
                          <span className="block font-semibold text-ink">{l.farmerName}</span>
                          <span className="block text-sm text-ink-soft">
                            {l.village}
                            <span className="sm:hidden">, pickup {fmtDate(l.pickupDate)}</span>
                          </span>
                        </button>
                      </td>
                      <td className="hidden py-3 sm:table-cell">{title(l.crop)}</td>
                      <td className="py-3 text-right tabular-nums">{l.remainingKg}</td>
                      <td className="hidden py-3 text-right sm:table-cell">{fmtDate(l.pickupDate)}</td>
                      <td className="py-3 pr-3 text-right font-ledger text-xl tabular-nums">{l.split.buyerPerKg.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside className="ledger self-start rounded-sm py-5 pl-14 pr-5 lg:sticky lg:top-6" aria-live="polite">
          {!selected ? (
            <div className="flex flex-col gap-2">
              <h2 className="font-ledger text-2xl text-bahi">Where the money goes</h2>
              <p className="text-ink-soft">Choose a farmer on the board to see each rupee of the price, then place your order.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-ledger text-2xl text-bahi">{selected.farmerName}</h2>
                <p className="text-ink-soft">
                  {title(selected.crop)} from {selected.village}, {selected.remainingKg} kg left, pickup{" "}
                  {fmtDate(selected.pickupDate)}
                </p>
              </div>
              <PriceSplit split={selected.split} />
              <form
                className="flex flex-col gap-3 border-t-2 border-ink pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  placeOrder();
                }}
              >
                <label className="flex items-center justify-between gap-3 font-semibold">
                  Quantity in kg
                  <input
                    type="number"
                    min={1}
                    max={selected.remainingKg}
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                    className="w-28 border-2 border-ink bg-page px-3 py-2 text-right text-lg tabular-nums"
                  />
                </label>
                {totals && (
                  <dl className="grid grid-cols-[1fr_auto] gap-y-1">
                    <dt className="text-ink-soft">You pay</dt>
                    <dd className="text-right text-lg font-bold tabular-nums">{inr(totals.buyerTotal)}</dd>
                    <dt className="text-ink-soft">{selected.farmerName} receives</dt>
                    <dd className="text-right text-lg font-bold text-field tabular-nums">{inr(totals.farmerTotal)}</dd>
                  </dl>
                )}
                <button
                  type="submit"
                  disabled={placing || !(qty > 0)}
                  className="bg-ink py-3 text-lg font-bold text-paper disabled:opacity-50"
                >
                  {placing ? "Placing order…" : `Place order${qty > 0 ? ` for ${qty} kg` : ""}`}
                </button>
                {status && (
                  <p
                    role="status"
                    className={`border-l-4 px-3 py-2 ${status.kind === "ok" ? "border-field bg-field-soft text-field" : "border-bahi bg-paper text-bahi"}`}
                  >
                    {status.text}
                  </p>
                )}
                <p className="text-xs text-ink-soft">All figures are illustrative assumptions. Per kg: {rupees(selected.split.buyerPerKg)}.</p>
              </form>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
