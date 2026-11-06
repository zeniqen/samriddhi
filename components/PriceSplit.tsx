import type { PriceSplit as Split } from "@/lib/types";

const LINES: { key: keyof Split; label: string; note: string; swatch: string }[] = [
  { key: "farmerPerKg", label: "Farmer", note: "the price they asked for", swatch: "bg-forest" },
  { key: "partnerPerKg", label: "Pickup partner", note: "local aggregator: loading and transport", swatch: "bg-sage" },
  { key: "bufferPerKg", label: "Spoilage buffer", note: "covers losses on the road", swatch: "bg-gold" },
  { key: "platformPerKg", label: "Samriddhi fee", note: "6%", swatch: "bg-terracotta" },
];

export const rupees = (n: number) => `₹${n.toFixed(2)}`;

/** Where each rupee per kg goes: a proportional bar, then the lines that make it up. */
export function PriceSplit({ split }: { split: Split }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {LINES.map((l) => (
          <div key={l.key} className={l.swatch} style={{ flexGrow: split[l.key] }} />
        ))}
      </div>
      <table className="w-full">
        <caption className="sr-only">Price per kg, by who receives it</caption>
        <tbody>
          {LINES.map((line) => (
            <tr key={line.key}>
              <th scope="row" className="py-2 text-left font-normal">
                <span className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${line.swatch}`} aria-hidden />
                  <span>
                    <span className="block font-semibold text-forest">{line.label}</span>
                    <span className="block text-sm text-soil-soft">{line.note}</span>
                  </span>
                </span>
              </th>
              <td
                className={`figure py-2 text-right align-top text-lg ${line.key === "farmerPerKg" ? "font-semibold text-forest" : "text-soil"}`}
              >
                {rupees(split[line.key])}
              </td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="pt-3 text-left font-display text-lg font-semibold text-forest">
              You pay per kg
            </th>
            <td className="figure pt-3 text-right text-3xl font-semibold text-forest">{rupees(split.buyerPerKg)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
