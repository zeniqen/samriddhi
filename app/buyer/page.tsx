"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cropEn } from "@/lib/crops";
import { PriceSplit } from "@/components/PriceSplit";
import type { BuyerOrderRow } from "@/lib/buyer-orders";
import { orderTotals } from "@/lib/pricing";
import type { Buyer, Listing, PriceSplit as Split } from "@/lib/types";

type Row = Listing & { split: Split; farmerName: string };

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function BuyerPage() {
  const [listings, setListings] = useState<Row[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerId, setBuyerId] = useState("b1");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kg, setKg] = useState("");
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [myOrders, setMyOrders] = useState<BuyerOrderRow[]>([]);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/listings");
      const data = await res.json();
      setListings(data.listings ?? []);
      setBuyers(data.buyers ?? []);
    } catch {}
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?buyerId=${buyerId}`);
      const data = await res.json();
      setMyOrders(data.orders ?? []);
    } catch {}
  }, [buyerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadOrders();
    const id = setInterval(() => {
      load();
      loadOrders();
    }, 5000);
    return () => clearInterval(id);
  }, [load, loadOrders]);

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) ?? null,
    [listings, selectedId],
  );
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
        body: JSON.stringify({
          listingId: selected.id,
          buyerId,
          quantityKg: qty,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        setStatus({
          kind: "error",
          text: `${data.error ?? "Order not placed"}. Change the quantity and try again.`,
        });
      else {
        setStatus({
          kind: "ok",
          text: `Order placed: ${qty} kg from ${selected.farmerName}. They will hear it on their phone.`,
        });
        setNewOrderId(data.order?.id ?? null); // highlighted at the top of "Your orders"
        await Promise.all([load(), loadOrders()]);
      }
    } catch {
      setStatus({
        kind: "error",
        text: "No connection. Check your internet and place the order again.",
      });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-3xl font-bold leading-none tracking-tight text-forest">
            Samriddhi
          </p>
          <h1 className="mt-2 text-lg text-soil">
            Fresh produce from Ludhiana farms, priced in the open
          </h1>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-soil-soft">
          Ordering for
          <select
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className="raised min-h-11 rounded-full px-4 text-base font-medium text-forest"
          >
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
        <section
          aria-labelledby="board-title"
          className="raised overflow-hidden rounded-3xl"
        >
          <div className="flex items-baseline justify-between gap-4 px-6 pb-4 pt-6">
            <h2
              id="board-title"
              className="font-display text-xl font-semibold text-forest"
            >
              Today’s board
            </h2>
            <p className="text-sm text-soil-soft">{listings.length} listings</p>
          </div>
          {listings.length === 0 ? (
            <p className="px-6 pb-6 text-soil-soft">
              No produce listed right now. New listings appear here as farmers
              speak them.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-line bg-page/60 text-left text-sm text-soil-soft">
                  <th className="py-2.5 pl-6 font-medium">Farmer</th>
                  <th className="hidden py-2.5 font-medium sm:table-cell">
                    Crop
                  </th>
                  <th className="py-2.5 text-right font-medium">Kg left</th>
                  <th className="hidden py-2.5 text-right font-medium sm:table-cell">
                    Pickup
                  </th>
                  <th className="py-2.5 pr-6 text-right font-medium">
                    ₹ per kg
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {listings.map((l) => {
                  const isSelected = selectedId === l.id;
                  return (
                    <tr
                      key={l.id}
                      // The whole row selects; the name button inside stays as the keyboard/screen-reader control.
                      onClick={() => open(l)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-sage-soft" : "hover:bg-sage-soft/50"}`}
                    >
                      <td className="py-3.5 pl-6">
                        <button
                          type="button"
                          onClick={() => open(l)}
                          aria-pressed={isSelected}
                          className="text-left"
                        >
                          {/* Narrow screens hide the Crop column, so the crop leads the row. */}
                          <span className="block text-sm font-semibold text-terracotta-text sm:hidden">
                            {cropEn(l.crop)}
                          </span>
                          <span className="block font-semibold text-forest">
                            {l.farmerName}
                          </span>
                          <span className="block text-sm text-soil-soft">
                            {l.village}
                            <span className="sm:hidden">
                              , pickup {fmtDate(l.pickupDate)}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="hidden py-3.5 text-soil sm:table-cell">
                        {cropEn(l.crop)}
                      </td>
                      <td className="figure py-3.5 text-right text-soil">
                        {l.remainingKg}
                      </td>
                      <td className="hidden py-3.5 text-right text-soil sm:table-cell">
                        {fmtDate(l.pickupDate)}
                      </td>
                      <td className="figure py-3.5 pr-6 text-right text-xl font-semibold text-forest">
                        {l.split.buyerPerKg.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className="flex flex-col gap-6 self-start">
          <aside className="raised rounded-3xl p-6" aria-live="polite">
            {!selected ? (
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-xl font-semibold text-forest">
                  Where the money goes
                </h2>
                <p className="text-soil">
                  Choose a farmer on the board to see each rupee of the price,
                  then place your order.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-forest">
                    {selected.farmerName}
                  </h2>
                  <p className="mt-1 text-soil">
                    {cropEn(selected.crop)} from {selected.village},{" "}
                    {selected.remainingKg} kg left, pickup{" "}
                    {fmtDate(selected.pickupDate)}
                  </p>
                </div>
                <PriceSplit split={selected.split} />
                <form
                  className="flex flex-col gap-4 rounded-2xl bg-page/70 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    placeOrder();
                  }}
                >
                  <label className="flex items-center justify-between gap-3 font-semibold text-forest">
                    Quantity in kg
                    <input
                      type="number"
                      min={1}
                      max={selected.remainingKg}
                      value={kg}
                      onChange={(e) => setKg(e.target.value)}
                      className="figure min-h-11 w-28 rounded-xl bg-surface px-3 text-right text-lg text-forest shadow-[0_0_0_1px_var(--line)]"
                    />
                  </label>
                  {totals && (
                    <dl className="grid grid-cols-[1fr_auto] gap-y-1.5">
                      <dt className="text-soil">You pay</dt>
                      <dd className="figure text-right text-xl font-semibold text-forest">
                        {inr(totals.buyerTotal)}
                      </dd>
                      <dt className="text-soil">
                        {selected.farmerName} receives
                      </dt>
                      <dd className="figure text-right text-xl font-semibold text-forest">
                        {inr(totals.farmerTotal)}
                      </dd>
                    </dl>
                  )}
                  <button
                    type="submit"
                    disabled={placing || !(qty > 0)}
                    className="min-h-12 rounded-full bg-forest text-lg font-semibold text-surface shadow-[0_10px_24px_-12px_rgb(35_71_53/0.7)] transition-transform active:scale-[0.99] disabled:opacity-50"
                  >
                    {placing
                      ? "Placing order…"
                      : `Place order${qty > 0 ? ` for ${qty} kg` : ""}`}
                  </button>
                  {status && (
                    <p
                      role="status"
                      className={`font-semibold ${status.kind === "ok" ? "text-forest" : "text-terracotta-text"}`}
                    >
                      {status.kind === "ok" ? "✓ " : "✕ "}
                      {status.text}
                    </p>
                  )}
                </form>
                <p className="text-xs text-soil-soft">
                  All figures are illustrative assumptions.
                </p>
              </div>
            )}
          </aside>

          <section
            aria-labelledby="orders-title"
            className="raised overflow-hidden rounded-3xl"
          >
            <div className="flex items-baseline justify-between gap-4 px-6 pb-4 pt-6">
              <h2
                id="orders-title"
                className="font-display text-xl font-semibold text-forest"
              >
                Your orders
              </h2>
              {myOrders.length > 0 && (
                <p className="figure text-sm text-soil-soft">
                  {inr(myOrders.reduce((sum, o) => sum + o.total, 0))} in total
                </p>
              )}
            </div>
            {myOrders.length === 0 ? (
              <p className="px-6 pb-6 text-soil">
                No orders yet. Choose a farmer on the board and place your first
                order.
              </p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {myOrders.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-start justify-between gap-4 px-6 py-3.5 transition-colors duration-700 ${
                      o.id === newOrderId ? "bg-sage-soft" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-forest">
                        {o.kg} kg {o.crop ? cropEn(o.crop).toLowerCase() : "produce"} from {o.farmerName}
                      </p>
                      <p className="text-sm text-soil-soft">
                        {o.village ? `${o.village}, ` : ""}
                        {o.pickupDate
                          ? `pickup ${fmtDate(o.pickupDate)}`
                          : "pickup date unavailable"}
                        {o.id === newOrderId && (
                          <span className="ml-2 font-semibold text-forest">
                            Just placed
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="figure block text-lg font-semibold text-forest">
                        {inr(o.total)}
                      </span>
                      <span className="figure text-sm text-soil-soft">
                        ₹{o.pricePerKg.toFixed(2)}/kg
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
