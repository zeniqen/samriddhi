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

/** The farmer's sale slip (parchi): each line inks in as it is heard; the page closes on the total.
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
  const total =
    fields.quantityKg !== undefined && fields.askPricePerKg !== undefined
      ? fields.quantityKg * fields.askPricePerKg
      : undefined;

  return (
    <section className="ledger rounded-sm pb-2 pt-3" aria-label={ui("slipTitle", lang)}>
      <h2 className="pb-2 pl-12 pr-4 font-ledger text-xl text-forest">{ui("slipTitle", lang)}</h2>
      <dl>
        {ROWS.map((row) => {
          const filled = fields[row.field] !== undefined;
          const value = filled ? row.value(fields, lang) : "";
          return (
            <div key={row.field} className="grid grid-cols-[5.5rem_1fr] items-center border-t border-rule pl-12 pr-4">
              <dt className="py-3 text-base text-soil-soft">{ui(row.label, lang)}</dt>
              <dd className="py-1.5">
                {filled && onTapField ? (
                  // A filled line can be tapped to say just that line again.
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onTapField(row.field)}
                    aria-label={`${ui(row.label, lang)}: ${value}. ${ui("retry", lang)}`}
                    className="flex min-h-11 w-full items-center justify-between gap-2 text-left enabled:active:bg-gold/25"
                  >
                    <span key={value} className="ink-in inline-block text-[1.65rem] font-bold leading-tight text-forest">
                      {value}
                    </span>
                    <Mic aria-hidden className="h-5 w-5 shrink-0 text-soil-soft" strokeWidth={2} />
                  </button>
                ) : filled ? (
                  <span key={value} className="ink-in inline-block text-[1.65rem] font-bold leading-tight text-forest">
                    {value}
                  </span>
                ) : onTapField ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onTapField(row.field)}
                    aria-label={`${ui(row.label, lang)}: ${ui("speakHint", lang)}`}
                    className="flex min-h-11 w-full items-center gap-2 border-b-2 border-dashed border-soil-soft/60 text-left text-lg text-soil-soft enabled:active:bg-gold/25"
                  >
                    <Mic aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                    {ui("speakHint", lang)}
                  </button>
                ) : (
                  <span aria-hidden className="block h-9 border-b-2 border-dashed border-soil-soft/60" />
                )}
              </dd>
            </div>
          );
        })}
        {total !== undefined && (
          <div className="grid grid-cols-[5.5rem_1fr] items-baseline border-t-2 border-forest pl-12 pr-4 pt-2">
            <dt className="py-2 font-ledger text-xl text-forest">{ui("total", lang)}</dt>
            <dd className="py-1">
              <span
                key={total}
                className="ink-in double-rule inline-block pb-0.5 text-[1.9rem] font-bold leading-tight text-forest tabular-nums"
              >
                {inr(total)}
              </span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
