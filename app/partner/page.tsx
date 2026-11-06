"use client";

import { ArrowRight, MapPin, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import type { DayRun } from "@/lib/pickup";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PartnerPage() {
  const [runs, setRuns] = useState<DayRun[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/partner");
        const data = await res.json();
        if (alive) setRuns(data.runs ?? []);
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const totalEarnings = runs?.reduce((sum, d) => sum + d.earnings, 0) ?? 0;
  const totalKg = runs?.reduce((sum, d) => sum + d.totalKg, 0) ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-3xl font-bold leading-none tracking-tight text-forest">Samriddhi</p>
          <h1 className="mt-2 text-lg text-soil">Pickup runs for your truck, village by village</h1>
        </div>
        {runs && runs.length > 0 && (
          <div className="raised flex items-center gap-4 rounded-2xl px-5 py-3">
            <Truck aria-hidden className="h-6 w-6 text-forest" strokeWidth={2} />
            <p className="text-soil">
              <span className="figure block text-2xl font-semibold leading-tight text-forest">{inr(totalEarnings)}</span>
              <span className="text-sm">for {totalKg.toLocaleString("en-IN")} kg collected</span>
            </p>
          </div>
        )}
      </header>

      {runs === null && <p className="text-soil-soft">Loading pickups…</p>}
      {runs?.length === 0 && (
        <p className="raised rounded-3xl p-6 text-soil">
          No pickups yet. When a buyer orders from a farmer, the pickup appears here with the village, kg and what you earn.
        </p>
      )}

      {runs?.map((day) => (
        <section key={day.date} aria-labelledby={`d-${day.date}`} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id={`d-${day.date}`} className="font-display text-xl font-semibold text-forest">
              {fmtDate(day.date)}
            </h2>
            <p className="text-sm text-soil-soft">
              {day.totalKg.toLocaleString("en-IN")} kg, you earn {inr(day.earnings)}
            </p>
          </div>

          {day.villages.map((v) => (
            <article key={v.village} className="raised overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-sage-soft text-forest">
                    <MapPin aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-forest">{v.village}</h3>
                    <p className="text-sm text-soil-soft">
                      {v.stops.length} {v.stops.length === 1 ? "pickup" : "pickups"}, {v.totalKg} kg
                    </p>
                  </div>
                </div>
                <p className="text-right">
                  <span className="block text-sm text-soil-soft">You earn</span>
                  <span className="figure text-2xl font-semibold text-forest">{inr(v.earnings)}</span>
                </p>
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {v.stops.map((s) => (
                  <li key={s.orderId} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-forest">
                      <span className="font-semibold">{s.farmerName}</span>
                      <ArrowRight aria-label="to" className="h-4 w-4 shrink-0 text-soil-soft" strokeWidth={2} />
                      <span className="truncate text-soil">{s.buyerName}</span>
                    </span>
                    <span className="figure shrink-0 text-lg text-forest">{s.kg} kg</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ))}

      <p className="text-xs text-soil-soft">Partner fee ₹4 per kg, fixed on each order when it is placed. Figures are illustrative.</p>
    </main>
  );
}
