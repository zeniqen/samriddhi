"use client";

import {
  ArrowRight,
  Clock,
  MapPin,
  Navigation,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DayRun, PickupStop } from "@/lib/pickup";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
const fmtTime = (min: number) => {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
};
const distance = (s: PickupStop) =>
  s.km === null
    ? "Distance not known"
    : s.km === 0
      ? "Same farm"
      : `${s.km} km drive`;
const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PartnerPage() {
  const [runs, setRuns] = useState<DayRun[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/partner");
      const data = await res.json();
      setRuns(data.runs ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const reject = async (orderId: string) => {
    setRejecting(true);
    try {
      await fetch("/api/partner/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      await load();
    } catch {}
    setRejecting(false);
    setConfirming(null);
  };

  const totalEarnings = runs?.reduce((sum, d) => sum + d.earnings, 0) ?? 0;
  const totalKg = runs?.reduce((sum, d) => sum + d.totalKg, 0) ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-3xl font-bold leading-none tracking-tight text-forest">
            Samriddhi
          </p>
          <h1 className="mt-2 text-lg text-soil">
            Pickup runs for your truck, village by village
          </h1>
        </div>
        {runs && runs.length > 0 && (
          <div className="raised flex items-center gap-4 rounded-2xl px-5 py-3">
            <Truck
              aria-hidden
              className="h-6 w-6 text-forest"
              strokeWidth={2}
            />
            <p className="text-soil">
              <span className="figure block text-2xl font-semibold leading-tight text-forest">
                {inr(totalEarnings)}
              </span>
              <span className="text-sm">
                for {totalKg.toLocaleString("en-IN")} kg collected
              </span>
            </p>
          </div>
        )}
      </header>

      {runs === null && <p className="text-soil-soft">Loading pickups…</p>}
      {runs?.length === 0 && (
        <p className="raised rounded-3xl p-6 text-soil">
          No pickups yet. When a buyer orders from a farmer, the pickup appears
          here with the village, kg and what you earn.
        </p>
      )}

      {runs?.map((day) => (
        <section
          key={day.date}
          aria-labelledby={`d-${day.date}`}
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id={`d-${day.date}`}
              className="font-display text-xl font-semibold text-forest"
            >
              {fmtDate(day.date)}
            </h2>
            <p className="text-sm text-soil-soft">
              {day.totalKg.toLocaleString("en-IN")} kg, {day.totalKm} km, you
              earn {inr(day.earnings)}
            </p>
          </div>

          {day.villages.map((v) => {
            const active = v.stops.filter((s) => !s.rejected).length;
            return (
              <article
                key={v.village}
                className="raised overflow-hidden rounded-3xl"
              >
                <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-sage-soft text-forest">
                      <MapPin
                        aria-hidden
                        className="h-5 w-5"
                        strokeWidth={2.25}
                      />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-forest">
                        {v.village}
                      </h3>
                      <p className="text-sm text-soil-soft">
                        {active === 0
                          ? "Passed to the next partner"
                          : `${active} ${active === 1 ? "pickup" : "pickups"}, ${v.totalKg} kg`}
                      </p>
                    </div>
                  </div>
                  {active > 0 && (
                    <p className="text-right">
                      <span className="block text-sm text-soil-soft">
                        You earn
                      </span>
                      <span className="figure text-2xl font-semibold text-forest">
                        {inr(v.earnings)}
                      </span>
                    </p>
                  )}
                </div>
                <ul className="divide-y divide-line border-t border-line">
                  {v.stops.map((s) => (
                    <li
                      key={s.orderId}
                      className={`flex flex-col gap-2 px-5 py-3.5 ${s.rejected ? "bg-line/30" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span
                          className={`flex min-w-0 items-center gap-2 ${s.rejected ? "text-soil-soft line-through" : "text-forest"}`}
                        >
                          <span className="font-semibold">{s.farmerName}</span>
                          <ArrowRight
                            aria-label="to"
                            className="h-4 w-4 shrink-0 text-soil-soft"
                            strokeWidth={2}
                          />
                          <span
                            className={`truncate ${s.rejected ? "" : "text-soil"}`}
                          >
                            {s.buyerName}
                          </span>
                        </span>
                        <span
                          className={`figure shrink-0 text-lg ${s.rejected ? "text-soil-soft line-through" : "text-forest"}`}
                        >
                          {s.kg} kg
                        </span>
                      </div>

                      {s.rejected ? (
                        <p className="flex items-center gap-1.5 text-sm font-medium text-soil">
                          <Undo2
                            aria-hidden
                            className="h-4 w-4"
                            strokeWidth={2.25}
                          />
                          You passed on this pickup. It has gone to the next
                          partner.
                        </p>
                      ) : confirming === s.orderId ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-terracotta/10 px-3 py-2.5">
                          <p className="text-sm font-medium text-terracotta-text">
                            Reject this pickup? It will go to the next partner.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              disabled={rejecting}
                              className="min-h-10 rounded-full border border-forest/25 bg-surface px-4 text-sm font-semibold text-forest disabled:opacity-60"
                            >
                              Keep it
                            </button>
                            <button
                              type="button"
                              onClick={() => reject(s.orderId)}
                              disabled={rejecting}
                              className="min-h-10 rounded-full bg-terracotta-text px-4 text-sm font-semibold text-surface disabled:opacity-60"
                            >
                              Yes, reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {s.etaMin !== null && (
                              <span className="flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1 font-semibold text-forest">
                                <Clock
                                  aria-hidden
                                  className="h-4 w-4"
                                  strokeWidth={2.25}
                                />
                                {fmtTime(s.etaMin)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 rounded-full bg-line/40 px-3 py-1 text-soil">
                              <Navigation
                                aria-hidden
                                className="h-3.5 w-3.5"
                                strokeWidth={2.25}
                              />
                              {distance(s)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirming(s.orderId)}
                            aria-label={`Reject pickup from ${s.farmerName}`}
                            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-terracotta-text transition-colors hover:bg-terracotta/10"
                          >
                            <X
                              aria-hidden
                              className="h-4 w-4"
                              strokeWidth={2.5}
                            />
                            Reject
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      ))}

      <p className="text-xs text-soil-soft">
        Partner fee ₹4 per kg, fixed on each order when it is placed. The truck
        leaves Ludhiana at 7:00 am; times and distances are estimates from
        village locations (about 30 km/h, 15 minutes loading per farm). Figures
        are illustrative.
      </p>
    </main>
  );
}
