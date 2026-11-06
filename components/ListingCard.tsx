import { Mic } from "lucide-react";
import { villageInScript } from "@/lib/readback";
import { cropName, formatDate } from "@/lib/templates";
import { ui, type UiKey } from "@/lib/ui-copy";
import type { Lang, ListingFields } from "@/lib/types";

type Row = { field: keyof ListingFields; label: UiKey; value: (f: ListingFields, lang: Lang) => string };

const ROWS: Row[] = [
  { field: "crop", label: "crop", value: (f, l) => cropName(f.crop!, l) },
  { field: "quantityKg", label: "quantity", value: (f, l) => `${f.quantityKg} ${ui("kg", l)}` },
  { field: "askPricePerKg", label: "price", value: (f, l) => `₹${f.askPricePerKg}${ui("perKg", l)}` },
  { field: "village", label: "village", value: (f, l) => villageInScript(f.village!, l) },
  { field: "pickupDate", label: "pickup", value: (f, l) => formatDate(f.pickupDate!, l) },
];

export const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** The farmer's listing as it is heard: five lines, a progress bar, and the total in a forest panel.
 *  With onTapField, any line (empty or filled) can be tapped to say just that line. */
export function ListingCard({
  fields,
  lang,
  onTapField,
  disabled,
}: {
  fields: ListingFields;
  lang: Lang;
  onTapField?: (field: keyof ListingFields) => void;
  disabled?: boolean;
}) {
  const filledCount = ROWS.filter((r) => fields[r.field] !== undefined).length;
  const total =
    fields.quantityKg !== undefined && fields.askPricePerKg !== undefined
      ? fields.quantityKg * fields.askPricePerKg
      : undefined;

  return (
    <section className="raised overflow-hidden rounded-3xl" aria-label={ui("slipTitle", lang)}>
      <header className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
        <h2 className="font-display text-lg font-semibold text-forest">{ui("slipTitle", lang)}</h2>
        {/* Five fields in order: the bar is a real sequence, so it earns its segments. */}
        <div className="flex items-center gap-1" role="img" aria-label={`${filledCount}/5`}>
          {ROWS.map((r) => (
            <span
              key={r.field}
              className={`h-1.5 w-5 rounded-full transition-colors duration-300 ${
                fields[r.field] !== undefined ? "bg-sage" : "bg-line"
              }`}
            />
          ))}
        </div>
      </header>
      <dl className="divide-y divide-line border-t border-line">
        {ROWS.map((row) => {
          const filled = fields[row.field] !== undefined;
          const value = filled ? row.value(fields, lang) : "";
          const content = (
            <>
              <dt className="text-base text-soil-soft">{ui(row.label, lang)}</dt>
              <dd className="flex items-center gap-3">
                {filled ? (
                  <span key={value} className="settle font-display text-2xl font-semibold leading-none text-forest">
                    {value}
                  </span>
                ) : (
                  <span className={`text-base ${onTapField ? "text-soil-soft" : "text-soil-soft/70"}`}>
                    {onTapField ? ui("speakHint", lang) : "—"}
                  </span>
                )}
                {onTapField && <Mic aria-hidden className="h-4 w-4 shrink-0 text-soil-soft" strokeWidth={2.25} />}
              </dd>
            </>
          );
          return onTapField ? (
            <button
              key={row.field}
              type="button"
              disabled={disabled}
              onClick={() => onTapField(row.field)}
              aria-label={`${ui(row.label, lang)}: ${filled ? value : ui("speakHint", lang)}`}
              className="flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left transition-colors enabled:hover:bg-sage-soft/50 enabled:active:bg-sage-soft"
            >
              {content}
            </button>
          ) : (
            <div key={row.field} className="flex min-h-14 items-center justify-between gap-4 px-5">
              {content}
            </div>
          );
        })}
      </dl>
      {total !== undefined && (
        <div className="flex items-end justify-between gap-4 bg-forest px-5 py-4">
          <span className="pb-1 text-base font-medium text-sage-soft">{ui("total", lang)}</span>
          <span key={total} className="settle figure text-4xl font-semibold leading-none text-gold">
            {inr(total)}
          </span>
        </div>
      )}
    </section>
  );
}
