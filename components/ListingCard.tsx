import { cropName, formatDate } from "@/lib/templates";
import { ui, type UiKey } from "@/lib/ui-copy";
import type { Crop, Lang, ListingFields } from "@/lib/types";

const CROP_EMOJI: Record<Crop, string> = { tomato: "🍅", onion: "🧅", potato: "🥔" };

type Row = { field: keyof ListingFields; label: UiKey; icon: string; value: (f: ListingFields, lang: Lang) => string };

const ROWS: Row[] = [
  { field: "crop", label: "crop", icon: "🌱", value: (f, l) => cropName(f.crop!, l) },
  { field: "quantityKg", label: "quantity", icon: "⚖️", value: (f, l) => `${f.quantityKg} ${ui("kg", l)}` },
  { field: "askPricePerKg", label: "price", icon: "₹", value: (f, l) => `₹${f.askPricePerKg}${ui("perKg", l)}` },
  { field: "village", label: "village", icon: "📍", value: (f) => f.village! },
  { field: "pickupDate", label: "pickup", icon: "🚚", value: (f, l) => formatDate(f.pickupDate!, l) },
];

export function ListingCard({
  fields,
  lang,
  onTapEmpty,
  disabled,
}: {
  fields: ListingFields;
  lang: Lang;
  onTapEmpty?: (field: keyof ListingFields) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-[0_1px_0_var(--line)]">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-tomato-soft text-3xl" aria-hidden>
          {fields.crop ? CROP_EMOJI[fields.crop] : "🧺"}
        </div>
        <div className="text-2xl font-extrabold leading-tight">
          {fields.crop ? cropName(fields.crop, lang) : "—"}
          {fields.quantityKg !== undefined && (
            <span className="ml-2 font-semibold text-muted">
              {fields.quantityKg} {ui("kg", lang)}
            </span>
          )}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {ROWS.slice(1).map((row) => {
          const filled = fields[row.field] !== undefined;
          return (
            <li key={row.field}>
              <button
                type="button"
                disabled={filled || disabled || !onTapEmpty}
                onClick={() => onTapEmpty?.(row.field)}
                className={`flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left transition-colors ${
                  filled ? "bg-leaf-soft" : "border-2 border-dashed border-line bg-bg active:bg-turmeric-soft"
                }`}
              >
                <span className="w-6 text-center text-lg" aria-hidden>
                  {row.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-xs text-muted">{ui(row.label, lang)}</span>
                  <span className={`text-lg font-semibold ${filled ? "text-ink" : "text-muted"}`}>
                    {filled ? row.value(fields, lang) : "❔"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
