import { VILLAGE_NATIVE } from "@/lib/seed-data";
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

/** Village in the farmer's own script: Dakha → दाखा / ਦਾਖਾ. */
function villageInScript(village: string, lang: Lang): string {
  const spellings = VILLAGE_NATIVE[village];
  if (!spellings) return village;
  return lang === "pa" ? spellings[spellings.length - 1] : spellings[0];
}

/** The farmer's sale slip (parchi): each line inks in as it is heard. */
export function ListingCard({
  fields,
  lang,
  onTapEmpty,
  disabled,
  today,
}: {
  fields: ListingFields;
  lang: Lang;
  /** YYYY-MM-DD; passed in because the date is only known in the browser, not at prerender. */
  today?: string;
  onTapEmpty?: (field: keyof ListingFields) => void;
  disabled?: boolean;
}) {
  return (
    <section className="ledger rounded-sm pb-2 pt-3" aria-label={ui("slipTitle", lang)}>
      <header className="flex items-baseline justify-between pb-2 pl-12 pr-4">
        <h2 className="font-ledger text-xl text-bahi">{ui("slipTitle", lang)}</h2>
        {today && <span className="text-sm text-ink-soft">{formatDate(today, lang)}</span>}
      </header>
      <dl>
        {ROWS.map((row) => {
          const filled = fields[row.field] !== undefined;
          const value = filled ? row.value(fields, lang) : "";
          return (
            <div key={row.field} className="grid grid-cols-[5.5rem_1fr] items-baseline border-t border-rule pl-12 pr-4">
              <dt className="py-3 text-base text-ink-soft">{ui(row.label, lang)}</dt>
              <dd className="min-h-14 py-2">
                {filled ? (
                  <span key={value} className="ink-in inline-block text-[1.65rem] font-bold leading-tight text-ink">
                    {value}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={disabled || !onTapEmpty}
                    onClick={() => onTapEmpty?.(row.field)}
                    className="w-full border-b-2 border-dashed border-rule py-1.5 text-left text-lg text-ink-soft/70 enabled:active:bg-sarson/20"
                  >
                    {onTapEmpty ? `🎤 ${ui("speakHint", lang)}` : " "}
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
